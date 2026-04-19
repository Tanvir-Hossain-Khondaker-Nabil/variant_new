<?php

return [
    'title' => 'Products',
    'subtitle' => 'Manage your all products from here.',
    'product_list' => 'Product List',
    'add_new_product' => 'Add New Product',
    'search_placeholder' => 'Search products...',
    'no_products_found' => 'No products found!',
    'add_new' => 'Add New',
    'edit' => 'Edit',
    'search' => 'Search',
    'end_date' => 'End Date',
    'start_date' => 'Start Date',
    'download_report' => 'Download Report',
    'csv_format' => 'Csv Format',
    'apply_filters' => 'Apply Filter',
    'excel_format' => 'Excel Format',
    'pdf_format' => 'Pdf Format',
    'delete' => 'Delete',
    'delete_confirmation' => 'Are you sure you want to delete this product? This action cannot be undone.',
    'photo' => 'Photo',
    'preview' => 'Preview',
    'no_photo_selected' => 'No Photo Selected',
    'photo_tip' => 'Upload a product photo',
    'from_brand' => 'From Brand',
    'generate' => 'Generate',
    'code_tip' => 'Generate a unique product code',
    'barcodes' => 'Barcodes',
    'warranty' => 'Warranty',
    'months' => 'months',
    'filter_options' => 'Filter Options',
    'filters' => 'Filter',
    'all_categories' => 'All Categories',
    'all_brands' => 'All Brands',
    'clear_filters' => 'Clear Filters',

    // Table headers
    'product_code' => 'Product Code',
    'product_name' => 'Product Name',
    'category' => 'Category',
    'brand' => 'Brand',
    'attributes' => 'Attribute',
    'total_stock' => 'Total Stock',
    'variants' => 'Variants',
    'actions' => 'Actions',
    'code_auto_info' => 'Code Auto Info',
    'last_generated' => 'Last Generated',
    'regenerate' => 'Re Generated',
    // Product details
    'default_variant' => 'Default Variant',
    'units' => 'units',
    'attribute' => 'Attribute',
    'attributes_plural' => 'Attributes',
    'stock' => 'Stock',
    'price' => 'Price',
    'description' => 'Description',
    'not_available' => 'N/A',
    'from_brand' => 'Brand',
    'generate' => 'Generate',
    'code_tip' => 'Code Tip',
    'no_photo_selected' => 'No photo selected',
    'preview' => 'Preview',
    'photo_tip' => 'Photo Tip',
    'photo' => 'Photo',

    // Status messages
    'product_added' => 'Product added successfully!',
    'product_updated' => 'Product updated successfully!',
    'product_deleted' => 'Product deleted successfully!',
    'from_title' => 'Add New Product',
    'update_title' => 'Update Product',
    'from_subtitle' => 'Add or update product with variants',

    // Form fields
    'from_product_name' => 'Product Name',
    'from_category' => 'Category',
    'from_product_code' => 'Product Code',
    'from_description' => 'Description',
    'pick_category' => '--Pick a category--',
    'enter_product_name' => 'Enter product name',
    'enter_product_code' => 'Enter product code',
    'enter_description' => 'Enter product description',
    'active_filters' => 'Active Filters',
    'clear' => 'Clear',
    'active' => 'Active',

    // Brand field
    'pick_brand' => '--Pick a Brand--',

    // Attributes section
    'product_attributes' => 'Product Attribute',
    'select_attributes' => 'Select Attributes',
    'hide_attributes' => 'Hide Attributes',
    'select_attribute_values' => 'Select Attribute Values',
    'selected_attributes' => 'Selected Attributes',
    'apply_attributes' => 'Apply Attributes',
    'selected_count' => 'Selected',

    // Variants section
    'product_variants' => 'Product Variants',
    'variant' => 'Variant',
    'no_attributes_selected' => 'No attribute selected',
    'variant_attributes' => 'Variant attribute',
    'delete_variant' => 'Delete variant',
    'variant_pricing' => 'Variant Pricing',
    'add_variant' => 'Add Variant',
    'variant_count' => 'variant(s)',

    // Buttons
    'save_product' => 'Save Product',
    'update_product' => 'Update Product',
    'saving' => 'Saving...',

    // Validation messages
    'product_name_required' => 'Product name is required',
    'category_required' => 'Category is required',
    'product_code_required' => 'Product code is required',
    'variants_required' => 'At least one variant must have attributes selected',
    'variant_attributes_required' => 'Please select attributes for this variant',
    'fix_validation_errors' => 'Please fix the validation errors',
    'something_went_wrong' => 'Something went wrong. Please try again!',
    'duplicate_variants' => 'Duplicate attribute combinations found',
    'invalid_variant_attributes' => 'Please check variant attributes',
    'at_least_one_variant' => 'Please add at least one variant',

    // Success messages
    'product_added_success' => 'Product added successfully!',
    'product_updated_success' => 'Product updated successfully!',

    // Product Type
    'product_type' => 'Product Type',
    'regular_product' => 'Regular Product',
    'in_house_product' => 'In-House Production',
    'regular_desc' => 'Purchase from supplier, needs stock management through purchase orders',
    'in_house_desc' => 'Internally produced, auto-stock management in In-House warehouse',

    // In-House Product Settings
    'in_house_settings' => 'In-House Production Settings',
    'production_cost' => 'Production Cost',
    'shadow_production_cost' => 'Shadow Production Cost',
    'sale_price' => 'Sale Price',
    'shadow_sale_price' => 'Shadow Sale Price',
    'initial_stock' => 'Initial Stock Quantity',
    'in_house_note' => 'Note: This product will be automatically added to "In-House Production" warehouse with the specified initial stock quantity. No purchase order needed. Stock will be managed internally.',
    'shadow_cost' => 'Shadow Cost',

    // Summary
    'summary' => 'Summary',
    'in_house_product_short' => 'In-House Product',

    // Additional validation
    'production_cost_required' => 'Production cost is required',
    'shadow_cost_required' => 'Shadow production cost is required',
    'sale_price_required' => 'Sale price is required',
    'shadow_sale_price_required' => 'Shadow sale price is required',
    'initial_stock_invalid' => 'Initial stock cannot be negative',

    // New keys for variant attribute management
    'edit_attributes' => 'Edit Attributes',
    'select_attributes_for' => 'Select Attributes for',
    'clear_attributes' => 'Clear Attributes',
    'done' => 'Done',

    // Unit Settings
    'unit_settings' => 'Unit Settings',
    'unit_type' => 'Unit Type',
    'default_unit' => 'Default Purchase Unit',
    'min_sale_unit' => 'Minimum Sale Unit',
    'allow_fractions' => 'Allow Fractional Sales',
    'select_min_sale_unit' => '-- Select --',
    'default_unit_help' => 'Default unit for purchasing this product',
    'min_sale_unit_help' => 'Smallest unit that can be sold. Cannot be larger than purchase unit',
    'fractions_help' => 'Allow decimal quantities (e.g., 1.5 kg, 0.75 liter)',
    'fractions_piece_help' => 'Not applicable for piece products',
    'min_sale_unit_piece_help' => 'For piece products, minimum sale unit is always "piece"',
    'unit_conversion_info' => 'Unit Conversion Information',
    'sale_note' => 'You can purchase in',
    'and_sell_in' => ' and sell in',
    'or_smaller' => ' or smaller units',

    // In-House Unit Settings
    'in_house_unit_settings' => 'In-House Production Unit Settings',
    'production_unit' => 'Production Unit',
    'sale_unit' => 'Sale Unit',
    'in_house_unit_help' => 'Production will be recorded in this unit',
    'in_house_sale_unit_help' => 'Customers can purchase in this unit',

    // Variant Unit Info
    'variant_unit_note' => 'Note for Variants:',
    'variant_unit_description' => 'All variants will use the same unit settings. Each variant\'s stock will be tracked in',
    'filtered_data_count' => 'Filtered Data Count',
    'sale_price_total' => 'Sale Price Total',

];