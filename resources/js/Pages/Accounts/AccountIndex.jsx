import { Link, router, useForm } from "@inertiajs/react";
import {
    ArrowUpDown,
    Edit,
    Eye,
    Landmark,
    MoreVertical,
    Plus,
    Search,
    Smartphone,
    Trash2,
    TrendingDown,
    TrendingUp,
    Wallet,
} from "lucide-react";
import PageHeader from "../../components/PageHeader";
import Pagination from "../../components/Pagination";
import { useTranslation } from "../../hooks/useTranslation";

export default function AccountIndex({ accounts, filters, totalBalance }) {
    const { t } = useTranslation();
    const { data, setData } = useForm({
        search: filters.search || "",
        type: filters.type || "all",
    });

    const handleFilter = () => {
        router.get(
            route("accounts.index"),
            {
                search: data.search,
                type: data.type,
            },
            {
                preserveScroll: true,
                preserveState: true,
            },
        );
    };

    const clearFilters = () => {
        setData({ search: "", type: "all" });
        router.get(
            route("accounts.index"),
            {},
            {
                preserveScroll: true,
                preserveState: true,
            },
        );
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat("en-BD", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case "cash":
                return <Wallet size={16} className="text-green-600" />;
            case "bank":
                return <Landmark size={16} className="text-blue-600" />;
            case "mobile_banking":
                return <Smartphone size={16} className="text-purple-600" />;
            default:
                return <Wallet size={16} />;
        }
    };

    const getTypeLabel = (type) => {
        switch (type) {
            case "cash":
                return t("account.cash", "Cash");
            case "bank":
                return t("account.bank", "Bank Account");
            case "mobile_banking":
                return t("account.mobile_banking", "Mobile Banking");
            default:
                return type;
        }
    };

    const handleDeposit = (accountId) => {
        const amount = prompt(
            t("account.enter_deposit_amount", "Enter deposit amount:"),
        );
        if (amount && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0) {
            router.post(
                route("accounts.deposit", accountId),
                { amount },
                {
                    preserveScroll: true,
                    onSuccess: () => {
                        alert(
                            t("account.deposit_success", "Deposit successful!"),
                        );
                    },
                },
            );
        }
    };

    const handleWithdraw = (accountId, currentBalance) => {
        const amount = prompt(
            t("account.enter_withdraw_amount", "Enter withdrawal amount:"),
        );
        if (amount && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0) {
            if (parseFloat(amount) > currentBalance) {
                alert(
                    t("account.insufficient_balance", "Insufficient balance!"),
                );
                return;
            }
            router.post(
                route("accounts.withdraw", accountId),
                { amount },
                {
                    preserveScroll: true,
                    onSuccess: () => {
                        alert(
                            t(
                                "account.withdraw_success",
                                "Withdrawal successful!",
                            ),
                        );
                    },
                },
            );
        }
    };

    return (
        <div className="bg-white rounded-box p-5">
            <PageHeader
                title={t("account.title", "Account Management")}
                subtitle={t(
                    "account.subtitle",
                    "Manage your bank, cash, and mobile accounts",
                )}
            >
                <div className="flex items-center gap-3">
                    <Link
                        href={route("accounts.create")}
                        className="btn btn-sm bg-red-600 hover:bg-red-700 text-white border-none"
                    >
                        <Plus size={16} />
                        <span>{t("account.create", "New Account")}</span>
                    </Link>
                </div>
            </PageHeader>

            {/* Filters */}
            <div className="bg-gray-50 p-4 rounded-xl mb-6">
                <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1">
                        <label className="block text-sm font-bold mb-2 text-gray-700">
                            {t("account.search", "Search")}
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={data.search}
                                onChange={(e) =>
                                    setData("search", e.target.value)
                                }
                                placeholder={t(
                                    "account.search_placeholder",
                                    "Search by account name or number...",
                                )}
                                className="input input-sm input-bordered w-full"
                            />
                            <select
                                value={data.type}
                                onChange={(e) =>
                                    setData("type", e.target.value)
                                }
                                className="select select-sm select-bordered"
                            >
                                <option value="all">
                                    {t("account.all_types", "All Types")}
                                </option>
                                <option value="cash">
                                    {t("account.cash", "Cash")}
                                </option>
                                <option value="bank">
                                    {t("account.bank", "Bank")}
                                </option>
                                <option value="mobile_banking">
                                    {t(
                                        "account.mobile_banking",
                                        "Mobile Banking",
                                    )}
                                </option>
                            </select>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleFilter}
                            className="btn btn-sm bg-gray-900 text-white"
                        >
                            <Search size={14} />
                            {t("account.filter", "Filter")}
                        </button>
                        {(data.search || data.type !== "all") && (
                            <button
                                onClick={clearFilters}
                                className="btn btn-sm btn-ghost"
                            >
                                {t("account.clear", "Clear")}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl p-4 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm opacity-80">
                                {t("account.total_balance", "Total Balance")}
                            </p>
                            <p className="text-2xl font-black">
                                ৳{formatCurrency(totalBalance)}
                            </p>
                        </div>
                        <TrendingUp size={24} className="opacity-70" />
                    </div>
                </div>
                <div className="bg-white border rounded-xl p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">
                                {t("account.total_accounts", "Total Accounts")}
                            </p>
                            <p className="text-2xl font-black">
                                {accounts.data.length}
                            </p>
                        </div>
                        <Landmark size={24} className="text-gray-400" />
                    </div>
                </div>
                <div className="bg-white border rounded-xl p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">
                                {t(
                                    "account.active_accounts",
                                    "Active Accounts",
                                )}
                            </p>
                            <p className="text-2xl font-black">
                                {
                                    accounts.data.filter((a) => a.is_active)
                                        .length
                                }
                            </p>
                        </div>
                        <TrendingUp size={24} className="text-green-500" />
                    </div>
                </div>
                <div className="bg-white border rounded-xl p-4">
                    <Link
                        href="#transfer-modal"
                        className="flex items-center justify-between hover:bg-gray-50 p-2 rounded-lg transition-colors"
                    >
                        <div>
                            <p className="text-sm text-gray-500">
                                {t("account.transfer", "Account Transfer")}
                            </p>
                            <p className="text-lg font-black text-red-600">
                                {t(
                                    "account.click_to_transfer",
                                    "Click to Transfer",
                                )}
                            </p>
                        </div>
                        <ArrowUpDown size={24} className="text-red-600" />
                    </Link>
                </div>
            </div>

            {/* Accounts Table */}
            <div className=" rounded-xl border border-gray-100 shadow-sm">
                <table className="table w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="font-bold">
                                {t("account.name", "Account Name")}
                            </th>
                            <th className="font-bold">
                                {t("account.type", "Type")}
                            </th>
                            <th className="font-bold">
                                {t("account.details", "Details")}
                            </th>
                            <th className="font-bold">
                                {t("account.balance", "Balance")}
                            </th>
                            <th className="font-bold">
                                {t("account.status", "Status")}
                            </th>
                            <th className="font-bold text-right">
                                {t("account.actions", "Actions")}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {accounts.data.map((account) => (
                            <tr key={account.id} className="hover:bg-gray-50">
                                <td>
                                    <div className="flex items-center gap-3">
                                        {getTypeIcon(account.type)}
                                        <div>
                                            <p className="font-bold">
                                                {account.name}
                                            </p>
                                            {account.account_number && (
                                                <p className="text-xs text-gray-500">
                                                    #{account.account_number}
                                                </p>
                                            )}
                                            {account.is_default && (
                                                <span className="badge badge-xs bg-green-100 text-green-700 border-none">
                                                    {t(
                                                        "account.default",
                                                        "Default",
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <span className="badge badge-outline">
                                        {getTypeLabel(account.type)}
                                    </span>
                                </td>
                                <td>
                                    <div className="text-sm">
                                        {account.type === "bank" &&
                                            account.bank_name && (
                                                <p className="text-gray-600">
                                                    {account.bank_name}
                                                </p>
                                            )}
                                        {account.type === "mobile_banking" &&
                                            account.mobile_provider && (
                                                <p className="text-gray-600">
                                                    {account.mobile_provider}
                                                </p>
                                            )}
                                        {account.note && (
                                            <p className="text-gray-500 text-xs truncate max-w-xs">
                                                {account.note}
                                            </p>
                                        )}
                                    </div>
                                </td>
                                <td>
                                    <p className="font-mono font-bold text-lg">
                                        ৳
                                        {formatCurrency(
                                            account.current_balance,
                                        )}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {t(
                                            "account.transactions",
                                            "Transactions",
                                        )}
                                        : {account.payments_count}
                                    </p>
                                </td>
                                <td>
                                    <span
                                        className={`badge ${account.is_active ? "badge-success" : "badge-error"}`}
                                    >
                                        {account.is_active
                                            ? t("account.active", "Active")
                                            : t("account.inactive", "Inactive")}
                                    </span>
                                </td>
                                <td>
                                    <div className="flex justify-end gap-1">
                                        <div className="dropdown dropdown-end">
                                            <label
                                                tabIndex={0}
                                                className="btn btn-ghost btn-sm btn-square"
                                            >
                                                <MoreVertical size={16} />
                                            </label>
                                            <ul
                                                tabIndex={0}
                                                className="dropdown-content menu p-2 shadow bg-white rounded-box w-52 z-10"
                                            >
                                                <li>
                                                    <button
                                                        onClick={() =>
                                                            handleDeposit(
                                                                account.id,
                                                            )
                                                        }
                                                        className="text-green-600 hover:text-green-700"
                                                    >
                                                        <TrendingUp size={14} />
                                                        {t(
                                                            "account.deposit",
                                                            "Deposit",
                                                        )}
                                                    </button>
                                                </li>
                                                <li>
                                                    <button
                                                        onClick={() =>
                                                            handleWithdraw(
                                                                account.id,
                                                                account.current_balance,
                                                            )
                                                        }
                                                        className="text-blue-600 hover:text-blue-700"
                                                    >
                                                        <TrendingDown
                                                            size={14}
                                                        />
                                                        {t(
                                                            "account.withdraw",
                                                            "Withdraw",
                                                        )}
                                                    </button>
                                                </li>
                                                <li>
                                                    <Link
                                                        href={route(
                                                            "accounts.show",
                                                            account.id,
                                                        )}
                                                        className="text-gray-600"
                                                    >
                                                        <Eye size={14} />
                                                        {t(
                                                            "account.view",
                                                            "View Details",
                                                        )}
                                                    </Link>
                                                </li>
                                                <li>
                                                    <Link
                                                        href={route(
                                                            "accounts.edit",
                                                            account.id,
                                                        )}
                                                        className="text-yellow-600"
                                                    >
                                                        <Edit size={14} />
                                                        {t(
                                                            "account.edit",
                                                            "Edit",
                                                        )}
                                                    </Link>
                                                </li>
                                                <li>
                                                    {!account.is_default && (
                                                        <form
                                                            onSubmit={(e) => {
                                                                e.preventDefault();
                                                                if (
                                                                    confirm(
                                                                        t(
                                                                            "account.confirm_delete",
                                                                            "Are you sure you want to delete this account?",
                                                                        ),
                                                                    )
                                                                ) {
                                                                    router.delete(
                                                                        route(
                                                                            "accounts.destroy",
                                                                            account.id,
                                                                        ),
                                                                    );
                                                                }
                                                            }}
                                                        >
                                                            <button
                                                                type="submit"
                                                                className="text-red-600 hover:text-red-700"
                                                            >
                                                                <Trash2
                                                                    size={14}
                                                                />
                                                                {t(
                                                                    "account.delete",
                                                                    "Delete",
                                                                )}
                                                            </button>
                                                        </form>
                                                    )}
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {accounts.data.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                    <Landmark size={48} className="mx-auto mb-4 opacity-20" />
                    <p className="font-bold">
                        {t("account.no_accounts", "No accounts found")}
                    </p>
                    <p className="text-sm mt-2">
                        {t(
                            "account.create_first",
                            "Create your first account to get started",
                        )}
                    </p>
                </div>
            )}

            {accounts.data.length > 0 && <Pagination data={accounts} />}

            {/* Transfer Modal */}
            <div id="transfer-modal" className="modal">
                <div className="modal-box">
                    <h3 className="font-bold text-lg mb-4">
                        {t(
                            "account.transfer_funds",
                            "Transfer Funds Between Accounts",
                        )}
                    </h3>

                    <TransferForm accounts={accounts.data} />

                    <div className="modal-action">
                        <a href="#" className="btn btn-ghost">
                            {t("account.cancel", "Cancel")}
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Transfer Form Component
function TransferForm({ accounts }) {
    const { t } = useTranslation();
    const { data, setData, post, processing, errors } = useForm({
        from_account_id: "",
        to_account_id: "",
        amount: "",
        note: "",
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route("accounts.transfer"), {
            preserveScroll: true,
            onSuccess: () => {
                alert(
                    t(
                        "account.transfer_success",
                        "Transfer completed successfully!",
                    ),
                );
                window.location.href = "#";
            },
        });
    };

    const activeAccounts = accounts.filter((a) => a.is_active);

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="label">
                    <span className="label-text font-bold">
                        {t("account.from_account", "From Account")}
                    </span>
                </label>
                <select
                    value={data.from_account_id}
                    onChange={(e) => setData("from_account_id", e.target.value)}
                    className="select select-bordered w-full"
                    required
                >
                    <option value="">
                        {t("account.select_account", "Select Account")}
                    </option>
                    {activeAccounts.map((account) => (
                        <option key={account.id} value={account.id}>
                            {account.name} - ৳
                            {Number(account.current_balance).toFixed(2)}
                        </option>
                    ))}
                </select>
                {errors.from_account_id && (
                    <p className="text-red-500 text-sm mt-1">
                        {errors.from_account_id}
                    </p>
                )}
            </div>

            <div>
                <label className="label">
                    <span className="label-text font-bold">
                        {t("account.to_account", "To Account")}
                    </span>
                </label>
                <select
                    value={data.to_account_id}
                    onChange={(e) => setData("to_account_id", e.target.value)}
                    className="select select-bordered w-full"
                    required
                >
                    <option value="">
                        {t("account.select_account", "Select Account")}
                    </option>
                    {activeAccounts.map((account) => (
                        <option key={account.id} value={account.id}>
                            {account.name} - ৳
                            {Number(account.current_balance).toFixed(2)}
                        </option>
                    ))}
                </select>
                {errors.to_account_id && (
                    <p className="text-red-500 text-sm mt-1">
                        {errors.to_account_id}
                    </p>
                )}
            </div>

            <div>
                <label className="label">
                    <span className="label-text font-bold">
                        {t("account.amount", "Amount")}
                    </span>
                </label>
                <input
                    type="number"
                    
                    min="0.01"
                    value={data.amount}
                    onChange={(e) => setData("amount", e.target.value)}
                    className="input input-bordered w-full"
                    placeholder="0.00"
                    required
                />
                {errors.amount && (
                    <p className="text-red-500 text-sm mt-1">{errors.amount}</p>
                )}
            </div>

            <div>
                <label className="label">
                    <span className="label-text font-bold">
                        {t("account.note", "Note (Optional)")}
                    </span>
                </label>
                <textarea
                    value={data.note}
                    onChange={(e) => setData("note", e.target.value)}
                    className="textarea textarea-bordered w-full"
                    rows="2"
                    placeholder={t(
                        "account.note_placeholder",
                        "Enter transfer reason...",
                    )}
                />
            </div>

            <div className="flex justify-end gap-2 mt-6">
                <a href="#" className="btn btn-ghost">
                    {t("account.cancel", "Cancel")}
                </a>
                <button
                    type="submit"
                    className="btn bg-red-600 hover:bg-red-700 text-white"
                    disabled={
                        processing ||
                        !data.from_account_id ||
                        !data.to_account_id ||
                        !data.amount
                    }
                >
                    {processing
                        ? t("account.transferring", "Transferring...")
                        : t("account.transfer_now", "Transfer Now")}
                </button>
            </div>
        </form>
    );
}
