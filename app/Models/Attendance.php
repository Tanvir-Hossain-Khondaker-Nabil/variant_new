<?php
namespace App\Models;

use Carbon\Carbon;
use App\Scopes\UserScope;
use App\Scopes\OutletScope;
use Illuminate\Support\Facades\Auth;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Support\Facades\Log;

class Attendance extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'date',
        'check_in',
        'check_out',
        'late_hours',
        'overtime_hours',
        'status',
        'notes',
        'created_by',
        'outlet_id',
        'owner_id',
        'attendance_status',
'check_in_time',
'late_minutes',
'late_fee',
    ];

    protected $casts = [
        'date' => 'date:Y-m-d',
        'late_hours' => 'decimal:2',
        'overtime_hours' => 'decimal:2',
        'late_fee' => 'decimal:2',
    ];

    protected $appends = [
        'formatted_check_in',
        'formatted_check_out',
        'formatted_date',
        'check_in_time',
        'check_out_time',
        'late_amount',
        'overtime_amount',
        'total_hours'
    ];

    // ✅ বাংলাদেশের সময় অনুযায়ী স্ট্যান্ডার্ড সময়
    const STANDARD_START_TIME = '09:00'; // সকাল ৯টা
    const STANDARD_END_TIME = '17:00';   // বিকাল ৫টা
    const LATE_PER_HOUR_COST = 100;
    const OVERTIME_PER_HOUR_COST = 100;

    use BelongsToTenant;

    public function employee()
    {
        return $this->belongsTo(Employee::class, 'employee_id');
    }

    // ✅ Calculate Late Hours (বাংলাদেশ টাইম অনুযায়ী)
    public function calculateLateHours()
    {
        if (!$this->check_in || empty(trim($this->check_in))) {
            return 0;
        }

        try {
            // সময়টি নিন (হতে পারে 07:34 বা 07:34:00)
            $checkInTime = trim($this->check_in);

            // শুধু ঘন্টা এবং মিনিট নিন (সেকেন্ড বাদ দিন যদি থাকে)
            $checkInTime = preg_replace('/:\d{2}$/', '', $checkInTime);

            // সময় তুলনা
            $checkInHour = (int) substr($checkInTime, 0, 2);
            $checkInMinute = (int) substr($checkInTime, 3, 2);

            $standardHour = (int) substr(self::STANDARD_START_TIME, 0, 2); // 9
            $standardMinute = (int) substr(self::STANDARD_START_TIME, 3, 2); // 0

            // মিনিটে কনভার্ট করে তুলনা
            $checkInTotalMinutes = ($checkInHour * 60) + $checkInMinute;
            $standardTotalMinutes = ($standardHour * 60) + $standardMinute;

            if ($checkInTotalMinutes > $standardTotalMinutes) {
                $lateMinutes = $checkInTotalMinutes - $standardTotalMinutes;
                $lateHours = $lateMinutes / 60;
                return round($lateHours, 2);
            }

            return 0;

        } catch (\Exception $e) {
            Log::error('Late calculation error: ' . $e->getMessage(), [
                'check_in' => $this->check_in,
                'employee_id' => $this->employee_id
            ]);
            return 0;
        }
    }

    // ✅ Calculate Overtime Hours (বাংলাদেশ টাইম অনুযায়ী)
    public function calculateOvertimeHours()
    {
        if (!$this->check_out || empty(trim($this->check_out))) {
            return 0;
        }

        try {
            $checkOutTime = trim($this->check_out);
            $checkOutTime = preg_replace('/:\d{2}$/', '', $checkOutTime);

            $checkOutHour = (int) substr($checkOutTime, 0, 2);
            $checkOutMinute = (int) substr($checkOutTime, 3, 2);

            $standardEndHour = (int) substr(self::STANDARD_END_TIME, 0, 2); // 17
            $standardEndMinute = (int) substr(self::STANDARD_END_TIME, 3, 2); // 0

            $checkOutTotalMinutes = ($checkOutHour * 60) + $checkOutMinute;
            $standardEndTotalMinutes = ($standardEndHour * 60) + $standardEndMinute;

            if ($checkOutTotalMinutes > $standardEndTotalMinutes) {
                $overtimeMinutes = $checkOutTotalMinutes - $standardEndTotalMinutes;
                $overtimeHours = $overtimeMinutes / 60;
                return round($overtimeHours, 2);
            }

            return 0;

        } catch (\Exception $e) {
            Log::error('Overtime calculation error: ' . $e->getMessage(), [
                'check_out' => $this->check_out,
                'employee_id' => $this->employee_id
            ]);
            return 0;
        }
    }

    // ✅ Automatically calculate on save
    protected static function boot()
    {
        parent::boot();

        static::saving(function ($attendance) {
            // সময়গুলো ক্লিন করুন
            if ($attendance->check_in) {
                $attendance->check_in = trim($attendance->check_in);
                $attendance->late_hours = $attendance->calculateLateHours();
                $attendance->status = $attendance->late_hours > 0 ? 'late' : 'present';
            }

            if ($attendance->check_out) {
                $attendance->check_out = trim($attendance->check_out);
                $attendance->overtime_hours = $attendance->calculateOvertimeHours();
            }
        });
    }

    // ✅ Accessors (বাংলাদেশ টাইম ফরম্যাট)
    public function getFormattedCheckInAttribute()
    {
        if (!$this->check_in) {
            return '-';
        }

        try {
            // সময়টি নিন
            $time = trim($this->check_in);

            // শুধু ঘন্টা-মিনিট নিন
            $time = preg_replace('/:\d{2}$/', '', $time);

            list($hour, $minute) = explode(':', $time);

            // 24-hour থেকে 12-hour format এ কনভার্ট
            $hour = (int) $hour;
            $am_pm = $hour >= 12 ? 'PM' : 'AM';
            $hour12 = $hour % 12;
            if ($hour12 == 0)
                $hour12 = 12;

            return sprintf('%02d:%02d %s', $hour12, $minute, $am_pm);

        } catch (\Exception $e) {
            return $this->check_in;
        }
    }

    public function getFormattedCheckOutAttribute()
    {
        if (!$this->check_out) {
            return '-';
        }

        try {
            $time = trim($this->check_out);
            $time = preg_replace('/:\d{2}$/', '', $time);

            list($hour, $minute) = explode(':', $time);

            $hour = (int) $hour;
            $am_pm = $hour >= 12 ? 'PM' : 'AM';
            $hour12 = $hour % 12;
            if ($hour12 == 0)
                $hour12 = 12;

            return sprintf('%02d:%02d %s', $hour12, $minute, $am_pm);

        } catch (\Exception $e) {
            return $this->check_out;
        }
    }

    public function getFormattedDateAttribute()
    {
        // বাংলাদেশের তারিখ ফরম্যাট
        return Carbon::parse($this->date)->format('d M, Y');
    }

    public function getCheckInTimeAttribute()
    {
        if (!$this->check_in) {
            return null;
        }

        try {
            $time = trim($this->check_in);
            $time = preg_replace('/:\d{2}$/', '', $time);
            return $time . ':00'; // সেকেন্ড যোগ করে 24-hour format
        } catch (\Exception $e) {
            return $this->check_in;
        }
    }

    public function getCheckOutTimeAttribute()
    {
        if (!$this->check_out) {
            return null;
        }

        try {
            $time = trim($this->check_out);
            $time = preg_replace('/:\d{2}$/', '', $time);
            return $time . ':00';
        } catch (\Exception $e) {
            return $this->check_out;
        }
    }

    public function getLateAmountAttribute()
    {
        return round($this->late_hours * self::LATE_PER_HOUR_COST, 2);
    }

    public function getOvertimeAmountAttribute()
    {
        return round($this->overtime_hours * self::OVERTIME_PER_HOUR_COST, 2);
    }

    public function getTotalHoursAttribute()
    {
        if (!$this->check_in || !$this->check_out) {
            return 0;
        }

        try {
            $checkInTime = trim($this->check_in);
            $checkOutTime = trim($this->check_out);

            // সময়গুলো থেকে ঘন্টা এবং মিনিট আলাদা করুন
            $checkInTime = preg_replace('/:\d{2}$/', '', $checkInTime);
            $checkOutTime = preg_replace('/:\d{2}$/', '', $checkOutTime);

            list($inHour, $inMinute) = explode(':', $checkInTime);
            list($outHour, $outMinute) = explode(':', $checkOutTime);

            $inTotalMinutes = ((int) $inHour * 60) + (int) $inMinute;
            $outTotalMinutes = ((int) $outHour * 60) + (int) $outMinute;

            // চেক-আউট চেক-ইনের আগে হলে (পরের দিন ধরে নিন)
            if ($outTotalMinutes < $inTotalMinutes) {
                $outTotalMinutes += (24 * 60); // 24 ঘন্টা যোগ করুন
            }

            $totalMinutes = $outTotalMinutes - $inTotalMinutes;
            $totalHours = $totalMinutes / 60;

            return round($totalHours, 2);

        } catch (\Exception $e) {
            Log::error('Total hours calculation error: ' . $e->getMessage());
            return 0;
        }
    }

    public function isLate()
    {
        return $this->late_hours > 0;
    }

    public function hasOvertime()
    {
        return $this->overtime_hours > 0;
    }
}