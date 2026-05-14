<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('expenses', function (Blueprint $table) {
            if (!Schema::hasColumn('expenses', 'cost_type')) {
                $table->string('cost_type')->default('daily')->after('category_id');
            }

            if (!Schema::hasColumn('expenses', 'is_petty_cash_expense')) {
                $table->boolean('is_petty_cash_expense')->default(false)->after('cost_type');
            }

            if (!Schema::hasColumn('expenses', 'payment_source')) {
                $table->string('payment_source')->nullable()->after('is_petty_cash_expense');
            }
        });
    }

    public function down(): void
    {
        Schema::table('expenses', function (Blueprint $table) {
            if (Schema::hasColumn('expenses', 'payment_source')) {
                $table->dropColumn('payment_source');
            }

            if (Schema::hasColumn('expenses', 'is_petty_cash_expense')) {
                $table->dropColumn('is_petty_cash_expense');
            }

            if (Schema::hasColumn('expenses', 'cost_type')) {
                $table->dropColumn('cost_type');
            }
        });
    }
};