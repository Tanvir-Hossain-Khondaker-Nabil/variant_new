<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class PurchaseRequestStore extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'supplier_id' => ['required', 'exists:suppliers,id'],
            'warehouse_id' => ['required', 'exists:warehouses,id'],
            'purchase_date' => ['required', 'date'],
            'notes' => ['nullable', 'string'],
            'paid_amount' => ['nullable', 'numeric', 'min:0'],
            'payment_status' => ['required', 'string', 'in:paid,partial,unpaid,installment'],
            'payment_method' => ['nullable', 'string'],
            'account_id' => ['nullable', 'exists:accounts,id'],
            'txn_ref' => ['nullable', 'string', 'max:255'],
            'use_partial_payment' => ['nullable', 'boolean'],
            'adjust_from_advance' => ['nullable', 'boolean'],
            'manual_payment_override' => ['nullable', 'boolean'],
            'installment_duration' => ['nullable', 'integer', 'min:0'],
            'total_installments' => ['nullable', 'integer', 'min:0'],
            'transportation_cost' => ['nullable', 'numeric', 'min:0'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'exists:products,id'],
            'items.*.variant_id' => ['nullable', 'exists:variants,id'],
            'items.*.unit' => ['nullable', 'string', 'max:50'],
            'items.*.unit_quantity' => ['nullable', 'numeric', 'min:0.0001'],
            'items.*.quantity' => ['required', 'numeric', 'min:0.0001'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
            'items.*.sale_price' => ['required', 'numeric', 'min:0'],
            'items.*.total_price' => ['nullable', 'numeric', 'min:0'],
            'items.*.transportation_cost' => ['nullable', 'numeric', 'min:0'],
            'items.*.attributes' => ['nullable', 'array'],
            'items.*.attributes.*' => ['nullable', 'string', 'max:255'],
            'items.*.purchase_condition' => ['nullable', 'string', 'in:new,used'],
            'items.*.used_source' => ['nullable', 'string', 'in:sold_by_us,external'],
            'items.*.is_tracking_enabled' => ['nullable', 'boolean'],
            'items.*.tracking_type' => ['nullable', 'string', 'in:imei,serial'],
            'items.*.identifiers' => ['nullable', 'array'],
            'items.*.identifiers.*' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function messages(): array
    {
        return [
            'supplier_id.required' => 'Please select a supplier.',
            'supplier_id.exists' => 'Selected supplier is invalid.',
            'warehouse_id.required' => 'Please select a warehouse.',
            'warehouse_id.exists' => 'Selected warehouse is invalid.',
            'purchase_date.required' => 'Purchase date is required.',
            'purchase_date.date' => 'Purchase date must be a valid date.',
            'payment_status.required' => 'Payment status is required.',
            'payment_status.in' => 'Payment status must be paid, partial, unpaid, or installment.',
            'account_id.exists' => 'Selected account is invalid.',
            'items.required' => 'Please add at least one purchase item.',
            'items.array' => 'Purchase items must be an array.',
            'items.min' => 'Please add at least one purchase item.',
            'items.*.product_id.required' => 'Product is required for every item.',
            'items.*.product_id.exists' => 'Selected product is invalid.',
            'items.*.variant_id.exists' => 'Selected variant is invalid.',
            'items.*.quantity.required' => 'Quantity is required for every item.',
            'items.*.quantity.numeric' => 'Quantity must be a number.',
            'items.*.quantity.min' => 'Quantity must be greater than zero.',
            'items.*.unit_quantity.numeric' => 'Unit quantity must be a number.',
            'items.*.unit_quantity.min' => 'Unit quantity must be greater than zero.',
            'items.*.unit_price.required' => 'Unit price is required for every item.',
            'items.*.unit_price.numeric' => 'Unit price must be a number.',
            'items.*.unit_price.min' => 'Unit price cannot be negative.',
            'items.*.sale_price.required' => 'Sale price is required for every item.',
            'items.*.sale_price.numeric' => 'Sale price must be a number.',
            'items.*.sale_price.min' => 'Sale price cannot be negative.',
            'items.*.purchase_condition.in' => 'Purchase category must be new or used.',
            'items.*.used_source.in' => 'Used source must be sold by us or external.',
            'items.*.tracking_type.in' => 'Tracking type must be IMEI or Serial.',
        ];
    }
}