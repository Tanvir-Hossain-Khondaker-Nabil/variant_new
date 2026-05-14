<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('accounts')) {
            Schema::table('accounts', function (Blueprint $table) {
                if (!Schema::hasColumn('accounts', 'is_petty_cash')) {
                    $table->boolean('is_petty_cash')
                        ->default(false)
                        ->after('current_balance');
                }

                if (!Schema::hasColumn('accounts', 'is_locked')) {
                    $table->boolean('is_locked')
                        ->default(false)
                        ->after('is_petty_cash');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('accounts')) {
            Schema::table('accounts', function (Blueprint $table) {
                if (Schema::hasColumn('accounts', 'is_locked')) {
                    $table->dropColumn('is_locked');
                }

                if (Schema::hasColumn('accounts', 'is_petty_cash')) {
                    $table->dropColumn('is_petty_cash');
                }
            });
        }
    }
};