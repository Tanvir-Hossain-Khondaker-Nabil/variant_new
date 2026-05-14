<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

<<<<<<< HEAD
return new class extends Migration {
    /**
     * Run the migrations.
     */
=======
return new class extends Migration
{
>>>>>>> bd8f30bc7a424a6f6ec8e2f857a04461f62fd01f
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