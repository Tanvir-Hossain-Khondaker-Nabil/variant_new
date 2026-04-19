import React, { useEffect, useMemo, useState } from "react";
import PageHeader from "../../components/PageHeader";
import { router, usePage } from "@inertiajs/react";
import { DollarSign, RefreshCw, Search } from "lucide-react";
import { toast } from "react-toastify";
import { useTranslation } from "../../hooks/useTranslation";

function money(value) {
  return `৳ ${Number(value || 0).toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function Pagination({ links = [] }) {
  if (!links?.length) return null;

  return (
    <div className="flex flex-wrap gap-2 justify-end mt-4">
      {links.map((link, index) => (
        <button
          key={index}
          type="button"
          disabled={!link.url}
          onClick={() =>
            link.url &&
            router.visit(link.url, {
              preserveScroll: true,
              preserveState: true,
            })
          }
          className={`px-3 py-2 rounded-lg text-sm border ${
            link.active
              ? "bg-[#1e4d2b] text-white border-[#1e4d2b]"
              : "bg-white hover:bg-slate-50 border-slate-200"
          } ${!link.url ? "opacity-50 cursor-not-allowed" : ""}`}
          dangerouslySetInnerHTML={{ __html: link.label }}
        />
      ))}
    </div>
  );
}

function SummaryCard({ title, value }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
      <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">
        {title}
      </div>
      <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

export default function Index({ repayments, filters }) {
  const { flash } = usePage().props;
  const { locale } = useTranslation();

  const [search, setSearch] = useState(filters?.search || "");
  const [paymentMethod, setPaymentMethod] = useState(filters?.payment_method || "all");
  const [dateFrom, setDateFrom] = useState(filters?.date_from || "");
  const [dateTo, setDateTo] = useState(filters?.date_to || "");

  useEffect(() => {
    if (flash?.success) toast.success(flash.success);
    if (flash?.error) toast.error(flash.error);
  }, [flash]);

  const stats = useMemo(() => {
    const list = repayments?.data || [];

    const totalAmount = list.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const totalPrincipal = list.reduce(
      (sum, item) => sum + Number(item.principal_amount || 0),
      0
    );
    const totalInterest = list.reduce(
      (sum, item) => sum + Number(item.interest_amount || 0),
      0
    );
    const totalPenalty = list.reduce(
      (sum, item) => sum + Number(item.penalty_amount || 0),
      0
    );

    return {
      totalAmount,
      totalPrincipal,
      totalInterest,
      totalPenalty,
    };
  }, [repayments]);

  const applyFilters = () => {
    router.get(
      route("loanRepayments.index"),
      {
        search,
        payment_method: paymentMethod,
        date_from: dateFrom || null,
        date_to: dateTo || null,
      },
      { preserveScroll: true, preserveState: true }
    );
  };

  const resetFilters = () => {
    setSearch("");
    setPaymentMethod("all");
    setDateFrom("");
    setDateTo("");
    router.get(route("loanRepayments.index"), {}, { preserveScroll: true, preserveState: true });
  };

  return (
    <div className="p-4 lg:p-8">
      <PageHeader
        title={locale === "bn" ? "লোন রিপেমেন্ট লিস্ট" : "Loan Repayment List"}
        subtitle={
          locale === "bn"
            ? "সব repayment, breakdown ও payment method দেখুন"
            : "Browse all repayments with breakdown and payment methods"
        }
        icon={<DollarSign className="w-5 h-5" />}
      />

      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard
          title={locale === "bn" ? "মোট আদায়" : "Total Collection"}
          value={money(stats.totalAmount)}
        />
        <SummaryCard
          title={locale === "bn" ? "মূল টাকা" : "Principal"}
          value={money(stats.totalPrincipal)}
        />
        <SummaryCard
          title={locale === "bn" ? "সুদ" : "Interest"}
          value={money(stats.totalInterest)}
        />
        <SummaryCard
          title={locale === "bn" ? "Penalty" : "Penalty"}
          value={money(stats.totalPenalty)}
        />
      </div>

      <div className="mt-6 bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-4">
            <label className="text-sm font-semibold text-slate-700">
              {locale === "bn" ? "সার্চ" : "Search"}
            </label>
            <div className="relative mt-1">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={16}
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                placeholder={
                  locale === "bn"
                    ? "লোন কোড / borrower নাম"
                    : "Loan code / borrower name"
                }
                className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-green-200"
              />
            </div>
          </div>

          <div className="md:col-span-3">
            <label className="text-sm font-semibold text-slate-700">
              {locale === "bn" ? "Payment Method" : "Payment Method"}
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="mt-1 w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-green-200"
            >
              <option value="all">{locale === "bn" ? "সব" : "All"}</option>
              <option value="cash">Cash</option>
              <option value="bank">Bank</option>
              <option value="mobile_banking">Mobile Banking</option>
              <option value="cheque">Cheque</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-semibold text-slate-700">
              {locale === "bn" ? "তারিখ থেকে" : "Date From"}
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="mt-1 w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-green-200"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-semibold text-slate-700">
              {locale === "bn" ? "তারিখ পর্যন্ত" : "Date To"}
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="mt-1 w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-green-200"
            />
          </div>

          <div className="md:col-span-1 flex gap-2">
            <button
              type="button"
              onClick={applyFilters}
              className="flex-1 bg-[#1e4d2b] hover:bg-[#163a21] text-white px-4 py-2.5 rounded-xl font-semibold"
            >
              {locale === "bn" ? "ফিল্টার" : "Apply"}
            </button>
            <button
              type="button"
              onClick={resetFilters}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-semibold"
              title={locale === "bn" ? "রিসেট" : "Reset"}
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-5 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-left">
                <th className="px-4 py-3 font-bold text-slate-700">Date</th>
                <th className="px-4 py-3 font-bold text-slate-700">Loan</th>
                <th className="px-4 py-3 font-bold text-slate-700">
                  {locale === "bn" ? "Borrower" : "Borrower"}
                </th>
                <th className="px-4 py-3 font-bold text-slate-700">Amount</th>
                <th className="px-4 py-3 font-bold text-slate-700">Principal</th>
                <th className="px-4 py-3 font-bold text-slate-700">Interest</th>
                <th className="px-4 py-3 font-bold text-slate-700">Penalty</th>
                <th className="px-4 py-3 font-bold text-slate-700">Method</th>
                <th className="px-4 py-3 font-bold text-slate-700">Ref</th>
                <th className="px-4 py-3 font-bold text-slate-700">Installment</th>
              </tr>
            </thead>
            <tbody>
              {repayments?.data?.length ? (
                repayments.data.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-slate-50 hover:bg-slate-50/50"
                  >
                    <td className="px-4 py-3 text-slate-700">{item.payment_date}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {item.loan?.code || "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {item.loan?.borrower_name || "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-semibold">
                      {money(item.amount)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {money(item.principal_amount)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {money(item.interest_amount)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {money(item.penalty_amount)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{item.payment_method || "-"}</td>
                    <td className="px-4 py-3 text-slate-700">{item.reference_no || "-"}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {item.schedule?.installment_no
                        ? `#${item.schedule.installment_no}`
                        : "-"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={10}>
                    {locale === "bn"
                      ? "কোন repayment পাওয়া যায়নি"
                      : "No repayments found"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4">
          <Pagination links={repayments?.links || []} />
        </div>
      </div>
    </div>
  );
}