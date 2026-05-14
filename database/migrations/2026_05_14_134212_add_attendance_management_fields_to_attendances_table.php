<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attendances', function (Blueprint $table) {

            if (!Schema::hasColumn('attendances', 'attendance_status')) {
                $table->string('attendance_status')
                    ->default('present')
                    ->after('employee_id');
            }

            if (!Schema::hasColumn('attendances', 'check_in_time')) {
                $table->time('check_in_time')
                    ->nullable()
                    ->after('attendance_status');
            }

            if (!Schema::hasColumn('attendances', 'late_minutes')) {
                $table->integer('late_minutes')
                    ->default(0)
                    ->after('check_in_time');
            }

            if (!Schema::hasColumn('attendances', 'late_fee')) {
                $table->decimal('late_fee', 16, 2)
                    ->default(0)
                    ->after('late_minutes');
            }
        });
    }

    public function down(): void
    {
        Schema::table('attendances', function (Blueprint $table) {

            if (Schema::hasColumn('attendances', 'late_fee')) {
                $table->dropColumn('late_fee');
            }

            if (Schema::hasColumn('attendances', 'late_minutes')) {
                $table->dropColumn('late_minutes');
            }

            if (Schema::hasColumn('attendances', 'check_in_time')) {
                $table->dropColumn('check_in_time');
            }

            if (Schema::hasColumn('attendances', 'attendance_status')) {
                $table->dropColumn('attendance_status');
            }
        });
    }
};