<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('systems')) {
            Schema::create('systems', function (Blueprint $table) {
                $table->id();
                $table->enum('status', ['active', 'inactive'])->default('active');
                $table->text('hold_reason')->nullable();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('systems');
    }
};