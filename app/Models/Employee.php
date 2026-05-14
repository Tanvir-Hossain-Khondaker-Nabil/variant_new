<?php
// app/Models/Employee.php

namespace App\Models;

use App\Scopes\UserScope;
use App\Scopes\OutletScope;
use Illuminate\Support\Facades\Auth;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Employee extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'email',
        'employee_id',
        'rank_id',
        'joining_date',
        'current_salary',
        'basic_salary',
        'house_rent',
        'medical_allowance',
        'transport_allowance',
        'other_allowance',
        'provident_fund_percentage',
        'is_active',
        'created_by',
        'outlet_id',
        'owner_id'
    ];

    protected $casts = [
        'joining_date' => 'date',
        'current_salary' => 'decimal:2',
        'basic_salary' => 'decimal:2',
        'house_rent' => 'decimal:2',
        'medical_allowance' => 'decimal:2',
        'transport_allowance' => 'decimal:2',
        'other_allowance' => 'decimal:2',
        'provident_fund_percentage' => 'decimal:2',
        'is_active' => 'boolean'
    ];

    use BelongsToTenant;

    // Relationships
    public function rank()
    {
        return $this->belongsTo(Rank::class);
    }

    public function attendances()
    {
        return $this->hasMany(Attendance::class);
    }

    public function salaries()
    {
        return $this->hasMany(Salary::class);
    }

    public function providentFunds()
    {
        return $this->hasMany(ProvidentFund::class);
    }

    public function leaves()
    {
        return $this->hasMany(Leave::class);
    }

    public function awards()
    {
        return $this->hasMany(EmployeeAward::class);
    }

    public function salaryAdvances()
{
    return $this->hasMany(EmployeeSalaryAdvance::class);
}

    // Accessors
    public function getFormattedSalaryAttribute()
    {
        return '৳' . number_format($this->current_salary, 2);
    }

    public function getTotalAllowanceAttribute()
    {
        return $this->house_rent + 
               $this->medical_allowance + 
               $this->transport_allowance + 
               $this->other_allowance;
    }

    public function getGrossSalaryAttribute()
    {
        return $this->basic_salary + $this->total_allowance;
    }

    public function getProvidentFundAmountAttribute()
    {
        return ($this->basic_salary * $this->provident_fund_percentage) / 100;
    }

    public function getFormattedJoiningDateAttribute()
    {
        return $this->joining_date ? $this->joining_date->format('d M, Y') : 'N/A';
    }
}