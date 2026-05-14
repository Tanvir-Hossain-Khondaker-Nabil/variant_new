<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('salaries', function (Blueprint $table) {
            if (!Schema::hasColumn('salaries', 'advance_deduction')) {
                $table->decimal('advance_deduction', 12, 2)
                    ->default(0)
                    ->after('late_deduction');
            }

            if (!Schema::hasColumn('salaries', 'late_fee_deduction')) {
                $table->decimal('late_fee_deduction', 12, 2)
                    ->default(0)
                    ->after('advance_deduction');
            }

            if (!Schema::hasColumn('salaries', 'final_salary')) {
                $table->decimal('final_salary', 12, 2)
                    ->default(0)
                    ->after('net_salary');
            }
        });
    }

    public function down(): void
    {
        Schema::table('salaries', function (Blueprint $table) {
            if (Schema::hasColumn('salaries', 'final_salary')) {
                $table->dropColumn('final_salary');
            }

            if (Schema::hasColumn('salaries', 'late_fee_deduction')) {
                $table->dropColumn('late_fee_deduction');
            }

            if (Schema::hasColumn('salaries', 'advance_deduction')) {
                $table->dropColumn('advance_deduction');
            }
        });
    }
};