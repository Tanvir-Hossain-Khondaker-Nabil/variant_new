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
        Schema::create('loan_schedules', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('loan_id');
            $table->integer('installment_no');
            $table->date('due_date');

            $table->decimal('opening_balance', 14, 2)->default(0);
            $table->decimal('principal_due', 14, 2)->default(0);
            $table->decimal('interest_due', 14, 2)->default(0);
            $table->decimal('penalty_due', 14, 2)->default(0);
            $table->decimal('total_due', 14, 2)->default(0);

            $table->decimal('paid_amount', 14, 2)->default(0);
            $table->decimal('principal_paid', 14, 2)->default(0);
            $table->decimal('interest_paid', 14, 2)->default(0);
            $table->decimal('penalty_paid', 14, 2)->default(0);

            $table->enum('status', ['pending', 'partial', 'paid', 'overdue'])->default('pending');
            $table->date('paid_date')->nullable();
            $table->timestamps();

            $table->unique(['loan_id', 'installment_no']);
            $table->index(['loan_id', 'status']);
            $table->index(['due_date', 'status']);
            $table->foreign('loan_id')->references('id')->on('loans')->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('loan_schedules');
    }
};
