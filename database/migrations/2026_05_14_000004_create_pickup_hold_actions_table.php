<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void {
        Schema::create('pickup_hold_actions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pickup_hold_id')->constrained('pickup_holds')->cascadeOnDelete();
            $table->foreignId('pickup_hold_item_id')->constrained('pickup_hold_items')->cascadeOnDelete();
            $table->enum('action_type', ['return','sold']);
            $table->decimal('quantity', 15, 4)->default(0);
            $table->decimal('base_quantity', 15, 4)->default(0);
            $table->decimal('unit_price', 15, 4)->default(0);
            $table->decimal('total_price', 15, 4)->default(0);
            $table->foreignId('sale_id')->nullable()->constrained('sales')->nullOnDelete();
            $table->foreignId('sale_item_id')->nullable()->constrained('sale_items')->nullOnDelete();
            $table->foreignId('purchase_id')->nullable()->constrained('purchases')->nullOnDelete();
            $table->foreignId('purchase_item_id')->nullable()->constrained('purchase_items')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedBigInteger('outlet_id')->nullable();
            $table->unsignedBigInteger('owner_id')->nullable();
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('pickup_hold_actions'); }
};
