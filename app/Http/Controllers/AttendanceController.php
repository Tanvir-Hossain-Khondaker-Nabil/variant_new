<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Models\BusinessSetting;
use App\Models\Employee;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AttendanceController extends Controller
{
    public function index(Request $request)
    {
        // বাংলাদেশের আজকের তারিখ
        $today = Carbon::now('Asia/Dhaka')->format('Y-m-d');

        $query = Attendance::with([
            'employee' => function ($q) {
                $q->select('id', 'name', 'employee_id', 'rank_id');
            }
        ])
            ->when($request->date, function ($q) use ($request) {
                $date = Carbon::parse($request->date)->format('Y-m-d');
                $q->whereDate('date', $date);
            }, function ($q) use ($today) {
                $q->whereDate('date', $today);
            })
            ->when($request->employee_id, function ($q) use ($request) {
                $q->where('employee_id', $request->employee_id);
            });

        $attendances = $query->orderBy('date', 'desc')
            ->orderBy('check_in', 'desc')
            ->paginate(50);

        $employees = Employee::where('is_active', true)
            ->get(['id', 'name', 'employee_id'])
            ->map(function ($employee) {
                return [
                    'id' => $employee->id,
                    'name' => $employee->name,
                    'employee_id' => $employee->employee_id,
                    'display' => "{$employee->name} ({$employee->employee_id})"
                ];
            });

        // return Inertia::render('Attendance/Index', [
        //     'attendances' => $attendances,
        //     'filters' => $request->only(['date', 'employee_id']),
        //     'employees' => $employees
        // ]);
        return Inertia::render('Attendance/Index', [
    'attendances' => $attendances,
    'filters' => [
        'date' => $request->date ?? $today,
        'employee_id' => $request->employee_id,
    ],
    'employees' => $employees
]);
    }

    // private function calculateLateData($checkInTime): array
    // {
    //     $settings = BusinessSetting::current();

    //     $lateMinutes = 0;
    //     $lateFee = 0;
    //     $attendanceStatus = 'present';

    //     if (
    //         !$settings ||
    //         !$settings->auto_late_calculation ||
    //         !$checkInTime
    //     ) {
    //         return [
    //             'attendance_status' => $attendanceStatus,
    //             'late_minutes' => $lateMinutes,
    //             'late_fee' => $lateFee,
    //         ];
    //     }

    //     $officeStartTime = Carbon::parse($settings->office_start_time);

    //     $checkIn = Carbon::parse($checkInTime);

    //     $allowedLateTime = $officeStartTime
    //         ->copy()
    //         ->addMinutes((int) $settings->late_after_minutes);

    //     if ($checkIn->greaterThan($allowedLateTime)) {

    //         $attendanceStatus = 'late';

    //         $lateMinutes = $allowedLateTime
    //             ->diffInMinutes($checkIn);

    //         $lateFee = (float) $settings->late_fee_amount;
    //     }

    //     return [
    //         'attendance_status' => $attendanceStatus,
    //         'late_minutes' => $lateMinutes,
    //         'late_fee' => $lateFee,
    //     ];
    // }
    private function calculateLateData($checkInTime): array
{
    $settings = BusinessSetting::current();

    $lateMinutes = 0;
    $lateFee = 0;
    $attendanceStatus = 'present';

    if (
        !$settings ||
        !$settings->auto_late_calculation ||
        !$checkInTime
    ) {
        return [
            'attendance_status' => $attendanceStatus,
            'late_minutes' => $lateMinutes,
            'late_fee' => $lateFee,
        ];
    }

    $now = Carbon::now('Asia/Dhaka');

    $officeStart = Carbon::parse($now->format('Y-m-d') . ' ' . $settings->office_start_time, 'Asia/Dhaka');
    $officeEnd = Carbon::parse($now->format('Y-m-d') . ' ' . $settings->office_end_time, 'Asia/Dhaka');
    $checkIn = Carbon::parse($now->format('Y-m-d') . ' ' . $checkInTime, 'Asia/Dhaka');

    // Overnight shift: 09:00 PM to 04:00 AM
    if ($officeEnd->lessThanOrEqualTo($officeStart)) {
        $officeEnd->addDay();

        // If punch-in is after midnight but before office end,
        // office start should be previous day.
        if ($checkIn->lessThan($officeStart)) {
            $officeStart->subDay();
        }
    }

    $allowedLateTime = $officeStart
        ->copy()
        ->addMinutes((int) $settings->late_after_minutes);

    if ($checkIn->greaterThan($allowedLateTime)) {
        $attendanceStatus = 'late';
        $lateMinutes = $allowedLateTime->diffInMinutes($checkIn);
        $lateFee = (float) $settings->late_fee_amount;
    }

    return [
        'attendance_status' => $attendanceStatus,
        'late_minutes' => $lateMinutes,
        'late_fee' => $lateFee,
    ];
}

    // ✅ Check-In (বাংলাদেশ টাইম অনুযায়ী)
    public function checkIn(Request $request)
    {
        try {
            $request->validate([
                'employee_id' => 'required|exists:employees,id'
            ]);

            // বাংলাদেশের বর্তমান সময়
            $now = Carbon::now('Asia/Dhaka');
            $today = $now->format('Y-m-d');
            $currentTime = $now->format('H:i'); // শুধু ঘন্টা এবং মিনিট

            Log::info('Bangladesh Time Check-in:', [
                'date' => $today,
                'time' => $currentTime,
                'employee_id' => $request->employee_id
            ]);

            // Check if already checked in today
            $existing = Attendance::where('employee_id', $request->employee_id)
                ->whereDate('date', $today)
                ->first();

            if ($existing) {
                return response()->json([
                    'success' => false,
                    'message' => 'Already checked in today',
                    'attendance' => $existing
                ], 400);
            }

            // Create attendance record
            // $attendance = Attendance::create([
            //     'employee_id' => $request->employee_id,
            //     'date' => $today,
            //     'check_in' => $currentTime,
            //     'status' => 'present'
            // ]);

            $lateData = $this->calculateLateData($currentTime);

            $attendance = Attendance::create([
                'employee_id' => $request->employee_id,
                'date' => $today,

                // existing
                'check_in' => $currentTime,
                'status' => $lateData['attendance_status'],

                // new
                'attendance_status' => $lateData['attendance_status'],
                'check_in_time' => $currentTime,
                'late_minutes' => $lateData['late_minutes'],
                'late_fee' => $lateData['late_fee'],
            ]);

            // Refresh to get calculated values
            $attendance->refresh();

            return response()->json([
                'success' => true,
                'message' => 'Checked in successfully',
                'attendance' => $attendance->load('employee'),
                'bangladesh_time' => $currentTime
            ]);
        } catch (\Exception $e) {
            Log::error('Check-in error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ], 500);
        }
    }

    // ✅ Check-Out (বাংলাদেশ টাইম অনুযায়ী)
    public function checkOut(Request $request)
    {
        try {
            $request->validate([
                'employee_id' => 'required|exists:employees,id'
            ]);

            // বাংলাদেশের বর্তমান সময়
            $now = Carbon::now('Asia/Dhaka');
            $today = $now->format('Y-m-d');
            $currentTime = $now->format('H:i');

            Log::info('Bangladesh Time Check-out:', [
                'date' => $today,
                'time' => $currentTime,
                'employee_id' => $request->employee_id
            ]);

            // Find today's attendance
            $attendance = Attendance::with('employee')
                ->where('employee_id', $request->employee_id)
                ->whereDate('date', $today)
                ->first();

            if (!$attendance) {
                return response()->json([
                    'success' => false,
                    'message' => 'Please check in first'
                ], 400);
            }

            if ($attendance->check_out) {
                return response()->json([
                    'success' => false,
                    'message' => 'Already checked out today'
                ], 400);
            }

            // Update check-out time
            $attendance->check_out = $currentTime;
            $attendance->save();

            // Refresh to get recalculated values
            $attendance->refresh();

            $message = 'Checked out successfully';
            if ($attendance->overtime_hours > 0) {
                $message .= " with {$attendance->overtime_hours} hours overtime";
            }

            return response()->json([
                'success' => true,
                'message' => $message,
                'attendance' => $attendance,
                'bangladesh_time' => $currentTime
            ]);
        } catch (\Exception $e) {
            Log::error('Check-out error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ], 500);
        }
    }

    // ✅ Early Out (বাংলাদেশ টাইম অনুযায়ী)
    public function earlyOut(Request $request)
    {
        try {
            $request->validate([
                'employee_id' => 'required|exists:employees,id'
            ]);

            $now = Carbon::now('Asia/Dhaka');
            $today = $now->format('Y-m-d');
            $currentTime = $now->format('H:i');

            $attendance = Attendance::where('employee_id', $request->employee_id)
                ->whereDate('date', $today)
                ->first();

            if (!$attendance) {
                return response()->json([
                    'success' => false,
                    'message' => 'Please check in first'
                ], 400);
            }

            if ($attendance->check_out) {
                return response()->json([
                    'success' => false,
                    'message' => 'Already checked out today'
                ], 400);
            }

            // Early out - set check_out but manually override overtime to 0
            $attendance->check_out = $currentTime;
            // Force save without triggering overtime calculation
            $attendance->timestamps = false;
            $attendance->save(['timestamps' => false]);

            // Manually set overtime to 0
            $attendance->overtime_hours = 0;
            $attendance->save(['timestamps' => false]);

            // Restore timestamps
            $attendance->timestamps = true;

            return response()->json([
                'success' => true,
                'message' => 'Early check-out recorded successfully',
                'attendance' => $attendance,
                'bangladesh_time' => $currentTime
            ]);
        } catch (\Exception $e) {
            Log::error('Early out error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getTodayAttendance()
    {
        $today = Carbon::now('Asia/Dhaka')->format('Y-m-d');

        $attendance = Attendance::with('employee')
            ->whereDate('date', $today)
            ->get()
            ->map(function ($att) {
                return [
                    'id' => $att->id,
                    'employee_id' => $att->employee_id,
                    'employee' => $att->employee,
                    'check_in' => $att->check_in,
                    'check_out' => $att->check_out,
                    'status' => $att->status,
                    'attendance_status' => $att->attendance_status,
                    'late_minutes' => $att->late_minutes,
                    'late_fee' => $att->late_fee,
                    'late_hours' => $att->late_hours,
                    'overtime_hours' => $att->overtime_hours,
                    'late_amount' => $att->late_amount,
                    'overtime_amount' => $att->overtime_amount,
                    'total_hours' => $att->total_hours,
                    'formatted_check_in' => $att->formatted_check_in,
                    'formatted_check_out' => $att->formatted_check_out,
                    'formatted_date' => $att->formatted_date,
                    'check_in_time' => $att->check_in_time,
                    'check_out_time' => $att->check_out_time,
                    'bangladesh_date' => $today ?? Carbon::now(),
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $attendance,
            'today_bangladesh' => $today
        ]);
    }

    // ✅ Manual Attendance Form
    public function manualForm()
    {
        $employees = Employee::where('is_active', true)
            ->get(['id', 'name', 'employee_id'])
            ->map(function ($employee) {
                return [
                    'id' => $employee->id,
                    'name' => $employee->name,
                    'employee_id' => $employee->employee_id,
                    'display' => "{$employee->name} ({$employee->employee_id})"
                ];
            });

        return Inertia::render('Attendance/ManualForm', [
            'employees' => $employees
        ]);
    }

    // ✅ Store Manual Attendance
    // public function store(Request $request)
    // {
    //     $request->validate([
    //         'employee_id' => 'required|exists:employees,id',
    //         'date' => 'required|date',
    //         'check_in' => 'required|date_format:H:i',
    //         'check_out' => 'required|date_format:H:i',
    //     ]);

    //     // Check if attendance already exists
    //     $existing = Attendance::where('employee_id', $request->employee_id)
    //         ->whereDate('date', $request->date)
    //         ->first();

    //     if ($existing) {
    //         return response()->json([
    //             'success' => false,
    //             'message' => 'Attendance already exists for this date'
    //         ], 400);
    //     }

    //     $attendance = Attendance::create([
    //         'employee_id' => $request->employee_id,
    //         'date' => $request->date,
    //         'check_in' => $request->check_in,
    //         'check_out' => $request->check_out,
    //     ]);

    //     $attendance->refresh();

    //     return response()->json([
    //         'success' => true,
    //         'message' => 'Attendance recorded successfully',
    //         'attendance' => $attendance->load('employee')
    //     ]);
    // }

    public function store(Request $request)
    {
        $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'date' => 'required|date',
            'check_in' => 'required|date_format:H:i',
            'check_out' => 'required|date_format:H:i',
        ]);

        $existing = Attendance::where('employee_id', $request->employee_id)
            ->whereDate('date', $request->date)
            ->first();

        if ($existing) {
            return response()->json([
                'success' => false,
                'message' => 'Attendance already exists for this date'
            ], 400);
        }

        try {
            $settings = BusinessSetting::current();

            $attendanceStatus = 'present';
            $checkInTime = $request->check_in;
            $lateMinutes = 0;
            $lateFee = 0;

            if (
                $settings &&
                $settings->auto_late_calculation &&
                $checkInTime
            ) {
                $officeStart = Carbon::parse($settings->office_start_time);
                $checkIn = Carbon::parse($checkInTime);

                $diffMinutes = $officeStart->diffInMinutes($checkIn, false);

                if ($diffMinutes > $settings->late_after_minutes) {
                    $attendanceStatus = 'late';
                    $lateMinutes = $diffMinutes;
                    $lateFee = $settings->late_fee_amount;
                }
            }

            $attendance = Attendance::create([
                'employee_id' => $request->employee_id,
                'date' => $request->date,
                'check_in' => $request->check_in,
                'check_out' => $request->check_out,

                // new fields
                'attendance_status' => $attendanceStatus,
                'check_in_time' => $checkInTime,
                'late_minutes' => $lateMinutes,
                'late_fee' => $lateFee,
                'created_by' => Auth::id(),
            ]);

            $attendance->refresh();

            return response()->json([
                'success' => true,
                'message' => 'Attendance recorded successfully',
                'attendance' => $attendance->load('employee')
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    // ✅ Monthly Report
    public function monthlyReport(Request $request)
    {
        $request->validate([
            'month' => 'required|integer|between:1,12',
            'year' => 'required|integer|min:2020'
        ]);

        $report = Employee::with([
            'attendances' => function ($q) use ($request) {
                $q->whereYear('date', $request->year)
                    ->whereMonth('date', $request->month);
            }
        ])->where('is_active', true)->get();

        $reportData = $report->map(function ($employee) use ($request) {
            $attendances = $employee->attendances;
            $presentDays = $attendances->whereIn('status', ['present', 'late'])->count();
            $lateDays = $attendances->where('status', 'late')->count();
            $absentDays = $attendances->where('status', 'absent')->count();
            $totalOvertime = $attendances->sum('overtime_hours');
            $totalLate = $attendances->sum('late_hours');

            // Get rank's min working days (adjust this based on your Employee model)
            $minWorkingDays = $employee->rank->min_working_days ?? 26; // default

            return [
                'user' => $employee->only(['id', 'name', 'employee_id']),
                'present_days' => $presentDays,
                'late_days' => $lateDays,
                'absent_days' => $absentDays,
                'total_overtime_hours' => $totalOvertime,
                'total_late_hours' => $totalLate,
                'overtime_amount' => round($totalOvertime * Attendance::OVERTIME_PER_HOUR_COST, 2),
                'late_amount' => round($totalLate * Attendance::LATE_PER_HOUR_COST, 2),
                'attendance_percentage' => $minWorkingDays > 0
                    ? round(($presentDays / $minWorkingDays) * 100, 2)
                    : 0
            ];
        });

        return Inertia::render('Attendance/MonthlyReport', [
            'report' => $reportData,
            'month' => $request->month,
            'year' => $request->year
        ]);
    }

    // ✅ Additional useful method: Get employee attendance summary
    public function getEmployeeSummary($employeeId)
    {
        $employee = Employee::with(['attendances' => function ($q) {
            $q->orderBy('date', 'desc')->take(30);
        }])->findOrFail($employeeId);

        $summary = [
            'employee' => $employee,
            'total_present' => $employee->attendances->whereIn('status', ['present', 'late'])->count(),
            'total_late' => $employee->attendances->where('status', 'late')->count(),
            'total_absent' => $employee->attendances->where('status', 'absent')->count(),
            'total_overtime_hours' => $employee->attendances->sum('overtime_hours'),
            'total_late_hours' => $employee->attendances->sum('late_hours'),
            'recent_attendance' => $employee->attendances->take(10)->map(function ($att) {
                return [
                    'date' => $att->formatted_date,
                    'check_in' => $att->formatted_check_in,
                    'check_out' => $att->formatted_check_out,
                    'status' => $att->status,
                    'late_hours' => $att->late_hours,
                    'overtime_hours' => $att->overtime_hours,
                    'total_hours' => $att->total_hours
                ];
            })
        ];

        return response()->json([
            'success' => true,
            'data' => $summary
        ]);
    }
    public function resumeShift(Request $request)
{
    try {
        $request->validate([
            'employee_id' => 'required|exists:employees,id'
        ]);

        $today = Carbon::now('Asia/Dhaka')->format('Y-m-d');

        $attendance = Attendance::where('employee_id', $request->employee_id)
            ->whereDate('date', $today)
            ->first();

        if (!$attendance) {
            return response()->json([
                'success' => false,
                'message' => 'No attendance found for today'
            ], 400);
        }

        if (!$attendance->check_out) {
            return response()->json([
                'success' => false,
                'message' => 'Shift is already active'
            ], 400);
        }

        $attendance->check_out = null;
        $attendance->save();

        return response()->json([
            'success' => true,
            'message' => 'Shift resumed successfully',
            'attendance' => $attendance
        ]);

    } catch (\Exception $e) {
        Log::error('Resume shift error: ' . $e->getMessage());

        return response()->json([
            'success' => false,
            'message' => 'Server error: ' . $e->getMessage()
        ], 500);
    }
}
}
