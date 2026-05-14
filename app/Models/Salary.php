<?php
// app/Models/Salary.php

namespace App\Models;

use App\Scopes\UserScope;
use App\Scopes\OutletScope;
use Illuminate\Support\Facades\Auth;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Salary extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'month',
        'year',
        'basic_salary',
        'house_rent',
        'medical_allowance',
        'transport_allowance',
        'other_allowance',
        'total_allowance',
        // Bonuses
        'eid_bonus',
        'festival_bonus', 
        'performance_bonus',
        'other_bonus',
        'total_bonus',
        // Other earnings
        'commission',
        'overtime_amount',
        // Deductions
        'late_deduction',
        'absent_deduction',
        'tax_deduction',
        'provident_fund',
        'other_deductions',
        'total_deductions',
        // Final amounts
        'gross_salary',
        'net_salary',
        // Status
        'status',
        'payment_method',
        'transaction_id',
        'payment_date',
        'notes',
        // Attendance summary
        'present_days',
        'absent_days',
        'leave_days',
        'late_hours',
        'overtime_hours',
        'working_days',
        'created_by',
        'outlet_id',
        'owner_id',
        'advance_deduction',
'late_fee_deduction',
'final_salary',
    ];

    protected $casts = [
        'basic_salary' => 'decimal:2',
        'house_rent' => 'decimal:2',
        'medical_allowance' => 'decimal:2',
        'transport_allowance' => 'decimal:2',
        'other_allowance' => 'decimal:2',
        'total_allowance' => 'decimal:2',
        'eid_bonus' => 'decimal:2',
        'festival_bonus' => 'decimal:2',
        'performance_bonus' => 'decimal:2',
        'other_bonus' => 'decimal:2',
        'total_bonus' => 'decimal:2',
        'commission' => 'decimal:2',
        'overtime_amount' => 'decimal:2',
        'late_deduction' => 'decimal:2',
        'absent_deduction' => 'decimal:2',
        'tax_deduction' => 'decimal:2',
        'provident_fund' => 'decimal:2',
        'other_deductions' => 'decimal:2',
        'total_deductions' => 'decimal:2',
        'gross_salary' => 'decimal:2',
        'net_salary' => 'decimal:2',
        'payment_date' => 'date',
        'present_days' => 'integer',
        'absent_days' => 'integer',
        'leave_days' => 'integer',
        'late_hours' => 'decimal:2',
        'overtime_hours' => 'decimal:2',
        'working_days' => 'integer',
        'advance_deduction' => 'decimal:2',
'late_fee_deduction' => 'decimal:2',
'final_salary' => 'decimal:2',
    ];

    use BelongsToTenant;

    public function employee()
    {
        return $this->belongsTo(Employee::class, 'employee_id');
    }

    // Calculate gross salary
    public function calculateGrossSalary()
    {
        return $this->basic_salary +
               $this->total_allowance +
               ($this->total_bonus ?? 0) +
               ($this->commission ?? 0) +
               ($this->overtime_amount ?? 0);
    }

    // Calculate total deductions
    public function calculateTotalDeductions()
    {
        return ($this->late_deduction ?? 0) +
               ($this->absent_deduction ?? 0) +
               ($this->tax_deduction ?? 0) +
               ($this->provident_fund ?? 0) +
               ($this->other_deductions ?? 0);
    }

    // Calculate net salary
    public function calculateNetSalary()
    {
        $gross = $this->calculateGrossSalary();
        $deductions = $this->calculateTotalDeductions();
        return $gross - $deductions;
    }

    // Accessors
    public function getMonthNameAttribute()
    {
        $months = [
            1 => 'January', 2 => 'February', 3 => 'March', 4 => 'April',
            5 => 'May', 6 => 'June', 7 => 'July', 8 => 'August',
            9 => 'September', 10 => 'October', 11 => 'November', 12 => 'December'
        ];
        return $months[$this->month] ?? 'Unknown';
    }

    public function getFormattedNetSalaryAttribute()
    {
        return '৳' . number_format($this->net_salary, 2);
    }

    public function getFormattedGrossSalaryAttribute()
    {
        return '৳' . number_format($this->gross_salary, 2);
    }

    public function getAttendancePercentageAttribute()
    {
        if ($this->working_days > 0) {
            return round(($this->present_days / $this->working_days) * 100, 2);
        }
        return 0;
    }

    // Scopes
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }
    
    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }
    
    public function scopePaid($query)
    {
        return $query->where('status', 'paid');
    }

    // Automatically calculate on save
    protected static function boot()
    {
        parent::boot();

        static::saving(function ($salary) {
            // Calculate totals
            $salary->total_allowance = ($salary->house_rent ?? 0) + 
                                      ($salary->medical_allowance ?? 0) + 
                                      ($salary->transport_allowance ?? 0) + 
                                      ($salary->other_allowance ?? 0);
            
            $salary->total_bonus = ($salary->eid_bonus ?? 0) + 
                                  ($salary->festival_bonus ?? 0) + 
                                  ($salary->performance_bonus ?? 0) + 
                                  ($salary->other_bonus ?? 0);
            
            $salary->total_deductions = ($salary->late_deduction ?? 0) + 
                                       ($salary->absent_deduction ?? 0) + 
                                       ($salary->tax_deduction ?? 0) + 
                                       ($salary->provident_fund ?? 0) + 
                                       ($salary->other_deductions ?? 0);
            
            // Calculate final amounts
            $salary->gross_salary = $salary->calculateGrossSalary();
            $salary->net_salary = $salary->calculateNetSalary();
        });
    }
}