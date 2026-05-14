import { Head, useForm, router } from '@inertiajs/react';
import { useState } from 'react';

export default function Index({
    advances,
    employees,
    accounts,
    filters,
    pettyCashAccountId,
}) {
    const [showForm, setShowForm] = useState(false);

    const {
        data,
        setData,
        post,
        processing,
        errors,
        reset,
    } = useForm({
        employee_id: '',
        date: new Date().toISOString().split('T')[0],
        amount: '',
        reason: '',
        account_id: '',
        use_petty_cash: false,
    });

    const filterForm = useForm({
        employee_id: filters.employee_id || '',
        month: filters.month || new Date().toISOString().slice(0, 7),
    });

    const submit = (e) => {
        e.preventDefault();

        post(route('employee-salary-advances.store'), {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                setData('date', new Date().toISOString().split('T')[0]);
                setData('use_petty_cash', false);
                setShowForm(false);
            },
        });
    };

    const applyFilter = (e) => {
        e.preventDefault();

        router.get(
            route('employee-salary-advances.index'),
            filterForm.data,
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            }
        );
    };

    const formatMoney = (amount) => {
        return Number(amount || 0).toLocaleString('en-BD', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    };

    const selectedAccount = accounts.find(
        account => String(account.id) === String(data.account_id)
    );

    const totalAdvance = advances?.data?.reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0
    ) || 0;

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <Head title="Employee Salary Advances" />

            <div className="mb-6 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-red-600 mb-2">
                            Payroll Advance
                        </p>

                        <h1 className="text-3xl font-black text-slate-900">
                            Employee Daily Salary Taking
                        </h1>

                        <p className="text-sm text-slate-500 font-semibold mt-1">
                            Track employee daily salary advance and deduct from account.
                        </p>
                    </div>

                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-red-600 transition"
                    >
                        {showForm ? 'Close Form' : '+ Add Salary Advance'}
                    </button>
                </div>
            </div>

            {showForm && (
                <form
                    onSubmit={submit}
                    className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm mb-6"
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                Employee *
                            </label>

                            <select
                                value={data.employee_id}
                                onChange={(e) => setData('employee_id', e.target.value)}
                                className="select select-bordered w-full rounded-2xl border-slate-300 mt-2"
                                required
                            >
                                <option value="">Select employee</option>

                                {employees.map(employee => (
                                    <option key={employee.id} value={employee.id}>
                                        {employee.name} ({employee.employee_id})
                                    </option>
                                ))}
                            </select>

                            {errors.employee_id && (
                                <p className="text-xs text-red-600 font-bold mt-1">
                                    {errors.employee_id}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                Date *
                            </label>

                            <input
                                type="date"
                                value={data.date}
                                onChange={(e) => setData('date', e.target.value)}
                                className="input input-bordered w-full rounded-2xl border-slate-300 mt-2"
                                required
                            />

                            {errors.date && (
                                <p className="text-xs text-red-600 font-bold mt-1">
                                    {errors.date}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                Amount *
                            </label>

                            <input
                                type="number"
                                min="1"
                                step="1"
                                value={data.amount}
                                onChange={(e) => setData('amount', e.target.value)}
                                className="input input-bordered w-full rounded-2xl border-slate-300 mt-2"
                                placeholder="Enter amount"
                                required
                            />

                            {errors.amount && (
                                <p className="text-xs text-red-600 font-bold mt-1">
                                    {errors.amount}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                Payment Source
                            </label>

                            <label className="mt-2 flex items-center gap-3 cursor-pointer border border-slate-300 rounded-2xl px-4 py-3">
                                <input
                                    type="checkbox"
                                    checked={data.use_petty_cash}
                                    onChange={(e) => {
                                        setData('use_petty_cash', e.target.checked);

                                        if (e.target.checked && pettyCashAccountId) {
                                            setData('account_id', pettyCashAccountId);
                                        }

                                        if (!e.target.checked) {
                                            setData('account_id', '');
                                        }
                                    }}
                                    className="checkbox checkbox-success"
                                />

                                <span className="text-sm font-bold text-slate-700">
                                    Pay from Petty Cash
                                </span>
                            </label>

                            {data.use_petty_cash && !pettyCashAccountId && (
                                <p className="text-xs text-red-600 font-bold mt-2">
                                    Petty Cash account is not configured in Business Settings.
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                Account *
                            </label>

                            <select
                                value={data.account_id}
                                onChange={(e) => setData('account_id', e.target.value)}
                                disabled={data.use_petty_cash}
                                className={`select select-bordered w-full rounded-2xl border-slate-300 mt-2 ${
                                    data.use_petty_cash ? 'bg-slate-100 cursor-not-allowed' : ''
                                }`}
                                required={!data.use_petty_cash}
                            >
                                <option value="">Select account</option>

                                {accounts.map(account => (
                                    <option key={account.id} value={account.id}>
                                        {account.name} — ৳{formatMoney(account.current_balance)}
                                    </option>
                                ))}
                            </select>

                            {errors.account_id && (
                                <p className="text-xs text-red-600 font-bold mt-1">
                                    {errors.account_id}
                                </p>
                            )}

                            {selectedAccount && (
                                <div className="mt-3 bg-slate-50 border border-slate-200 rounded-2xl p-3">
                                    <div className="flex justify-between text-xs font-bold">
                                        <span>{selectedAccount.name}</span>
                                        <span>৳{formatMoney(selectedAccount.current_balance)}</span>
                                    </div>

                                    {data.amount && (
                                        <div className="flex justify-between text-xs font-bold text-red-600 mt-1">
                                            <span>After Payment</span>
                                            <span>
                                                ৳{formatMoney(
                                                    Number(selectedAccount.current_balance || 0) -
                                                    Number(data.amount || 0)
                                                )}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                Reason
                            </label>

                            <textarea
                                value={data.reason}
                                onChange={(e) => setData('reason', e.target.value)}
                                className="textarea textarea-bordered w-full rounded-2xl border-slate-300 mt-2"
                                placeholder="Example: Daily salary taken / personal need"
                            />

                            {errors.reason && (
                                <p className="text-xs text-red-600 font-bold mt-1">
                                    {errors.reason}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-6 pt-5 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => setShowForm(false)}
                            className="btn btn-outline rounded-2xl"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={processing}
                            className="btn bg-slate-900 text-white hover:bg-red-600 rounded-2xl border-none"
                        >
                            {processing ? 'Saving...' : 'Save Advance'}
                        </button>
                    </div>
                </form>
            )}

            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm mb-6">
                <form onSubmit={applyFilter} className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end">
                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                            Month
                        </label>

                        <input
                            type="month"
                            value={filterForm.data.month}
                            onChange={(e) => filterForm.setData('month', e.target.value)}
                            className="input input-bordered w-full rounded-2xl border-slate-300 mt-2"
                        />
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                            Employee
                        </label>

                        <select
                            value={filterForm.data.employee_id}
                            onChange={(e) => filterForm.setData('employee_id', e.target.value)}
                            className="select select-bordered w-full rounded-2xl border-slate-300 mt-2"
                        >
                            <option value="">All Employees</option>

                            {employees.map(employee => (
                                <option key={employee.id} value={employee.id}>
                                    {employee.name} ({employee.employee_id})
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        type="submit"
                        className="bg-slate-900 text-white px-5 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-red-600 transition"
                    >
                        Filter
                    </button>
                </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
                <SummaryCard label="Total Advances" value={`৳${formatMoney(totalAdvance)}`} />
                <SummaryCard label="Total Records" value={advances?.total || advances?.data?.length || 0} />
                <SummaryCard label="Current Month" value={filterForm.data.month} />
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                <div className="px-6 py-5 bg-slate-900 flex justify-between items-center">
                    <h2 className="text-white text-xs font-black uppercase tracking-widest">
                        Salary Advance Registry
                    </h2>

                    <span className="text-[10px] font-black uppercase text-red-400">
                        Total {advances?.total || advances?.data?.length || 0} records
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-slate-50">
                            <tr>
                                <TableHead>Employee</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Account</TableHead>
                                <TableHead>Source</TableHead>
                                <TableHead>Reason</TableHead>
                                <TableHead align="right">Amount</TableHead>
                            </tr>
                        </thead>

                        <tbody className="bg-white divide-y divide-slate-100">
                            {advances?.data?.length > 0 ? (
                                advances.data.map((advance) => (
                                    <tr key={advance.id} className="hover:bg-slate-50 transition">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="font-black text-slate-900 uppercase text-sm">
                                                {advance.employee?.name || 'N/A'}
                                            </div>
                                            <div className="text-[10px] font-mono font-bold text-red-600">
                                                #{advance.employee?.employee_id || 'N/A'}
                                            </div>
                                        </td>

                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-600">
                                            {advance.date}
                                        </td>

                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-600">
                                            {advance.account?.name || '-'}
                                        </td>

                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase ${
                                                advance.is_petty_cash_payment
                                                    ? 'bg-emerald-50 text-emerald-700'
                                                    : 'bg-slate-100 text-slate-600'
                                            }`}>
                                                {advance.is_petty_cash_payment ? 'Petty Cash' : 'Account'}
                                            </span>
                                        </td>

                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            {advance.reason || '-'}
                                        </td>

                                        <td className="px-6 py-4 whitespace-nowrap text-right font-black text-red-600">
                                            ৳{formatMoney(advance.amount)}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="px-6 py-16 text-center text-slate-400 font-bold">
                                        No salary advance found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {advances?.links && advances.links.length > 3 && (
                    <div className="px-6 py-5 border-t border-slate-100 bg-slate-50 flex flex-wrap gap-1">
                        {advances.links.map((link, index) => (
                            <button
                                key={index}
                                onClick={() => link.url && router.visit(link.url, {
                                    preserveState: true,
                                    preserveScroll: true,
                                })}
                                disabled={!link.url || link.active}
                                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition ${
                                    link.active
                                        ? 'bg-red-600 text-white'
                                        : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-900'
                                } ${!link.url ? 'opacity-30 grayscale' : ''}`}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function SummaryCard({ label, value }) {
    return (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                {label}
            </p>
            <h3 className="text-xl font-black text-slate-900 mt-1">
                {value}
            </h3>
        </div>
    );
}

function TableHead({ children, align = 'left' }) {
    return (
        <th className={`px-6 py-4 text-${align} text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100`}>
            {children}
        </th>
    );
}