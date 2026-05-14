<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('business_settings')) {
            Schema::create('business_settings', function (Blueprint $table) {
                $table->id();

                $table->time('office_start_time')->default('10:00:00');
                $table->time('office_end_time')->default('18:00:00');
                $table->unsignedInteger('late_after_minutes')->default(30);
                $table->decimal('late_fee_amount', 12, 2)->default(0);

                $table->foreignId('petty_cash_account_id')
                    ->nullable()
                    ->constrained('accounts')
                    ->nullOnDelete();

                $table->boolean('salary_advance_adjustment')->default(true);
                $table->boolean('auto_late_calculation')->default(true);
                $table->boolean('is_active')->default(true);

                $table->foreignId('created_by')
                    ->nullable()
                    ->constrained('users')
                    ->nullOnDelete();

                $table->unsignedBigInteger('outlet_id')->nullable();
                $table->unsignedBigInteger('owner_id')->nullable();

                $table->timestamps();

                $table->unique(
                    ['owner_id', 'outlet_id'],
                    'business_settings_owner_outlet_unique'
                );
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('business_settings');
    }
};