<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasTable('stock_identifiers')) {
            Schema::create('stock_identifiers', function (Blueprint $table) {
                $table->id();
                $table->foreignId('stock_id')->constrained()->cascadeOnDelete();
                $table->foreignId('purchase_item_id')->nullable()->constrained()->nullOnDelete();
                $table->foreignId('product_id')->constrained()->cascadeOnDelete();
                $table->foreignId('variant_id')->nullable()->constrained()->nullOnDelete();

                $table->enum('identifier_type', ['imei', 'serial']);
                $table->string('identifier_value')->unique();

                $table->enum('status', ['available', 'sold', 'returned', 'damaged'])->default('available');

                $table->unsignedBigInteger('sale_id')->nullable();
                $table->unsignedBigInteger('sale_item_id')->nullable();
                $table->timestamp('sold_at')->nullable();

                $table->unsignedBigInteger('created_by')->nullable();
                $table->unsignedBigInteger('outlet_id')->nullable();
                $table->unsignedBigInteger('owner_id')->nullable();

                $table->timestamps();

                $table->index(['product_id', 'variant_id', 'status']);
                $table->index(['identifier_type', 'identifier_value']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stock_identifiers');
    }
};
