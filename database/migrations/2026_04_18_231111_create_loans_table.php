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
       Schema::create('loans', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('outlet_id')->nullable();
            $table->unsignedBigInteger('borrower_id');
            $table->string('code')->unique();

            $table->date('loan_date');
            $table->decimal('principal_amount', 14, 2);
            $table->decimal('interest_rate', 8, 2)->default(0); // yearly বা flat, নিচে type আছে
            $table->enum('interest_type', ['flat', 'reducing'])->default('flat');
            $table->integer('term_months');
            $table->enum('repayment_frequency', ['monthly', 'weekly', 'daily'])->default('monthly');

            $table->decimal('processing_fee', 14, 2)->default(0);
            $table->decimal('penalty_rate', 8, 2)->default(0); // per overdue installment বা percent logic later
            $table->decimal('approved_amount', 14, 2)->nullable();
            $table->decimal('disbursed_amount', 14, 2)->default(0);

            $table->decimal('total_interest', 14, 2)->default(0);
            $table->decimal('total_payable', 14, 2)->default(0);
            $table->decimal('installment_amount', 14, 2)->default(0);

            $table->decimal('paid_amount', 14, 2)->default(0);
            $table->decimal('penalty_amount', 14, 2)->default(0);
            $table->decimal('due_amount', 14, 2)->default(0);

            $table->enum('status', [
                'pending',
                'approved',
                'rejected',
                'disbursed',
                'active',
                'completed',
                'closed',
                'defaulted'
            ])->default('pending');

            $table->date('approved_date')->nullable();
            $table->date('disbursed_date')->nullable();
            $table->date('first_installment_date')->nullable();
            $table->date('maturity_date')->nullable();
            $table->date('closed_date')->nullable();

            $table->text('note')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();

            $table->index(['borrower_id', 'status']);
            $table->index(['created_by', 'status']);
            $table->foreign('borrower_id')->references('id')->on('borrowers')->cascadeOnDelete();
            $table->foreign('outlet_id')->references('id')->on('outlets')->nullOnDelete();
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('loans');
    }
};
