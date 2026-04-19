import React from 'react';
import { Link, useForm, router } from '@inertiajs/react';
import { ArrowLeft, Save, Wallet, Landmark, Smartphone } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import { useTranslation } from '../../hooks/useTranslation';

export default function AccountCreate() {
    const { t } = useTranslation();
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        type: 'cash',
        account_number: '',
        bank_name: '',
        mobile_provider: '',
        opening_balance: '0',
        note: '',
        is_default: false,
        is_active: true,
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('accounts.store'));
    };

    const accountTypes = [
        { value: 'cash', label: t('account.cash', 'Cash'), icon: Wallet },
        { value: 'bank', label: t('account.bank', 'Bank Account'), icon: Landmark },
        { value: 'mobile_banking', label: t('account.mobile_banking', 'Mobile Banking'), icon: Smartphone },
    ];

    return (
        <div className="bg-white rounded-box p-5">
            <PageHeader
                title={t('account.create_title', 'Create New Account')}
                subtitle={t('account.create_subtitle', 'Add a new bank, cash, or mobile account')}
            >
                <Link
                    href={route('accounts.index')}
                    className="btn btn-sm btn-ghost"
                >
                    <ArrowLeft size={16} />
                    {t('account.back', 'Back')}
                </Link>
            </PageHeader>

            <div className="max-w-2xl mx-auto">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Account Type Selection */}
                    <div>
                        <label className="label">
                            <span className="label-text font-bold">
                                {t('account.account_type', 'Account Type')}
                            </span>
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {accountTypes.map((type) => {
                                const Icon = type.icon;
                                return (
                                    <label
                                        key={type.value}
                                        className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${
                                            data.type === type.value
                                                ? 'border-red-600 bg-red-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="type"
                                            value={type.value}
                                            checked={data.type === type.value}
                                            onChange={(e) => setData('type', e.target.value)}
                                            className="hidden"
                                        />
                                        <div className="flex flex-col items-center gap-2">
                                            <Icon size={24} className={data.type === type.value ? 'text-red-600' : 'text-gray-400'} />
                                            <span className="font-bold">{type.label}</span>
                                        </div>
                                    </label>
                                );
                            })}
                        </div>
                        {errors.type && (
                            <p className="text-red-500 text-sm mt-1">{errors.type}</p>
                        )}
                    </div>

                    {/* Account Name */}
                    <div>
                        <label className="label">
                            <span className="label-text font-bold">
                                {t('account.name', 'Account Name')} *
                            </span>
                        </label>
                        <input
                            type="text"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            className="input input-bordered w-full"
                            placeholder={t('account.name_placeholder', 'e.g., Main Cash, DBBL Account, Bkash Agent')}
                            required
                        />
                        {errors.name && (
                            <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                        )}
                    </div>

                    {/* Account Number */}
                    <div>
                        <label className="label">
                            <span className="label-text font-bold">
                                {t('account.account_number', 'Account Number')}
                            </span>
                        </label>
                        <input
                            type="text"
                            value={data.account_number}
                            onChange={(e) => setData('account_number', e.target.value)}
                            className="input input-bordered w-full"
                            placeholder={t('account.account_number_placeholder', 'Account number (if applicable)')}
                        />
                    </div>

                    {/* Dynamic Fields Based on Type */}
                    {data.type === 'bank' && (
                        <div>
                            <label className="label">
                                <span className="label-text font-bold">
                                    {t('account.bank_name', 'Bank Name')} *
                                </span>
                            </label>
                            <input
                                type="text"
                                value={data.bank_name}
                                onChange={(e) => setData('bank_name', e.target.value)}
                                className="input input-bordered w-full"
                                placeholder={t('account.bank_name_placeholder', 'e.g., Dutch Bangla Bank, Islami Bank')}
                                required
                            />
                            {errors.bank_name && (
                                <p className="text-red-500 text-sm mt-1">{errors.bank_name}</p>
                            )}
                        </div>
                    )}

                    {data.type === 'mobile_banking' && (
                        <div>
                            <label className="label">
                                <span className="label-text font-bold">
                                    {t('account.mobile_provider', 'Mobile Provider')} *
                                </span>
                            </label>
                            <select
                                value={data.mobile_provider}
                                onChange={(e) => setData('mobile_provider', e.target.value)}
                                className="select select-bordered w-full"
                                required
                            >
                                <option value="">{t('account.select_provider', 'Select Provider')}</option>
                                <option value="bkash">bKash</option>
                                <option value="nagad">Nagad</option>
                                <option value="rocket">Rocket (DBBL)</option>
                                <option value="upay">Upay</option>
                                <option value="m-cash">M-Cash</option>
                                <option value="tap">Tap</option>
                                <option value="mycash">MyCash</option>
                                <option value="okwallet">OK Wallet</option>
                                <option value="other">{t('account.other', 'Other')}</option>
                            </select>
                            {errors.mobile_provider && (
                                <p className="text-red-500 text-sm mt-1">{errors.mobile_provider}</p>
                            )}
                        </div>
                    )}

                    {/* Opening Balance */}
                    <div>
                        <label className="label">
                            <span className="label-text font-bold">
                                {t('account.opening_balance', 'Opening Balance')}
                            </span>
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-bold">
                                ৳
                            </span>
                            <input
                                type="number"
                                
                                min="0"
                                value={data.opening_balance}
                                onChange={(e) => setData('opening_balance', e.target.value)}
                                className="input input-bordered w-full pl-3"
                                placeholder="0.00"
                            />
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                            {t('account.opening_balance_hint', 'Enter initial balance for this account')}
                        </p>
                        {errors.opening_balance && (
                            <p className="text-red-500 text-sm mt-1">{errors.opening_balance}</p>
                        )}
                    </div>

                    {/* Note */}
                    <div>
                        <label className="label">
                            <span className="label-text font-bold">
                                {t('account.note', 'Note (Optional)')}
                            </span>
                        </label>
                        <textarea
                            value={data.note}
                            onChange={(e) => setData('note', e.target.value)}
                            className="textarea textarea-bordered w-full"
                            rows="3"
                            placeholder={t('account.note_placeholder', 'Additional notes about this account...')}
                        />
                        {errors.note && (
                            <p className="text-red-500 text-sm mt-1">{errors.note}</p>
                        )}
                    </div>

                    {/* Settings */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 border rounded-xl">
                            <div>
                                <p className="font-bold">{t('account.set_as_default', 'Set as Default Account')}</p>
                                <p className="text-sm text-gray-500">
                                    {t('account.default_hint', 'This account will be selected by default for transactions')}
                                </p>
                            </div>
                            <input
                                type="checkbox"
                                checked={data.is_default}
                                onChange={(e) => setData('is_default', e.target.checked)}
                                className="toggle toggle-success"
                            />
                        </div>

                        <div className="flex items-center justify-between p-4 border rounded-xl">
                            <div>
                                <p className="font-bold">{t('account.active_status', 'Active Status')}</p>
                                <p className="text-sm text-gray-500">
                                    {t('account.active_hint', 'Inactive accounts won\'t appear in dropdowns')}
                                </p>
                            </div>
                            <input
                                type="checkbox"
                                checked={data.is_active}
                                onChange={(e) => setData('is_active', e.target.checked)}
                                className="toggle toggle-success"
                            />
                        </div>
                    </div>

                    {/* Submit Buttons */}
                    <div className="flex gap-4 pt-6 border-t">
                        <Link
                            href={route('accounts.index')}
                            className="btn btn-ghost flex-1"
                        >
                            {t('account.cancel', 'Cancel')}
                        </Link>
                        <button
                            type="submit"
                            className="btn bg-red-600 hover:bg-red-700 text-white flex-1"
                            disabled={processing}
                        >
                            <Save size={16} />
                            {processing ? t('account.creating', 'Creating...') : t('account.create_account', 'Create Account')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}