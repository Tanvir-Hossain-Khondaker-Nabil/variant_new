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
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('product_no');
            $table->string('photo')->nullable();
            $table->unsignedBigInteger('category_id')->nullable();
            $table->text('description')->nullable();

            $table->enum('product_type', ['regular', 'in_house'])->default('regular');
            $table->decimal('in_house_cost', 10, 2)->nullable();
            $table->decimal('in_house_shadow_cost', 10, 2)->nullable();
            $table->decimal('in_house_sale_price', 10, 2)->nullable();
            $table->decimal('in_house_shadow_sale_price', 10, 2)->nullable();
            $table->integer('in_house_initial_stock')->default(0);
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('brand_id')->nullable();
            $table->unsignedBigInteger('outlet_id');
            $table->unsignedBigInteger('owner_id')->nullable();
            $table->enum('type', ['global', 'local'])->default('global');

            // Warranty
            $table->boolean('has_warranty')->default(false);
            $table->integer('warranty_duration')->nullable(); // number
            $table->enum('warranty_duration_type', ['day', 'month', 'year'])->nullable();
            $table->text('warranty_terms')->nullable();


            $table->unsignedBigInteger('unit_id')->nullable();
            $table->string('unit_type')->default('piece');
            $table->string('default_unit')->default('piece');
            $table->boolean('is_fraction_allowed')->default(false);
            $table->string('min_sale_unit')->nullable();

            $table->boolean('is_tracking_enabled')->default(false)->after('warranty_terms');
            $table->enum('tracking_type', ['imei', 'serial'])->nullable()->after('is_tracking_enabled');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
