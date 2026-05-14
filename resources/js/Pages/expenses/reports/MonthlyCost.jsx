import React from "react";
import { Head, Link, router } from "@inertiajs/react";

import {
    CalendarDays,
    Wallet,
    Banknote,
    ListChecks,
    ArrowLeft,
} from "lucide-react";

export default function MonthlyCost({
    expenses,
    categories,
    filters,
    summary,
    categorySummary,
    dailySummary,
}) {
    const formatMoney = (amount) => {
        return Number(amount || 0).toLocaleString("en-BD", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    };

    const handleFilter = (key, value) => {
        router.get(
            route("expense-reports.monthly-cost"),
            {
                ...filters,
                [key]: value,
            },
            {
                preserveState: true,
                replace: true,
            }
        );
    };

    return (
        <>
            <Head title="Monthly Cost Report" />

            <div className="p-6 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
    <div>
        <h1 className="text-2xl font-black text-gray-800">
            Monthly Cost Report
        </h1>

        <p className="text-sm text-gray-500 font-semibold">
            Daily, monthly, category wise and petty cash cost summary
        </p>
    </div>

    <div className="flex flex-wrap items-center gap-2">
        <a
            href={route("expense-reports.monthly-cost.pdf", filters)}
            target="_blank"
            className="btn bg-red-600 hover:bg-red-700 text-white rounded-xl border-none"
        >
            Export PDF
        </a>

        <a
            href={route("expense-reports.monthly-cost.excel", filters)}
            className="btn bg-green-600 hover:bg-green-700 text-white rounded-xl border-none"
        >
            Export Excel
        </a>

        <Link
            href={route("expenses.list")}
            className="btn btn-outline rounded-xl"
        >
            <ArrowLeft size={16} />
            Back to Expenses
        </Link>
    </div>
</div>
                {/* <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-gray-800">
                            Monthly Cost Report
                        </h1>
                        <p className="text-sm text-gray-500 font-semibold">
                            Daily, monthly, category wise and petty cash cost summary
                        </p>
                    </div>

                    <Link
                        href={route("expenses.list")}
                        className="btn btn-outline rounded-xl"
                    >
                        <ArrowLeft size={16} />
                        Back to Expenses
                    </Link>
                </div> */}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
                    <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                            Month
                        </label>
                        <input
                            type="month"
                            value={filters.month}
                            onChange={(e) => handleFilter("month", e.target.value)}
                            className="input input-bordered border-gray-300 rounded-xl w-full"
                        />
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                            Category
                        </label>
                        <select
                            value={filters.category_id || ""}
                            onChange={(e) => handleFilter("category_id", e.target.value)}
                            className="select select-bordered border-gray-300 rounded-xl w-full"
                        >
                            <option value="">All Categories</option>

                            {categories.map((category) => (
                                <option key={category.id} value={category.id}>
                                    {category.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                            Cost Type
                        </label>
                        <select
                            value={filters.cost_type || ""}
                            onChange={(e) => handleFilter("cost_type", e.target.value)}
                            className="select select-bordered border-gray-300 rounded-xl w-full"
                        >
                            <option value="">All Cost</option>
                            <option value="daily">Daily Cost</option>
                            <option value="monthly">Monthly Cost</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <SummaryCard title="Total Cost" amount={summary.total_cost} icon={<Wallet size={20} />} formatMoney={formatMoney} />
                    <SummaryCard title="Daily Cost" amount={summary.daily_cost} icon={<CalendarDays size={20} />} formatMoney={formatMoney} />
                    <SummaryCard title="Monthly Cost" amount={summary.monthly_cost} icon={<ListChecks size={20} />} formatMoney={formatMoney} />
                    <SummaryCard title="Petty Cash" amount={summary.petty_cash_cost} icon={<Banknote size={20} />} formatMoney={formatMoney} />
                    <SummaryCard title="Normal Account" amount={summary.normal_account_cost} icon={<Wallet size={20} />} formatMoney={formatMoney} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ReportTable
                        title="Category Wise Summary"
                        headers={["Category", "Total Entry", "Amount"]}
                        rows={categorySummary.map((item) => [
                            item.category?.name || "Uncategorized",
                            item.total_entry,
                            `৳${formatMoney(item.total_amount)}`,
                        ])}
                    />

                    <ReportTable
                        title="Daily Summary"
                        headers={["Date", "Total Entry", "Amount"]}
                        rows={dailySummary.map((item) => [
                            item.date,
                            item.total_entry,
                            `৳${formatMoney(item.total_amount)}`,
                        ])}
                    />
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
                    <h2 className="font-black text-gray-800 mb-4">
                        Expense Details
                    </h2>

                    <div className="overflow-x-auto">
                        <table className="table table-zebra">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Category</th>
                                    <th>Details</th>
                                    <th>Cost Type</th>
                                    <th>Payment Source</th>
                                    <th className="text-right">Amount</th>
                                </tr>
                            </thead>

                            <tbody>
                                {expenses.map((expense) => (
                                    <tr key={expense.id}>
                                        <td>{expense.date}</td>
                                        <td>{expense.category?.name || "Uncategorized"}</td>
                                        <td>{expense.details || "-"}</td>
                                        <td className="capitalize">{expense.cost_type || "daily"}</td>
                                        <td>
                                            {expense.is_petty_cash_expense
                                                ? "Petty Cash"
                                                : "Normal Account"}
                                        </td>
                                        <td className="text-right font-bold">
                                            ৳{formatMoney(expense.amount)}
                                        </td>
                                    </tr>
                                ))}

                                {expenses.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="text-center text-gray-400">
                                            No expense found for this month
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    );
}

function SummaryCard({ title, amount, icon, formatMoney }) {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                        {title}
                    </p>
                    <h3 className="text-xl font-black text-gray-800 mt-1">
                        ৳{formatMoney(amount)}
                    </h3>
                </div>

                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600">
                    {icon}
                </div>
            </div>
        </div>
    );
}

function ReportTable({ title, headers, rows }) {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
            <h2 className="font-black text-gray-800 mb-4">{title}</h2>

            <div className="overflow-x-auto">
                <table className="table table-zebra">
                    <thead>
                        <tr>
                            {headers.map((header) => (
                                <th key={header} className={header === "Amount" ? "text-right" : ""}>
                                    {header}
                                </th>
                            ))}
                        </tr>
                    </thead>

                    <tbody>
                        {rows.map((row, index) => (
                            <tr key={index}>
                                {row.map((col, colIndex) => (
                                    <td
                                        key={colIndex}
                                        className={colIndex === row.length - 1 ? "text-right font-bold" : ""}
                                    >
                                        {col}
                                    </td>
                                ))}
                            </tr>
                        ))}

                        {rows.length === 0 && (
                            <tr>
                                <td colSpan={headers.length} className="text-center text-gray-400">
                                    No data found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}