<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void {
        Schema::create('pickup_hold_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pickup_hold_id')->constrained('pickup_holds')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products')->restrictOnDelete();
            $table->foreignId('variant_id')->nullable()->constrained('variants')->nullOnDelete();
            $table->foreignId('warehouse_id')->nullable()->constrained('warehouses')->nullOnDelete();
            $table->foreignId('stock_id')->nullable()->constrained('stocks')->nullOnDelete();
            $table->string('unit')->default('piece');
            $table->decimal('quantity', 15, 4)->default(0);
            $table->decimal('base_quantity', 15, 4)->default(0);
            $table->decimal('remaining_quantity', 15, 4)->default(0);
            $table->decimal('sold_quantity', 15, 4)->default(0);
            $table->decimal('returned_quantity', 15, 4)->default(0);
            $table->decimal('unit_price', 15, 4)->default(0);
            $table->decimal('sale_price', 15, 4)->default(0);
            $table->decimal('total_price', 15, 4)->default(0);
            $table->enum('status', ['active','partial','sold','returned','completed','cancelled'])->default('active');
            $table->foreignId('sale_id')->nullable()->constrained('sales')->nullOnDelete();
            $table->foreignId('purchase_id')->nullable()->constrained('purchases')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedBigInteger('outlet_id')->nullable();
            $table->unsignedBigInteger('owner_id')->nullable();
            $table->timestamps();
            $table->index(['pickup_hold_id','status']);
            $table->index(['product_id','variant_id']);
        });
    }
    public function down(): void { Schema::dropIfExists('pickup_hold_items'); }
};
