import { Link, router, useForm } from "@inertiajs/react";
import {
    Frown,
    PiggyBank,
    Plus,
    Trash2,
    Wallet,
    X,
    Save,
    Calendar,
    Search,
    Filter,
    DollarSign,
    FileText,
    CreditCard,
    Building,
    Smartphone,
    Eye
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useTranslation } from "../../hooks/useTranslation";
import Pagination from "../../components/Pagination";

export default function Index({
    todaysExpense,
    todaysExpenseTotal,
    categories,
    accounts,
    query,
    isShadowUser,
    businessSettings,
pettyCashAccountId,
}) {
    const { t, locale } = useTranslation();

    // State
    const [model, setModel] = useState(false);
    const [startdate, setStartDate] = useState(query?.startdate || "");
    const [date, setDate] = useState(query?.date || "");
    const [initialized, setInitialized] = useState(false);
    const [showFilter, setShowFilter] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState(null);

    // Expense form
   const { setData, data, errors, processing, reset, post } = useForm({
    date: new Date().toLocaleDateString("sv-SE"),
    details: "",
    amount: "",
    sh_amount: "",
    category_id: "",
    account_id: 0,
    use_petty_cash: false,
    cost_type: "daily",
});

    // Get account icon
    const getAccountIcon = (type) => {
        switch (type) {
            case 'cash': return <Wallet size={14} className="text-green-600" />;
            case 'bank': return <Building size={14} className="text-blue-600" />;
            case 'mobile_banking': return <Smartphone size={14} className="text-purple-600" />;
            default: return <CreditCard size={14} />;
        }
    };

    // Format currency
    const formatCurrency = (value) => {
        const numValue = Number(value) || 0;
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(numValue);
    };

    useEffect(() => {
        if (!initialized) {
            setInitialized(true);
            return;
        }
        if (date !== "" || startdate !== "") {
            router.get(route("expenses.list", { startdate, date }));
        }
    }, [date, startdate]);

    useEffect(() => {
        // Update selected account when account_id changes
        if (data.account_id) {
            const account = accounts.find(acc => acc.id == data.account_id);
            setSelectedAccount(account);
        } else {
            setSelectedAccount(null);
        }
    }, [data.account_id, accounts]);

    const formSubmit = (e) => {
        e.preventDefault();
        
        // Validation
        if (!data.category_id) {
            toast.error(t('expenses.category_required', 'Please select a category'));
            return;
        }
        
        if (!data.account_id && data.amount > 0 && !isShadowUser) {
            toast.error(t('expenses.account_required', 'Please select a payment account'));
            return;
        }
        
        // Check account balance
        if (selectedAccount && data.amount > 0) {
            if (selectedAccount.current_balance < data.amount) {
                toast.error(`Insufficient balance in ${selectedAccount.name}. Available: ৳${formatCurrency(selectedAccount.current_balance)}`);
                return;
            }
        }
        
        post(route("expenses.post"), {
            onSuccess: () => {
                reset();
                modelClose();
                // toast.success(t('expenses.expense_added_success', 'Expense added successfully!'));
            },
            onError: (errors) => {
                if (errors.error) {
                    toast.error(errors.error);
                } else {
                    toast.error(t('expenses.something_went_wrong', 'Something went wrong. Please try again!'));
                }
            },
        });
    };

    const modelClose = () => {
        reset();
        setModel(false);
        setSelectedAccount(null);
    };

    const handleDateClear = () => {
        setStartDate("");
        setDate("");
        router.visit(route("expenses.list"));
    };

    // Get account name from payment
    const getAccountInfo = (expense) => {
        if (expense.payment && expense.payment.account) {
            return {
                name: expense.payment.account.name,
                type: expense.payment.account.type,
                balance: expense.payment.account.current_balance
            };
        }
        return null;
    };

    return (
        <div className={`p-6 bg-[#f8f9fa] min-h-screen ${locale === 'bn' ? 'bangla-font' : ''}`}>
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight">
                        {isShadowUser 
                            ? t('expenses.shadow_title', 'EXPENSE MANAGEMENT') 
                            : t('expenses.title', 'EXPENSE MANAGEMENT')
                        }
                    </h1>
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                        {t('expenses.subtitle', 'Track and manage expenses')}
                    </p>
                </div>
                <button 
                    onClick={() => setModel(true)}
                    className="btn bg-[#1e4d2b] text-white hover:bg-red-600 text-white border-none rounded-xl px-8 font-black uppercase text-xs tracking-widest shadow-xl"
                >
                    <Plus size={16} /> {t('expenses.add_new', 'Add Expense')}
                </button>
            </div>

            {/* Main Content Card */}
            <div className="bg-white rounded-2xl border-4 border-gray-900 shadow-2xl overflow-hidden mb-10">
                {/* Card Header */}
                <div className="bg-[#1e4d2b] text-white p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-2">
                        <FileText size={18} className="text-red-500" />
                        <h2 className="text-white text-xs font-black uppercase tracking-[0.2em]">
                            {t('expenses.expense_list', 'Expense List')}
                        </h2>
                        <span className="bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded-lg">
                            {todaysExpense.data.length}
                        </span>
                    </div>

                    {/* Filter Section */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowFilter(!showFilter)}
                            className="btn btn-outline border-gray-300 text-white hover:text-gray-900 rounded-lg font-black text-[10px] uppercase tracking-tighter flex items-center gap-2"
                        >
                            <Filter size={14} />
                            {showFilter ? t('expenses.hide_filter', 'Hide Filter') : t('expenses.filter', 'Filter')}
                        </button>
                    </div>
                </div>

                {/* Filter Options */}
                {showFilter && (
                    <div className="bg-gray-50 p-6 border-b border-gray-200 animate-in fade-in">
                        <h4 className="text-[10px] font-black uppercase text-gray-600 tracking-widest mb-4 flex items-center gap-2">
                            <Search size={14} /> {t('expenses.filter_options', 'FILTER OPTIONS')}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="form-control">
                                <label className="label text-[10px] font-black uppercase text-gray-400 tracking-widest">
                                    {t('expenses.start_date', 'Start Date')}
                                </label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={startdate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="input input-bordered border-gray-300 rounded-xl w-full pl-10"
                                    />
                                    <Calendar size={16} className="absolute left-3 top-3 text-gray-400" />
                                </div>
                            </div>

                            <div className="form-control">
                                <label className="label text-[10px] font-black uppercase text-gray-400 tracking-widest">
                                    {t('expenses.end_date', 'End Date')}
                                </label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="input input-bordered border-gray-300 rounded-xl w-full pl-10"
                                    />
                                    <Calendar size={16} className="absolute left-3 top-3 text-gray-400" />
                                </div>
                            </div>

                            <div className="form-control flex justify-end items-end">
                                {(startdate || date) && (
                                    <button
                                        onClick={handleDateClear}
                                        className="btn bg-red-600 hover:bg-red-700 text-white border-none rounded-xl font-black uppercase text-[10px] px-6"
                                    >
                                        <X size={14} /> {t('expenses.clear', 'Clear')}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Table Section */}
                <div className="p-6">
                    {todaysExpense.data.length > 0 ? (
                        <div className="overflow-x-auto rounded-2xl border border-gray-200">
                            <table className="table w-full">
                                <thead className={`${isShadowUser ? 'bg-yellow-600' : 'bg-[#1e4d2b] text-white'} text-white`}>
                                    <tr>
                                        <th className="font-black uppercase text-xs tracking-widest px-6 py-4">#</th>
                                        <th className="font-black uppercase text-xs tracking-widest px-6 py-4">
                                            {t('expenses.details', 'Details')}
                                        </th>
                                        <th className="font-black uppercase text-xs tracking-widest px-6 py-4">
                                            {t('expenses.category', 'Category')}
                                        </th>
                                        <th className="font-black uppercase text-xs tracking-widest px-6 py-4">
                                            {t('expenses.payment_account', 'Payment Account')}
                                        </th>
                                        <th className="font-black uppercase text-xs tracking-widest px-6 py-4">
                                            {t('expenses.amount', 'Amount')}
                                        </th>
                                        <th className="font-black uppercase text-xs tracking-widest px-6 py-4">
                                            {t('expenses.date', 'Date')}
                                        </th>
                                        <th className="font-black uppercase text-xs tracking-widest px-6 py-4">
                                            {t('expenses.actions', 'Actions')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {todaysExpense.data.map((expense, index) => {
                                        const accountInfo = getAccountInfo(expense);
                                        return (
                                            <tr key={index} className="hover:bg-gray-50 border-b border-gray-100">
                                                <td className="px-6 py-4 font-bold text-gray-900">{index + 1}</td>
                                                <td className="px-6 py-4">
                                                    <p className="font-medium text-gray-900 max-w-md">{expense.details}</p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="badge bg-blue-100 text-blue-800 border-none text-xs font-bold uppercase py-1 px-3">
                                                        {expense.category?.name || 'Uncategorized'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {accountInfo ? (
                                                        <div className="flex items-center gap-2">
                                                            {getAccountIcon(accountInfo.type)}
                                                            <div>
                                                                <span className="font-medium text-gray-900">{accountInfo.name}</span>
                                                                <div className="text-xs text-gray-500">
                                                                    Balance: ৳{formatCurrency(accountInfo.balance)}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400 text-sm">Not Paid / Cash</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="font-black text-lg text-red-600">
                                                        ৳{formatCurrency(expense.amount)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="badge bg-[#1e4d2b] text-white text-white border-none text-xs font-bold uppercase py-2 px-4">
                                                        {expense.date}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex gap-2">
                                                        {expense.payment && (
                                                            <Link
                                                                href={route("payments.show", { payment: expense.payment.id })}
                                                                className="btn btn-outline btn-info btn-sm rounded-lg font-bold uppercase text-[10px]"
                                                            >
                                                                <Eye size={12} /> Payment
                                                            </Link>
                                                        )}
                                                        <Link
                                                            href={route("expenses.del", { id: expense.id })}
                                                            onClick={(e) => {
                                                                if (!confirm(t('expenses.confirm_delete', 'Are you sure you want to delete this expense?'))) {
                                                                    e.preventDefault();
                                                                }
                                                            }}
                                                            className="btn btn-outline btn-error btn-sm rounded-lg font-bold uppercase text-[10px]"
                                                        >
                                                            <Trash2 size={12} /> {t('expenses.delete', 'Delete')}
                                                        </Link>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="border-4 border-dashed border-gray-300 rounded-2xl px-8 py-16 flex flex-col justify-center items-center gap-4 text-center">
                            <Frown size={48} className="text-gray-400" />
                            <h1 className="text-xl font-black text-gray-500">
                                {t('expenses.data_not_found', 'No Expenses Found')}
                            </h1>
                            <p className="text-sm font-medium text-gray-400 max-w-md">
                                {t('expenses.no_data_message', 'No expense records found for the selected date range. Start adding expenses to track your spending.')}
                            </p>
                            <button
                                onClick={() => setModel(true)}
                                className="btn bg-[#1e4d2b] text-white hover:bg-red-600 text-white border-none rounded-xl px-8 font-black uppercase text-xs tracking-widest shadow-xl mt-4"
                            >
                                <Plus size={16} /> {t('expenses.add_first_expense', 'Add First Expense')}
                            </button>
                        </div>
                    )}

                    {todaysExpense.data.length > 0 && (
                        <div className="mt-8">
                            <Pagination data={todaysExpense} />
                        </div>
                    )}

                    {/* Bottom Summary */}
                    <div className="mt-10 pt-8 border-t border-gray-300">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Cash Flow Summary */}
                            <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-2xl p-6 border border-green-200">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-3 bg-green-600 rounded-xl">
                                        <PiggyBank size={20} className="text-white" />
                                    </div>
                                    <div>
                                        <h5 className="font-black uppercase text-sm tracking-tight text-gray-900">
                                            {t('expenses.today_summary', 'TODAY\'S EXPENSE SUMMARY')}
                                        </h5>
                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                            {t('expenses.total_spent', 'Total amount spent today')}
                                        </p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium text-gray-600">{t('expenses.total_expenses', 'Total Expenses')}:</span>
                                        <span className="font-bold text-3xl text-red-600">
                                            ৳{formatCurrency(todaysExpenseTotal || 0)}
                                        </span>
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        {todaysExpense.data.length} {t('expenses.expenses', 'expenses')} recorded
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Expense Modal */}
            <dialog className="modal" open={model}>
                <div className="modal-box max-w-2xl rounded-2xl border-4 border-gray-900 p-0 overflow-auto shadow-2xl">
                    <div className="bg-[#1e4d2b] text-white p-6 flex justify-between items-center">
                        <h2 className="text-white text-sm font-black uppercase tracking-[0.2em] flex items-center gap-2">
                            <Plus size={18} className="text-red-500" />
                            {t('expenses.add_new_expense', 'ADD NEW EXPENSE')}
                        </h2>
                        <button
                            onClick={modelClose}
                            className="btn btn-circle btn-xs btn-ghost text-white hover:bg-red-600"
                        >
                            <X size={16} />
                        </button>
                    </div>

<form onSubmit={formSubmit} className="p-6 space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        <div className="form-control">
            <label className="label text-[10px] font-black uppercase text-gray-400 tracking-widest">
                {t('expenses.date', 'Date')} *
            </label>

            <div className="relative">
                <input
                    type="date"
                    value={data.date}
                    onChange={(e) => setData("date", e.target.value)}
                    className={`input input-bordered border-gray-300 rounded-xl w-full pl-10 ${errors.date ? 'border-red-600' : ''}`}
                />

                <Calendar
                    size={18}
                    className="absolute left-3 top-3 text-gray-400"
                />
            </div>

            {errors.date && (
                <p className="text-xs text-red-600 font-bold mt-2">
                    {errors.date}
                </p>
            )}
        </div>

        <div className="form-control">
            <label className="label text-[10px] font-black uppercase text-gray-400 tracking-widest">
                {t('expenses.category', 'Category')} *
            </label>

            <select
                value={data.category_id}
                onChange={(e) => setData("category_id", e.target.value)}
                className={`select select-bordered border-gray-300 rounded-xl w-full ${errors.category_id ? 'border-red-600' : ''}`}
                required
            >
                <option value="">
                    {t('expenses.select_category', 'Select category')}
                </option>

                {categories.map(category => (
                    <option key={category.id} value={category.id}>
                        {category.name}
                    </option>
                ))}
            </select>

            {errors.category_id && (
                <p className="text-xs text-red-600 font-bold mt-2">
                    {errors.category_id}
                </p>
            )}
        </div>

        <div className="form-control">
            <label className="label text-[10px] font-black uppercase text-gray-400 tracking-widest">
                {t('expenses.amount', 'Amount')} *
            </label>

            <div className="relative">
                {/* <input
                    type="number"
                    min="0.01"
                    value={data.amount}
                    onChange={(e) => setData("amount", e.target.value)}
                    className={`input input-bordered border-gray-300 rounded-xl w-full pl-10 ${errors.amount ? 'border-red-600' : ''}`}
                    placeholder="0.00"
                    required
                /> */}
                <input
    type="number"
    min="1"
    step="1"
    value={data.amount}
    onChange={(e) => setData("amount", e.target.value)}
    className={`input input-bordered border-gray-300 rounded-xl w-full pl-10 ${errors.amount ? 'border-red-600' : ''}`}
    placeholder="Enter amount"
    required
/>

                <DollarSign
                    size={18}
                    className="absolute left-3 top-3 text-gray-400"
                />
            </div>

            {errors.amount && (
                <p className="text-xs text-red-600 font-bold mt-2">
                    {errors.amount}
                </p>
            )}
        </div>

        {/* NEW COST TYPE FIELD */}
        <div className="form-control">
            <label className="label text-[10px] font-black uppercase text-gray-400 tracking-widest">
                Cost Type
            </label>

            <select
                value={data.cost_type}
                onChange={(e) => setData("cost_type", e.target.value)}
                className="select select-bordered border-gray-300 rounded-xl w-full"
            >
                <option value="daily">Daily Cost</option>
                <option value="monthly">Monthly Cost</option>
            </select>
        </div>

        {/* NEW PETTY CASH FIELD */}
        <div className="form-control md:col-span-2">
            <label className="label text-[10px] font-black uppercase text-gray-400 tracking-widest">
                Payment Source
            </label>

            <label className="flex items-center gap-3 cursor-pointer border border-gray-300 rounded-xl px-4 py-3">
                <input
                    type="checkbox"
                    checked={data.use_petty_cash}
                    onChange={(e) => {

                        setData("use_petty_cash", e.target.checked);

                        if (e.target.checked && pettyCashAccountId) {
                            setData("account_id", pettyCashAccountId);
                        }

                        if (!e.target.checked) {
                            setData("account_id", "");
                        }
                    }}
                    className="checkbox checkbox-success"
                />

                <span className="text-sm font-bold text-gray-700">
                    Pay from Petty Cash
                </span>
            </label>

            {data.use_petty_cash && !pettyCashAccountId && (
                <p className="text-xs text-red-600 font-bold mt-2">
                    Petty Cash account is not configured.
                    Please set it from Business Settings.
                </p>
            )}
        </div>

        {/* EXISTING PAYMENT ACCOUNT */}
        <div className="form-control md:col-span-2">
            <label className="label text-[10px] font-black uppercase text-gray-400 tracking-widest">
                {t('expenses.payment_account', 'Payment Account')} *
            </label>

            <select
                value={data.account_id}
                onChange={(e) => setData("account_id", e.target.value)}
                disabled={data.use_petty_cash}
                className={`select select-bordered border-gray-300 rounded-xl w-full ${data.use_petty_cash ? 'bg-gray-100 cursor-not-allowed' : ''} ${errors.account_id ? 'border-red-600' : ''}`}
                required={data.amount > 0 && !isShadowUser && !data.use_petty_cash}
            >
                <option value="">
                    {t('expenses.select_account', 'Select payment account')}
                </option>

                {accounts.map(account => (
                    <option key={account.id} value={account.id}>
                        {account.name}
                    </option>
                ))}
            </select>

            {errors.account_id && (
                <p className="text-xs text-red-600 font-bold mt-2">
                    {errors.account_id}
                </p>
            )}

            {/* Selected Account Info */}
            {selectedAccount && (
                <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">

                    <div className="flex items-center justify-between">

                        <div className="flex items-center gap-2">
                            {getAccountIcon(selectedAccount.type)}

                            <div>
                                <span className="text-sm font-bold">
                                    {selectedAccount.name}
                                </span>

                                <div className="text-xs text-gray-500 capitalize">
                                    {selectedAccount.type} Account
                                </div>
                            </div>
                        </div>

                        <div className="text-right">
                            <div className="text-xs text-gray-500">
                                Current Balance
                            </div>

                            <div className="text-sm font-mono font-bold">
                                ৳{formatCurrency(selectedAccount.current_balance)}
                            </div>

                            <div className="text-xs text-red-500 mt-1">
                                After expense:
                                ৳{formatCurrency(
                                    selectedAccount.current_balance -
                                    (Number(data.amount) || 0)
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>

        <div className="form-control md:col-span-2">
            <label className="label text-[10px] font-black uppercase text-gray-400 tracking-widest">
                {t('expenses.details', 'Details')}
            </label>

            <textarea
                className={`textarea textarea-bordered border-gray-300 rounded-xl h-32 ${errors.details ? 'border-red-600' : ''}`}
                placeholder={t('expenses.details_placeholder', 'Enter expense description...')}
                value={data.details}
                onChange={(e) => setData("details", e.target.value)}
            />

            {errors.details && (
                <p className="text-xs text-red-600 font-bold mt-2">
                    {errors.details}
                </p>
            )}
        </div>
    </div>

    <div className="flex justify-between items-center pt-6 border-t border-gray-200">

        <button
            type="button"
            onClick={modelClose}
            className="btn btn-outline border-gray-300 rounded-xl font-black uppercase text-[10px] tracking-widest"
        >
            {t('expenses.cancel', 'Cancel')}
        </button>

        <button
            disabled={processing}
            className="btn bg-[#1e4d2b] text-white hover:bg-red-600 border-none rounded-xl font-black uppercase text-[10px] tracking-widest px-8 shadow-xl"
            type="submit"
        >
            {processing ? (
                <>
                    <span className="loading loading-spinner loading-sm"></span>

                    {t('expenses.processing', 'Processing...')}
                </>
            ) : (
                <>
                    <Save size={14} className="mr-2" />

                    {t('expenses.add_now', 'ADD EXPENSE')}
                </>
            )}
        </button>
    </div>
</form>
                </div>
            </dialog>
        </div>
    );
}