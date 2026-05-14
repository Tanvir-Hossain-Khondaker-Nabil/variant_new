<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            if (!Schema::hasColumn('payments', 'reference_type')) {
                $table->string('reference_type')->nullable()->after('id');
            }

            if (!Schema::hasColumn('payments', 'reference_id')) {
                $table->unsignedBigInteger('reference_id')->nullable()->after('reference_type');
            }
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            if (Schema::hasColumn('payments', 'reference_id')) {
                $table->dropColumn('reference_id');
            }

            if (Schema::hasColumn('payments', 'reference_type')) {
                $table->dropColumn('reference_type');
            }
        });
    }
};