<?php
// app/Http\Controllers/SalaryController.php

namespace App\Http\Controllers;

use Carbon\Carbon;
use App\Models\Rank;
use App\Models\Leave;
use App\Models\Payment;
use App\Models\Account;
use App\Models\Employee;
use Inertia\Inertia;
use App\Models\Salary;
use App\Models\Holiday;
use App\Models\Attendance;
use Illuminate\Http\Request;
use App\Models\AllowanceSetting;
use App\Models\BonusSetting;
use App\Models\BusinessSetting;
use App\Models\EmployeeAward;
use App\Models\EmployeeSalaryAdvance;
use App\Models\ProvidentFund;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SalaryController extends Controller
{
    public function index(Request $request)
    {
        $query = Salary::with([
            'employee' => function ($query) {
                $query->select('id', 'name', 'employee_id', 'basic_salary');
            }
        ])
            ->when($request->month, function ($q) use ($request) {
                $q->where('month', $request->month);
            })
            ->when($request->year, function ($q) use ($request) {
                $q->where('year', $request->year);
            })
            ->when($request->status, function ($q) use ($request) {
                $q->where('status', $request->status);
            })
            ->when($request->employee_id, function ($q) use ($request) {
                $q->where('employee_id', $request->employee_id);
            });

        $salaries = $query->orderBy('year', 'desc')
            ->orderBy('month', 'desc')
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return Inertia::render('Salary/Index', [
            'salaries' => $salaries,
            'filters' => $request->only(['month', 'year', 'status', 'employee_id']),
            'employees' => Employee::where('is_active', true)
                ->get(['id', 'name', 'employee_id'])
                ->map(function ($emp) {
                    return [
                        'id' => $emp->id,
                        'name' => $emp->name,
                        'employee_id' => $emp->employee_id,
                        'display' => "{$emp->name} ({$emp->employee_id})"
                    ];
                }),
            'accounts' => Account::where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name', 'type', 'current_balance', 'account_number', 'bank_name'])
        ]);
    }

    public function calculateSalary(Request $request)
    {
        $request->validate([
            'month' => 'required|integer|between:1,12',
            'year' => 'required|integer|min:2020',
            'employee_id' => 'nullable|exists:employees,id'
        ]);

        $month = $request->month;
        $year = $request->year;
        $employeeId = $request->employee_id;

        DB::beginTransaction();
        try {
            if ($employeeId) {
                // Calculate for single employee
                $employee = Employee::findOrFail($employeeId);
                $salary = $this->calculateEmployeeSalary($employee, $month, $year);
                $message = "Salary calculated for {$employee->name}";
            } else {
                // Calculate for all active employees
                $employees = Employee::where('is_active', true)->get();
                $count = 0;

                foreach ($employees as $employee) {
                    try {
                        $this->calculateEmployeeSalary($employee, $month, $year);
                        $count++;
                    } catch (\Exception $e) {
                        Log::error("Error calculating salary for employee {$employee->id}: " . $e->getMessage());
                        continue;
                    }
                }

                $message = "Salaries calculated for {$count} employees";
            }

            DB::commit();

            return redirect()->route('salary.index', [
                'month' => $month,
                'year' => $year,
                'employee_id' => $employeeId
            ])->with('success', $message);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Salary calculation failed: ' . $e->getMessage());
            return redirect()->back()->with('error', 'Error calculating salaries: ' . $e->getMessage());
        }
    }

    private function calculateEmployeeSalary(Employee $employee, $month, $year)
    {
        Log::info('Starting salary calculation for employee', [
            'employee_id' => $employee->id,
            'name' => $employee->name,
            'month' => $month,
            'year' => $year
        ]);

        // Get month start and end dates
        $startDate = Carbon::create($year, $month, 1)->startOfMonth();
        $endDate = Carbon::create($year, $month, 1)->endOfMonth();
        $settings = BusinessSetting::current();

        // ✅ Get attendance data for the month
        $attendances = Attendance::where('employee_id', $employee->id)
            ->whereBetween('date', [$startDate, $endDate])
            ->get();

        // ✅ Calculate present, late, and absent days
        $presentDays = $attendances
            ->filter(function ($attendance) {
                $status = $attendance->attendance_status ?? $attendance->status;
                return in_array($status, ['present', 'late']);
            })
            ->count();

        $lateDays = $attendances
            ->filter(function ($attendance) {
                $status = $attendance->attendance_status ?? $attendance->status;
                return $status === 'late';
            })
            ->count();

        $absentDays = $attendances
            ->filter(function ($attendance) {
                $status = $attendance->attendance_status ?? $attendance->status;
                return $status === 'absent';
            })
            ->count();
        // ✅ Calculate total working days (excluding Fridays only)
        $totalWorkingDays = $this->getTotalWorkingDays($month, $year);

        // ✅ Calculate leave days from Leave model
        $leaves = Leave::where('employee_id', $employee->id)
            ->where('status', 'approved')
            ->where(function ($q) use ($startDate, $endDate) {
                $q->whereBetween('start_date', [$startDate, $endDate])
                    ->orWhereBetween('end_date', [$startDate, $endDate])
                    ->orWhere(function ($q2) use ($startDate, $endDate) {
                        $q2->where('start_date', '<=', $startDate)
                            ->where('end_date', '>=', $endDate);
                    });
            })
            ->get();

        $paidLeaveDays = 0;
        $unpaidLeaveDays = 0;

        foreach ($leaves as $leave) {
            $leaveStart = Carbon::parse($leave->start_date);
            $leaveEnd = Carbon::parse($leave->end_date);

            $monthStart = $startDate->copy();
            $monthEnd = $endDate->copy();

            $adjustedStart = $leaveStart->max($monthStart);
            $adjustedEnd = $leaveEnd->min($monthEnd);

            if ($adjustedStart <= $adjustedEnd) {
                $leaveDaysInMonth = 0;
                for ($date = $adjustedStart->copy(); $date->lte($adjustedEnd); $date->addDay()) {
                    if ($date->dayOfWeek != Carbon::FRIDAY) {
                        $leaveDaysInMonth++;
                    }
                }

                if (in_array($leave->type, ['sick', 'casual', 'earned', 'maternity', 'paternity'])) {
                    $paidLeaveDays += $leaveDaysInMonth;
                } else {
                    $unpaidLeaveDays += $leaveDaysInMonth;
                }
            }
        }

        // ✅ Calculate actual absent days
        $totalAccountedDays = $presentDays + $paidLeaveDays;
        $actualAbsentDays = max(0, $totalWorkingDays - $totalAccountedDays);
        $totalAbsentDays = $actualAbsentDays + $unpaidLeaveDays;

        // ✅ Calculate late and overtime hours
        $totalLateHours = $attendances->sum('late_hours');
        $totalOvertimeHours = $attendances->sum('overtime_hours');

        // ✅ Get basic salary from Employee model
        $basicSalary = $employee->basic_salary ?? 0;

        // ✅ GET ALLOWANCES FROM ALLOWANCE SETTINGS MODEL
        $allowances = $this->calculateAllowancesFromSettings($basicSalary);

        $houseRent = $allowances['house_rent'];
        $medicalAllowance = $allowances['medical_allowance'];
        $transportAllowance = $allowances['transport_allowance'];
        $otherAllowance = $allowances['other_allowance'];
        $totalAllowance = $houseRent + $medicalAllowance + $transportAllowance + $otherAllowance;

        Log::info('Allowances calculated', [
            'employee_id' => $employee->id,
            'basic_salary' => $basicSalary,
            'house_rent' => $houseRent,
            'medical_allowance' => $medicalAllowance,
            'transport_allowance' => $transportAllowance,
            'other_allowance' => $otherAllowance,
            'total_allowance' => $totalAllowance
        ]);

        // ✅ Calculate deductions

        $hourlyRate = $settings?->late_fee_amount ?? 0;

        // Late deduction from settings
        $lateDeduction = $totalLateHours * $hourlyRate;

        // Overtime earning from settings
        $overtimeAmount = $totalOvertimeHours * $hourlyRate;

        $advanceDeduction = 0;

        if (!$settings || $settings->salary_advance_adjustment) {
            $advanceDeduction = EmployeeSalaryAdvance::where('employee_id', $employee->id)
                ->whereMonth('date', $month)
                ->whereYear('date', $year)
                ->sum('amount');
        }

        // $lateFeeDeduction = $attendances->sum('late_fee');
        $lateFeeDeduction = 0;
        // ✅ Calculate absent deduction
        $absentDeduction = 0;
        if ($totalAbsentDays > 0 && $totalWorkingDays > 0) {
            $dailySalary = $basicSalary / $totalWorkingDays;
            $absentDeduction = round($totalAbsentDays * $dailySalary, 2);
        }

        // ✅ GET BONUSES FROM BONUS SETTINGS MODEL
        $eidBonus = 0;
        $festivalBonus = 0;
        $performanceBonus = 0;
        $otherBonus = 0;
        $awardBonus = $this->calculateAwardBonus($employee, $month, $year);
        $leaveEncashment = 0;

        // Calculate bonuses from BonusSetting model for this month
        $bonuses = $this->calculateBonusesFromSettings($employee, $month, $year);
        $eidBonus = $bonuses['eid_bonus'];
        $festivalBonus = $bonuses['festival_bonus'];
        $performanceBonus = $this->calculatePerformanceBonus($employee, $presentDays, $totalWorkingDays);
        $otherBonus = $bonuses['other_bonus'] + $awardBonus + $leaveEncashment;

        $totalBonus = $eidBonus + $festivalBonus + $performanceBonus + $otherBonus;

        // ✅ Calculate provident fund
        $providentFund = 0;
        if ($employee->provident_fund_percentage > 0) {
            $providentFund = ($basicSalary * $employee->provident_fund_percentage) / 100;

            // Create Provident Fund entry
            $this->createProvidentFundEntry($employee, $month, $year, $basicSalary, $employee->provident_fund_percentage);
        }

        // ✅ Calculate gross and net salary
        // $grossSalary = $basicSalary + $totalAllowance + $totalBonus + $overtimeAmount;
        // $totalDeductions = $lateDeduction + $absentDeduction + $providentFund;
        // $netSalary = $grossSalary - $totalDeductions;
        // ✅ Calculate gross and net salary
        $grossSalary = $basicSalary + $totalAllowance + $totalBonus + $overtimeAmount;

        $totalDeductions =
            $lateDeduction +
            $absentDeduction +
            $providentFund +
            $advanceDeduction;

        $netSalary = max(0, $grossSalary - $totalDeductions);
        $finalSalary = $netSalary;

        // ✅ Create or update salary record
        $existingSalary = Salary::where('employee_id', $employee->id)
            ->where('month', $month)
            ->where('year', $year)
            ->first();

        if ($existingSalary) {
            $salary = $existingSalary;
            Log::info('Updating existing salary record', ['salary_id' => $salary->id]);
        } else {
            $salary = new Salary();
            $salary->employee_id = $employee->id;
            $salary->month = $month;
            $salary->year = $year;
            Log::info('Creating new salary record');
        }

        // Set all values
        $salary->basic_salary = $basicSalary;
        $salary->house_rent = $houseRent;
        $salary->medical_allowance = $medicalAllowance;
        $salary->transport_allowance = $transportAllowance;
        $salary->other_allowance = $otherAllowance;
        $salary->total_allowance = $totalAllowance;

        // Bonuses
        $salary->eid_bonus = $eidBonus;
        $salary->festival_bonus = $festivalBonus;
        $salary->performance_bonus = $performanceBonus;
        $salary->other_bonus = $otherBonus;
        $salary->total_bonus = $totalBonus;

        // Other earnings
        $salary->overtime_amount = $overtimeAmount;
        $salary->commission = 0;

        // Deductions
        $salary->late_deduction = $lateDeduction;
        $salary->advance_deduction = $advanceDeduction;
        $salary->late_fee_deduction = $lateFeeDeduction;
        $salary->absent_deduction = $absentDeduction;
        $salary->tax_deduction = 0;
        $salary->provident_fund = $providentFund;
        $salary->other_deductions = 0;
        $salary->total_deductions = $totalDeductions;

        // Attendance summary
        $salary->present_days = $presentDays;
        $salary->absent_days = $totalAbsentDays;
        $salary->leave_days = $paidLeaveDays;
        $salary->late_hours = $totalLateHours;
        $salary->overtime_hours = $totalOvertimeHours;
        $salary->working_days = $totalWorkingDays;

        // Final amounts
        $salary->gross_salary = $grossSalary;
        $salary->net_salary = $netSalary;
        $salary->final_salary = $finalSalary;
        $salary->status = $salary->status ?? 'pending';

        // Notes
        $notes = [];
        if ($totalLateHours > 0)
            $notes[] = "Late: {$totalLateHours}h";
        if ($totalOvertimeHours > 0)
            $notes[] = "Overtime: {$totalOvertimeHours}h";
        if ($advanceDeduction > 0)
            $notes[] = "Advance Deduction: ৳" . number_format($advanceDeduction, 2);

        // if ($lateFeeDeduction > 0)
        //     $notes[] = "Late Fee Deduction: ৳" . number_format($lateFeeDeduction, 2);
        if ($paidLeaveDays > 0)
            $notes[] = "Leave: {$paidLeaveDays}d";
        if ($totalBonus > 0)
            $notes[] = "Bonus: ৳" . number_format($totalBonus, 2);
        if ($houseRent > 0 || $medicalAllowance > 0 || $transportAllowance > 0 || $otherAllowance > 0) {
            $notes[] = "Allowances from settings";
        }

        $salary->notes = !empty($notes) ? implode(', ', $notes) : null;

        $salary->save();

        Log::info('Salary saved successfully', [
            'salary_id' => $salary->id,
            'basic_salary' => $basicSalary,
            'total_allowance' => $totalAllowance,
            'total_bonus' => $totalBonus,
            'net_salary' => $netSalary
        ]);

        return $salary;
    }

    // ✅ Calculate allowances from AllowanceSetting model
    private function calculateAllowancesFromSettings($basicSalary)
    {
        $allowances = [
            'house_rent' => 0,
            'medical_allowance' => 0,
            'transport_allowance' => 0,
            'other_allowance' => 0
        ];

        if (class_exists('App\Models\AllowanceSetting')) {
            $allowanceSettings = AllowanceSetting::where('is_active', true)->get();

            Log::info('Allowance settings found', [
                'count' => $allowanceSettings->count(),
                'settings' => $allowanceSettings->map(function ($setting) {
                    return [
                        'type' => $setting->allowance_type,
                        'percentage' => $setting->percentage,
                        'fixed_amount' => $setting->fixed_amount,
                        'is_percentage' => $setting->is_percentage
                    ];
                })->toArray()
            ]);

            foreach ($allowanceSettings as $setting) {
                $allowanceType = strtolower(trim($setting->allowance_type));

                // Normalize allowance type
                $normalizedType = $this->normalizeAllowanceType($allowanceType);

                if ($normalizedType && array_key_exists($normalizedType, $allowances)) {
                    $allowanceAmount = $setting->is_percentage
                        ? ($basicSalary * $setting->percentage / 100)
                        : $setting->fixed_amount;

                    $allowances[$normalizedType] = $allowanceAmount;

                    Log::info('Allowance calculated', [
                        'type' => $allowanceType,
                        'normalized_type' => $normalizedType,
                        'basic_salary' => $basicSalary,
                        'percentage' => $setting->percentage,
                        'fixed_amount' => $setting->fixed_amount,
                        'is_percentage' => $setting->is_percentage,
                        'calculated_amount' => $allowanceAmount
                    ]);
                } else {
                    Log::warning('Allowance type not recognized', [
                        'original_type' => $allowanceType,
                        'normalized_type' => $normalizedType
                    ]);
                }
            }
        } else {
            Log::error('AllowanceSetting model does not exist');
        }

        return $allowances;
    }

    // ✅ Normalize allowance type
    private function normalizeAllowanceType($type)
    {
        $type = strtolower(trim($type));

        $mapping = [
            'house_rent' => ['house_rent', 'houserent', 'house rent', 'house-rent'],
            'medical_allowance' => ['medical_allowance', 'medicalallowance', 'medical allowance', 'medical-allowance'],
            'transport_allowance' => ['transport_allowance', 'transportallowance', 'transport allowance', 'transport-allowance'],
            'other_allowance' => ['other_allowance', 'otherallowance', 'other allowance', 'other-allowance']
        ];

        foreach ($mapping as $key => $possibleTypes) {
            if (in_array($type, $possibleTypes)) {
                return $key;
            }
        }

        return null;
    }

    // ✅ Calculate bonuses from BonusSetting model
    private function calculateBonusesFromSettings(Employee $employee, $month, $year)
    {
        $bonuses = [
            'eid_bonus' => 0,
            'festival_bonus' => 0,
            'other_bonus' => 0
        ];

        if (class_exists('App\Models\BonusSetting')) {
            $bonusSettings = BonusSetting::where('is_active', true)->get();

            Log::info('Bonus settings found', [
                'count' => $bonusSettings->count(),
                'employee_id' => $employee->id,
                'month' => $month,
                'year' => $year
            ]);

            foreach ($bonusSettings as $setting) {
                $bonusAmount = $setting->is_percentage
                    ? ($employee->basic_salary * $setting->percentage / 100)
                    : $setting->fixed_amount;

                // Check if bonus applies to this month
                if ($this->bonusAppliesThisMonth($setting, $month, $year)) {
                    switch ($setting->bonus_type) {
                        case 'eid':
                            $bonuses['eid_bonus'] += $bonusAmount;
                            Log::info('Eid bonus added', [
                                'amount' => $bonusAmount,
                                'setting_id' => $setting->id
                            ]);
                            break;
                        case 'festival':
                            $bonuses['festival_bonus'] += $bonusAmount;
                            Log::info('Festival bonus added', [
                                'amount' => $bonusAmount,
                                'setting_id' => $setting->id
                            ]);
                            break;
                        case 'other':
                            $bonuses['other_bonus'] += $bonusAmount;
                            Log::info('Other bonus added', [
                                'amount' => $bonusAmount,
                                'setting_id' => $setting->id
                            ]);
                            break;
                    }
                }
            }
        }

        return $bonuses;
    }

    // ✅ Check if bonus applies to specific month
    private function bonusAppliesThisMonth(BonusSetting $bonusSetting, $month, $year)
    {
        if ($bonusSetting->effective_date) {
            $effectiveDate = Carbon::parse($bonusSetting->effective_date);
            $applies = ($effectiveDate->month == $month && $effectiveDate->year == $year);

            Log::info('Checking if bonus applies', [
                'bonus_id' => $bonusSetting->id,
                'bonus_type' => $bonusSetting->bonus_type,
                'effective_date' => $bonusSetting->effective_date,
                'target_month' => $month,
                'target_year' => $year,
                'applies' => $applies
            ]);

            return $applies;
        }

        return true;
    }

    private function getTotalWorkingDays($month, $year)
    {
        $startDate = Carbon::create($year, $month, 1);
        $endDate = $startDate->copy()->endOfMonth();

        $workingDays = 0;

        for ($date = $startDate->copy(); $date->lte($endDate); $date->addDay()) {
            if ($date->dayOfWeek != Carbon::FRIDAY) {
                $workingDays++;
            }
        }

        Log::info('Working days calculated', [
            'month' => $month,
            'year' => $year,
            'working_days' => $workingDays
        ]);

        return $workingDays;
    }

    private function calculatePerformanceBonus(Employee $employee, $presentDays, $totalWorkingDays)
    {
        if ($totalWorkingDays <= 0 || $presentDays <= 0) {
            return 0;
        }

        $attendancePercentage = ($presentDays / $totalWorkingDays) * 100;
        $basicSalary = $employee->basic_salary ?? 0;

        $bonus = 0;
        if ($attendancePercentage >= 98) {
            $bonus = $basicSalary * 0.15;
        } elseif ($attendancePercentage >= 95) {
            $bonus = $basicSalary * 0.10;
        } elseif ($attendancePercentage >= 90) {
            $bonus = $basicSalary * 0.05;
        }

        Log::info('Performance bonus calculated', [
            'employee_id' => $employee->id,
            'present_days' => $presentDays,
            'total_working_days' => $totalWorkingDays,
            'attendance_percentage' => $attendancePercentage,
            'basic_salary' => $basicSalary,
            'bonus' => $bonus
        ]);

        return $bonus;
    }

    private function calculateAwardBonus(Employee $employee, $month, $year)
    {
        if (!class_exists('App\Models\EmployeeAward')) {
            return 0;
        }

        $awardBonus = EmployeeAward::where('employee_id', $employee->id)
            ->where('is_paid', false)
            ->whereYear('award_date', $year)
            ->whereMonth('award_date', $month)
            ->sum('cash_amount') ?? 0;

        if ($awardBonus > 0) {
            Log::info('Award bonus found', [
                'employee_id' => $employee->id,
                'month' => $month,
                'year' => $year,
                'award_bonus' => $awardBonus
            ]);
        }

        return $awardBonus;
    }

    // ✅ Create Provident Fund entry
    private function createProvidentFundEntry($employee, $month, $year, $basicSalary, $pfPercentage)
    {
        if (class_exists('App\Models\ProvidentFund')) {
            try {
                $employeeContribution = ($basicSalary * $pfPercentage) / 100;
                $employerContribution = $employeeContribution;
                $totalContribution = $employeeContribution + $employerContribution;

                // Get previous balance
                $previousBalance = $this->getPreviousPfBalance($employee->id, $month, $year);
                $currentBalance = $previousBalance + $totalContribution;

                $pfEntry = ProvidentFund::updateOrCreate(
                    [
                        'employee_id' => $employee->id,
                        'month' => $month,
                        'year' => $year
                    ],
                    [
                        'employee_contribution' => $employeeContribution,
                        'employer_contribution' => $employerContribution,
                        'total_contribution' => $totalContribution,
                        'current_balance' => $currentBalance,
                        'status' => 'active',
                        'contribution_date' => Carbon::create($year, $month, 1)->endOfMonth()
                    ]
                );

                Log::info('Provident Fund entry created', [
                    'employee_id' => $employee->id,
                    'pf_entry_id' => $pfEntry->id ?? null
                ]);

                return $pfEntry;
            } catch (\Exception $e) {
                Log::error('Failed to create Provident Fund entry: ' . $e->getMessage());
                return null;
            }
        }

        return null;
    }

    // ✅ Get previous PF balance
    private function getPreviousPfBalance($employeeId, $currentMonth, $currentYear)
    {
        $date = Carbon::create($currentYear, $currentMonth, 1)->subMonth();
        $prevMonth = $date->month;
        $prevYear = $date->year;

        $previousRecord = ProvidentFund::where('employee_id', $employeeId)
            ->where('month', $prevMonth)
            ->where('year', $prevYear)
            ->first();

        return $previousRecord ? $previousRecord->current_balance : 0;
    }

    // ✅ Apply allowances to all employees (update employee records to 0)
    public function applyAllowanceSettingsToEmployees()
    {
        $employees = Employee::where('is_active', true)->get();
        $count = 0;

        foreach ($employees as $employee) {
            // Set employee allowances to 0 since they'll come from settings
            $employee->update([
                'house_rent' => 0,
                'medical_allowance' => 0,
                'transport_allowance' => 0,
                'other_allowance' => 0
            ]);
            $count++;

            Log::info('Employee allowances reset to 0', [
                'employee_id' => $employee->id,
                'name' => $employee->name
            ]);
        }

        return redirect()->back()->with('success', "Employee allowances set to 0 for {$count} employees. All allowances will now come from settings.");
    }

    // ✅ Debug method to test allowance calculation
    public function debugAllowanceCalculation($employeeId = null)
    {
        if ($employeeId) {
            $employee = Employee::find($employeeId);
            if (!$employee) {
                return response()->json(['error' => 'Employee not found'], 404);
            }

            $basicSalary = $employee->basic_salary ?? 0;
            $allowances = $this->calculateAllowancesFromSettings($basicSalary);

            $allowanceSettings = AllowanceSetting::where('is_active', true)->get();

            return response()->json([
                'employee' => [
                    'id' => $employee->id,
                    'name' => $employee->name,
                    'employee_id' => $employee->employee_id,
                    'basic_salary' => $basicSalary,
                    'current_allowances' => [
                        'house_rent' => $employee->house_rent,
                        'medical_allowance' => $employee->medical_allowance,
                        'transport_allowance' => $employee->transport_allowance,
                        'other_allowance' => $employee->other_allowance
                    ]
                ],
                'allowance_settings' => $allowanceSettings->map(function ($setting) {
                    return [
                        'id' => $setting->id,
                        'allowance_type' => $setting->allowance_type,
                        'percentage' => $setting->percentage,
                        'fixed_amount' => $setting->fixed_amount,
                        'is_percentage' => $setting->is_percentage,
                        'is_active' => $setting->is_active,
                        'description' => $setting->description
                    ];
                }),
                'calculated_allowances' => $allowances,
                'total_allowance' => array_sum($allowances),
                'allowance_settings_count' => $allowanceSettings->count(),
                'settings_applied' => $allowanceSettings->count() > 0
            ]);
        } else {
            $allowanceSettings = AllowanceSetting::where('is_active', true)->get();

            return response()->json([
                'allowance_settings_count' => $allowanceSettings->count(),
                'allowance_settings' => $allowanceSettings,
                'active_employees_count' => Employee::where('is_active', true)->count(),
                'message' => 'No employee specified. Provide employee_id parameter.'
            ]);
        }
    }
    public function paySalary(Request $request, Salary $salary)
    {
        $request->validate([
            'payment_method' => 'required|string|in:cash,bank,cheque,mobile_banking',
            'transaction_id' => 'nullable|string',
            'payment_date' => 'nullable|date',
            'account_id' => 'required_if:payment_method,bank,mobile_banking|exists:accounts,id',
            'notes' => 'nullable|string'
        ]);

        DB::beginTransaction();

        try {
            $payableSalary = $salary->final_salary ?: $salary->net_salary;

            $account = null;

            if ($request->account_id) {
                $account = Account::find($request->account_id);

                if (!$account) {
                    throw new \Exception('Selected account not found');
                }

                if (!$account->is_active) {
                    throw new \Exception('Selected account is not active');
                }

                if ($account->current_balance < $payableSalary) {
                    throw new \Exception("Insufficient balance in account: {$account->name}. Available: ৳{$account->current_balance}, Required: ৳{$payableSalary}");
                }
            }

            $salary->update([
                'status' => 'paid',
            ]);

            $payment = Payment::create([
                'reference_type' => 'salary_payment',
                'reference_id' => $salary->id,
                'salary_id' => $salary->id,
                'employee_id' => $salary->employee_id,
                'amount' => -$payableSalary,
                'payment_method' => $request->payment_method,
                'txn_ref' => $request->transaction_id ?? ('SAL-' . strtoupper(Str::random(10))),
                'note' => $request->notes ?? 'Salary payment for ' . Carbon::create($salary->year, $salary->month, 1)->format('F Y'),
                'account_id' => $request->account_id,
                'paid_at' => $request->payment_date ?? Carbon::now(),
                'created_by' => Auth::id()
            ]);

            if ($account) {
                $account->updateBalance($payableSalary, 'withdraw', $payment);

                Log::info('Account balance updated after salary payment', [
                    'account_id' => $account->id,
                    'account_name' => $account->name,
                    'amount' => $payableSalary,
                    'payment_id' => $payment->id,
                    'salary_id' => $salary->id
                ]);
            }

            DB::commit();

            Log::info('Salary marked as paid', [
                'salary_id' => $salary->id,
                'employee_id' => $salary->employee_id,
                'payment_method' => $request->payment_method,
                'payment_id' => $payment->id,
                'account_id' => $request->account_id
            ]);

            return redirect()->back()->with('success', 'Salary marked as paid successfully');
        } catch (\Exception $e) {
            DB::rollBack();

            Log::error('Salary payment failed: ' . $e->getMessage());

            return redirect()->back()->with('error', 'Error paying salary: ' . $e->getMessage());
        }
    }

    // public function paySalary(Request $request, Salary $salary)
    // {
    //     $request->validate([
    //         'payment_method' => 'required|string|in:cash,bank,cheque,mobile_banking',
    //         'transaction_id' => 'nullable|string',
    //         'payment_date' => 'nullable|date',
    //         'account_id' => 'required_if:payment_method,bank,mobile_banking|exists:accounts,id',
    //         'notes' => 'nullable|string'
    //     ]);

    //     DB::beginTransaction();
    //     try {
    //         $account = null;
    //         if ($request->account_id) {
    //             $account = Account::find($request->account_id);

    //             if (!$account) {
    //                 throw new \Exception('Selected account not found');
    //             }

    //             if (!$account->is_active) {
    //                 throw new \Exception('Selected account is not active');
    //             }

    //             // Check account balance
    //             $payableSalary = $salary->final_salary ?: $salary->net_salary;

    //             if ($account->current_balance < $payableSalary) {
    //                 throw new \Exception("Insufficient balance in account: {$account->name}. Available: ৳{$account->current_balance}, Required: ৳{$payableSalary}");
    //             }
    //         }

    //         // Update salary status only (no payment fields in salaries table)
    //         $salary->update([
    //             'status' => 'paid',
    //             // Remove payment_method, transaction_id, payment_date from here
    //             // They will be stored in payments table
    //         ]);

    //         // Create payment record in payments table
    //         $payment = Payment::create([
    //             'salary_id' => $salary->id,
    //             'employee_id' => $salary->employee_id,
    //             'amount' => -$payableSalary, // এখানে negative করে দিন
    //             'payment_method' => $request->payment_method,
    //             'txn_ref' => $request->transaction_id ?? ('SAL-' . strtoupper(Str::random(10))),
    //             'note' => $request->notes ?? 'Salary payment for ' . Carbon::create($salary->year, $salary->month, 1)->format('F Y'),
    //             'account_id' => $request->account_id,
    //             'paid_at' => $request->payment_date ?? Carbon::now(),
    //             'created_by' => Auth::id()
    //         ]);

    //         // Deduct from account if account is selected
    //         if ($account) {
    //             // Use the existing updateBalance method from Account model
    //             $account->updateBalance($payableSalary, 'withdraw', $payment);

    //             Log::info('Account balance updated after salary payment', [
    //                 'account_id' => $account->id,
    //                 'account_name' => $account->name,
    //                 'amount' => $payableSalary,
    //                 'payment_id' => $payment->id,
    //                 'salary_id' => $salary->id
    //             ]);
    //         }

    //         DB::commit();

    //         Log::info('Salary marked as paid', [
    //             'salary_id' => $salary->id,
    //             'employee_id' => $salary->employee_id,
    //             'payment_method' => $request->payment_method,
    //             'payment_id' => $payment->id,
    //             'account_id' => $request->account_id
    //         ]);

    //         return redirect()->back()->with('success', 'Salary marked as paid successfully');
    //     } catch (\Exception $e) {
    //         DB::rollBack();
    //         Log::error('Salary payment failed: ' . $e->getMessage());
    //         return redirect()->back()->with('error', 'Error paying salary: ' . $e->getMessage());
    //     }
    // }

    public function payslip($id)
    {
        $salary = Salary::with(['employee', 'employee.rank'])
            ->findOrFail($id);

        // Get payment details if paid
        $payment = null;
        if ($salary->status == 'paid') {
            $payment = Payment::where('salary_id', $salary->id)->first();
        }

        $breakdown = [
            'earnings' => [
                'Basic Salary' => $salary->basic_salary,
                'House Rent' => $salary->house_rent,
                'Medical Allowance' => $salary->medical_allowance,
                'Transport Allowance' => $salary->transport_allowance,
                'Other Allowance' => $salary->other_allowance,
                'Eid Bonus' => $salary->eid_bonus,
                'Festival Bonus' => $salary->festival_bonus,
                'Performance Bonus' => $salary->performance_bonus,
                'Other Bonus' => $salary->other_bonus,
                'Overtime' => $salary->overtime_amount,
            ],
            'deductions' => [
                'Late Deduction' => $salary->late_deduction,
                'Salary Advance Deduction' => $salary->advance_deduction,
                // 'Late Fee Deduction' => $salary->late_fee_deduction,
                'Absent Deduction' => $salary->absent_deduction,
                'Provident Fund' => $salary->provident_fund,
                'Other Deductions' => $salary->other_deductions
            ]
        ];

        // Get allowance settings for display
        $allowanceSettings = AllowanceSetting::where('is_active', true)->get();
        $bonusSettings = BonusSetting::where('is_active', true)->get();

        return Inertia::render('Salary/Payslip', [
            'salary' => $salary,
            'payment' => $payment,
            'breakdown' => $breakdown,
            'attendance_summary' => [
                'working_days' => $salary->working_days,
                'present_days' => $salary->present_days,
                'absent_days' => $salary->absent_days,
                'leave_days' => $salary->leave_days,
                'late_hours' => $salary->late_hours,
                'overtime_hours' => $salary->overtime_hours
            ],
            'allowance_settings' => $allowanceSettings,
            'bonus_settings' => $bonusSettings,
            'calculated_from_settings' => true
        ]);
    }

    public function destroy(Salary $salary)
    {
        if ($salary->status == 'paid') {
            return redirect()->back()->with('error', 'Cannot delete paid salary record');
        }

        $salary->delete();

        Log::info('Salary record deleted', ['salary_id' => $salary->id]);

        return redirect()->back()->with('success', 'Salary record deleted successfully');
    }

    // public function bulkAction(Request $request)
    // {
    //     $request->validate([
    //         'action' => 'required|in:approve,pay,delete',
    //         'ids' => 'required|array',
    //         'ids.*' => 'exists:salaries,id'
    //     ]);

    //     $salaries = Salary::whereIn('id', $request->ids)->get();
    //     $count = 0;

    //     DB::beginTransaction();
    //     try {
    //         foreach ($salaries as $salary) {
    //             switch ($request->action) {
    //                 case 'approve':
    //                     if ($salary->status == 'pending') {
    //                         $salary->update(['status' => 'approved']);
    //                         $count++;
    //                         Log::info('Salary approved', ['salary_id' => $salary->id]);
    //                     }
    //                     break;

    //                 case 'pay':
    //                     if (in_array($salary->status, ['pending', 'approved'])) {
    //                         // For bulk payment, use default payment method (cash)
    //                         $salary->update([
    //                             'status' => 'paid'
    //                         ]);
    //                         $payableSalary = $salary->final_salary ?: $salary->net_salary;
    //                         // Create payment record without account (for bulk payment)
    //                         Payment::create([
    //                             'salary_id' => $salary->id,
    //                             'employee_id' => $salary->employee_id,
    //                             'amount' => -$payableSalary,
    //                             // 'amount' => -$salary->net_salary, // এখানে negative করে দিন
    //                             'payment_method' => 'cash',
    //                             'txn_ref' => 'BULK-' . strtoupper(Str::random(8)),
    //                             'note' => 'Bulk salary payment for ' . Carbon::create($salary->year, $salary->month, 1)->format('F Y'),
    //                             'account_id' => null,
    //                             'paid_at' => Carbon::now(),
    //                             'created_by' => Auth::id()
    //                         ]);

    //                         $count++;
    //                         Log::info('Salary marked as paid in bulk', ['salary_id' => $salary->id]);
    //                     }
    //                     break;

    //                 case 'delete':
    //                     if ($salary->status != 'paid') {
    //                         $salary->delete();
    //                         $count++;
    //                         Log::info('Salary deleted', ['salary_id' => $salary->id]);
    //                     }
    //                     break;
    //             }
    //         }

    //         DB::commit();

    //         $actionNames = [
    //             'approve' => 'approved',
    //             'pay' => 'paid',
    //             'delete' => 'deleted'
    //         ];

    //         Log::info('Bulk action completed', [
    //             'action' => $request->action,
    //             'count' => $count,
    //             'total' => count($request->ids)
    //         ]);

    //         return redirect()->back()->with('success', "{$count} salary records {$actionNames[$request->action]} successfully");
    //     } catch (\Exception $e) {
    //         DB::rollBack();
    //         Log::error('Bulk action failed: ' . $e->getMessage());
    //         return redirect()->back()->with('error', 'Error performing bulk action: ' . $e->getMessage());
    //     }
    // }

    public function bulkAction(Request $request)
{
    $request->validate([
        'action' => 'required|in:approve,pay,delete',
        'ids' => 'required|array',
        'ids.*' => 'exists:salaries,id'
    ]);

    $salaries = Salary::whereIn('id', $request->ids)->get();
    $count = 0;

    DB::beginTransaction();

    try {
        foreach ($salaries as $salary) {
            switch ($request->action) {
                case 'approve':
                    if ($salary->status == 'pending') {
                        $salary->update(['status' => 'approved']);
                        $count++;

                        Log::info('Salary approved', [
                            'salary_id' => $salary->id
                        ]);
                    }
                    break;

                case 'pay':
                    if (in_array($salary->status, ['pending', 'approved'])) {
                        $salary->update([
                            'status' => 'paid'
                        ]);

                        $payableSalary = $salary->final_salary ?: $salary->net_salary;

                        Payment::create([
                            'reference_type' => 'salary_payment',
                            'reference_id' => $salary->id,
                            'salary_id' => $salary->id,
                            'employee_id' => $salary->employee_id,
                            'amount' => -$payableSalary,
                            'payment_method' => 'cash',
                            'txn_ref' => 'BULK-' . strtoupper(Str::random(8)),
                            'note' => 'Bulk salary payment for ' . Carbon::create($salary->year, $salary->month, 1)->format('F Y'),
                            'account_id' => null,
                            'paid_at' => Carbon::now(),
                            'created_by' => Auth::id()
                        ]);

                        $count++;

                        Log::info('Salary marked as paid in bulk', [
                            'salary_id' => $salary->id,
                            'payable_salary' => $payableSalary
                        ]);
                    }
                    break;

                case 'delete':
                    if ($salary->status != 'paid') {
                        $salary->delete();
                        $count++;

                        Log::info('Salary deleted', [
                            'salary_id' => $salary->id
                        ]);
                    }
                    break;
            }
        }

        DB::commit();

        $actionNames = [
            'approve' => 'approved',
            'pay' => 'paid',
            'delete' => 'deleted'
        ];

        Log::info('Bulk action completed', [
            'action' => $request->action,
            'count' => $count,
            'total' => count($request->ids)
        ]);

        return redirect()->back()->with('success', "{$count} salary records {$actionNames[$request->action]} successfully");

    } catch (\Exception $e) {
        DB::rollBack();

        Log::error('Bulk action failed: ' . $e->getMessage());

        return redirect()->back()->with('error', 'Error performing bulk action: ' . $e->getMessage());
    }
}

    // ✅ NEW: Get salary summary report
    public function report(Request $request)
    {
        $request->validate([
            'month' => 'required|integer|between:1,12',
            'year' => 'required|integer|min:2020'
        ]);

        $salaries = Salary::with('employee')
            ->where('month', $request->month)
            ->where('year', $request->year)
            ->where('status', 'paid')
            ->get();

        $summary = [
            'total_employees' => $salaries->count(),
            'total_basic_salary' => $salaries->sum('basic_salary'),
            'total_allowance' => $salaries->sum('total_allowance'),
            'total_bonus' => $salaries->sum('total_bonus'),
            'total_overtime' => $salaries->sum('overtime_amount'),
            'total_deductions' => $salaries->sum('total_deductions'),
            'total_net_salary' => $salaries->sum('final_salary') ?: $salaries->sum('net_salary'),
            'average_salary' => $salaries->avg('final_salary') ?: $salaries->avg('net_salary')
        ];

        return Inertia::render('Salary/Report', [
            'salaries' => $salaries,
            'summary' => $summary,
            'month' => $request->month,
            'year' => $request->year,
            'month_name' => Carbon::create($request->year, $request->month, 1)->format('F Y')
        ]);
    }

    // ✅ NEW: Check allowance settings status
    public function checkAllowanceSettings()
    {
        $allowanceSettings = AllowanceSetting::where('is_active', true)->get();
        $employeesWithAllowances = Employee::where('is_active', true)
            ->where(function ($q) {
                $q->where('house_rent', '>', 0)
                    ->orWhere('medical_allowance', '>', 0)
                    ->orWhere('transport_allowance', '>', 0)
                    ->orWhere('other_allowance', '>', 0);
            })
            ->count();

        return response()->json([
            'allowance_settings_active' => $allowanceSettings->count() > 0,
            'allowance_settings_count' => $allowanceSettings->count(),
            'allowance_settings' => $allowanceSettings->map(function ($setting) {
                return [
                    'id' => $setting->id,
                    'type' => $setting->allowance_type,
                    'value' => $setting->is_percentage ? $setting->percentage . '%' : '৳' . $setting->fixed_amount
                ];
            }),
            'employees_with_allowances' => $employeesWithAllowances,
            'total_active_employees' => Employee::where('is_active', true)->count(),
            'recommendation' => $employeesWithAllowances > 0
                ? 'Run "Apply Allowance Settings to Employees" to reset allowances to 0'
                : 'Ready to use allowance settings'
        ]);
    }

    // ✅ NEW: Calculate salary for single employee (API)
    public function calculateSingle(Request $request)
    {
        $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'month' => 'required|integer|between:1,12',
            'year' => 'required|integer|min:2020'
        ]);

        $employee = Employee::find($request->employee_id);

        if (!$employee) {
            return response()->json([
                'success' => false,
                'message' => 'Employee not found'
            ], 404);
        }

        try {
            $salary = $this->calculateEmployeeSalary($employee, $request->month, $request->year);

            return response()->json([
                'success' => true,
                'message' => 'Salary calculated successfully',
                'data' => [
                    'salary_id' => $salary->id,
                    'employee' => [
                        'id' => $employee->id,
                        'name' => $employee->name,
                        'employee_id' => $employee->employee_id
                    ],
                    'month' => $request->month,
                    'year' => $request->year,
                    'basic_salary' => $salary->basic_salary,
                    'total_allowance' => $salary->total_allowance,
                    'total_bonus' => $salary->total_bonus,
                    'total_deductions' => $salary->total_deductions,
                    'net_salary' => $salary->net_salary,
                    'advance_deduction' => $salary->advance_deduction,
                    'late_fee_deduction' => $salary->late_fee_deduction,
                    'final_salary' => $salary->final_salary,
                    'status' => $salary->status
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Single salary calculation failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error calculating salary: ' . $e->getMessage()
            ], 500);
        }
    }
}
