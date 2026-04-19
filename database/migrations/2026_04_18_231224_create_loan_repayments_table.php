<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('loan_repayments', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('loan_id');
            $table->unsignedBigInteger('loan_schedule_id')->nullable();

            $table->date('payment_date');
            $table->decimal('amount', 14, 2);

            $table->decimal('principal_amount', 14, 2)->default(0);
            $table->decimal('interest_amount', 14, 2)->default(0);
            $table->decimal('penalty_amount', 14, 2)->default(0);

            $table->enum('payment_method', ['cash', 'bank', 'mobile_banking', 'cheque'])->default('cash');
            $table->string('reference_no')->nullable();
            $table->text('note')->nullable();

            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();

            $table->index(['loan_id', 'payment_date']);
            $table->foreign('loan_id')->references('id')->on('loans')->cascadeOnDelete();
            $table->foreign('loan_schedule_id')->references('id')->on('loan_schedules')->nullOnDelete();
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('loan_repayments');
    }
};
