<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void {
        Schema::create('pickup_holds', function (Blueprint $table) {
            $table->id();
            $table->string('hold_no')->unique();
            $table->foreignId('shop_id')->constrained('shops')->cascadeOnDelete();
            $table->enum('direction', ['outgoing','incoming']);
            $table->enum('status', ['active','partial','completed','cancelled'])->default('active');
            $table->date('hold_date')->nullable();
            $table->text('notes')->nullable();
            $table->decimal('total_quantity', 15, 4)->default(0);
            $table->decimal('remaining_quantity', 15, 4)->default(0);
            $table->decimal('sold_quantity', 15, 4)->default(0);
            $table->decimal('returned_quantity', 15, 4)->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedBigInteger('outlet_id')->nullable();
            $table->unsignedBigInteger('owner_id')->nullable();
            $table->timestamps();
            $table->index(['shop_id','direction','status']);
        });
    }
    public function down(): void { Schema::dropIfExists('pickup_holds'); }
};
