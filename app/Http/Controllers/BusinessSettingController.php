<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\BusinessSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class BusinessSettingController extends Controller
{
    public function edit()
    {
        $settings = BusinessSetting::current()->load('pettyCashAccount');

        $accounts = Account::active()
            ->orderBy('name')
            ->get(['id', 'name', 'type', 'current_balance']);

        return Inertia::render('BusinessSettings/Edit', [
            'settings' => $settings,
            'accounts' => $accounts,
        ]);
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'office_start_time' => ['required', 'date_format:H:i'],
            'office_end_time' => ['required', 'date_format:H:i'],
            'late_after_minutes' => ['required', 'integer', 'min:0', 'max:1440'],
            'late_fee_amount' => ['required', 'numeric', 'min:0'],
            'petty_cash_account_id' => ['nullable', 'exists:accounts,id'],
            'salary_advance_adjustment' => ['required', 'boolean'],
            'auto_late_calculation' => ['required', 'boolean'],
        ]);

       DB::transaction(function () use ($validated) {
    $settings = BusinessSetting::current();

    $oldPettyCashAccountId = $settings->petty_cash_account_id;
    $newPettyCashAccountId = $validated['petty_cash_account_id'] ?? null;

    $settings->update([
        'office_start_time' => $validated['office_start_time'] . ':00',
        'office_end_time' => $validated['office_end_time'] . ':00',
        'late_after_minutes' => $validated['late_after_minutes'],
        'late_fee_amount' => $validated['late_fee_amount'],
        'petty_cash_account_id' => $newPettyCashAccountId,
        'salary_advance_adjustment' => $validated['salary_advance_adjustment'],
        'auto_late_calculation' => $validated['auto_late_calculation'],
        'is_active' => true,
    ]);

    if ($oldPettyCashAccountId && $oldPettyCashAccountId != $newPettyCashAccountId) {
        Account::where('id', $oldPettyCashAccountId)->update([
            'is_petty_cash' => false,
            'is_locked' => false,
        ]);
    }

    if ($newPettyCashAccountId) {
        Account::where('id', $newPettyCashAccountId)->update([
            'is_petty_cash' => true,
            'is_locked' => true,
        ]);
    }
});

        return back()->with('success', 'Business settings updated successfully.');
    }
}