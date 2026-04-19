import React, { useEffect, useMemo, useState } from "react";
import PageHeader from "../../components/PageHeader";
import { Link, router, useForm, usePage } from "@inertiajs/react";
import {
  ArrowLeft,
  Wallet,
  HandCoins,
  Send,
  Archive,
  CheckCircle2,
  XCircle,
  X,
  Save,
} from "lucide-react";
import { toast } from "react-toastify";
import { useTranslation } from "../../hooks/useTranslation";

function getLocalDate() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function money(value) {
  return `৳ ${Number(value || 0).toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function StatusBadge({ status }) {
  const map = {
    pending: "bg-amber-100 text-amber-700",
    approved: "bg-sky-100 text-sky-700",
    rejected: "bg-rose-100 text-rose-700",
    disbursed: "bg-indigo-100 text-indigo-700",
    active: "bg-green-100 text-green-700",
    completed: "bg-emerald-100 text-emerald-700",
    closed: "bg-slate-100 text-slate-700",
    defaulted: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`px-2 py-1 rounded-lg text-xs font-bold ${
        map[status] || "bg-slate-100 text-slate-700"
      }`}
    >
      {status}
    </span>
  );
}

function Card({ title, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
      <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">
        {title}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  error,
  type = "text",
  required = false,
  step,
  min,
}) {
  return (
    <div>
      <label className="text-sm font-semibold text-slate-700">
        {label} {required ? <span className="text-rose-600">*</span> : null}
      </label>
      <input
        type={type}
        step={step}
        min={min}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-green-200"
      />
      {error ? <p className="text-xs text-rose-600 mt-1">{error}</p> : null}
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  error,
  options = [],
  required = false,
}) {
  return (
    <div>
      <label className="text-sm font-semibold text-slate-700">
        {label} {required ? <span className="text-rose-600">*</span> : null}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-green-200"
      >
        {options.map((option, index) => (
          <option key={index} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? <p className="text-xs text-rose-600 mt-1">{error}</p> : null}
    </div>
  );
}

function ModalWrapper({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-[9999]">
      <div className="absolute inset-0 bg-black/50" onMouseDown={onClose} />
      <div className="absolute inset-x-0 top-8 mx-auto max-w-lg bg-white rounded-3xl shadow-2xl border border-black/10 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="font-bold text-slate-900">{title}</div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function Show({ loan, schedules = [], repayments = [] }) {
  const { flash } = usePage().props;
  const { locale } = useTranslation();

  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [disburseOpen, setDisburseOpen] = useState(false);
  const [collectOpen, setCollectOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);

  const approveForm = useForm({
    approved_amount: loan?.approved_amount || loan?.principal_amount || "",
    approved_date: getLocalDate(),
    first_installment_date: loan?.first_installment_date || getLocalDate(),
  });

  const rejectForm = useForm({
    note: loan?.note || "",
  });

  const disburseForm = useForm({
    disbursed_date: getLocalDate(),
    disbursed_amount: loan?.approved_amount || loan?.principal_amount || "",
  });

  const collectForm = useForm({
    loan_id: loan?.id || "",
    payment_date: getLocalDate(),
    amount: loan?.due_amount || "",
    payment_method: "cash",
    reference_no: "",
    note: "",
  });

  const closeForm = useForm({
    closed_date: getLocalDate(),
    note: loan?.note || "",
  });

  useEffect(() => {
    if (flash?.success) toast.success(flash.success);
    if (flash?.error) toast.error(flash.error);
  }, [flash]);

  const summary = useMemo(() => {
    const totalPenaltyDue = schedules.reduce(
      (sum, row) => sum + Number(row.penalty_due || 0),
      0
    );

    const paidSchedules = schedules.filter((row) => row.status === "paid").length;
    const overdueSchedules = schedules.filter((row) => row.status === "overdue").length;

    return {
      totalPenaltyDue,
      paidSchedules,
      overdueSchedules,
    };
  }, [schedules]);

  const canApprove = loan?.status === "pending";
  const canReject = loan?.status === "pending";
  const canDisburse = loan?.status === "approved";
  const canCollect = ["active", "disbursed"].includes(loan?.status);
  const canClose =
    ["completed", "active", "disbursed"].includes(loan?.status) &&
    Number(loan?.due_amount || 0) <= 0.01;

  const submitApprove = (e) => {
    e.preventDefault();
    approveForm.post(route("loans.approve", loan.id), {
      preserveScroll: true,
      onSuccess: () => setApproveOpen(false),
    });
  };

  const submitReject = (e) => {
    e.preventDefault();
    rejectForm.post(route("loans.reject", loan.id), {
      preserveScroll: true,
      onSuccess: () => setRejectOpen(false),
    });
  };

  const submitDisburse = (e) => {
    e.preventDefault();
    disburseForm.post(route("loans.disburse", loan.id), {
      preserveScroll: true,
      onSuccess: () => setDisburseOpen(false),
    });
  };

  const submitCollect = (e) => {
    e.preventDefault();
    collectForm.post(route("loanRepayments.collect"), {
      preserveScroll: true,
      onSuccess: () => setCollectOpen(false),
    });
  };

  const submitClose = (e) => {
    e.preventDefault();
    closeForm.post(route("loans.close", loan.id), {
      preserveScroll: true,
      onSuccess: () => setCloseOpen(false),
    });
  };

  return (
    <div className="p-4 lg:p-8">
      <PageHeader
        title={locale === "bn" ? `লোন: ${loan.code}` : `Loan: ${loan.code}`}
        subtitle={
          locale === "bn"
            ? "লোন ডিটেইলস, সিডিউল ও রিপেমেন্ট হিস্ট্রি"
            : "Loan details, schedules and repayment history"
        }
        icon={<Wallet className="w-5 h-5" />}
        actions={
          <div className="flex items-center flex-wrap gap-2">
            {canApprove ? (
              <button
                type="button"
                onClick={() => setApproveOpen(true)}
                className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl font-semibold"
              >
                <CheckCircle2 size={16} />
                {locale === "bn" ? "Approve" : "Approve"}
              </button>
            ) : null}

            {canReject ? (
              <button
                type="button"
                onClick={() => setRejectOpen(true)}
                className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl font-semibold"
              >
                <XCircle size={16} />
                {locale === "bn" ? "Reject" : "Reject"}
              </button>
            ) : null}

            {canDisburse ? (
              <button
                type="button"
                onClick={() => setDisburseOpen(true)}
                className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-xl font-semibold"
              >
                <Send size={16} />
                {locale === "bn" ? "Disburse" : "Disburse"}
              </button>
            ) : null}

            {canCollect ? (
              <button
                type="button"
                onClick={() => setCollectOpen(true)}
                className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl font-semibold"
              >
                <HandCoins size={16} />
                {locale === "bn" ? "Collect" : "Collect"}
              </button>
            ) : null}

            {canClose ? (
              <button
                type="button"
                onClick={() => setCloseOpen(true)}
                className="inline-flex items-center gap-2 bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-xl font-semibold"
              >
                <Archive size={16} />
                {locale === "bn" ? "Close" : "Close"}
              </button>
            ) : null}

            <Link
              href={route("loans.index")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-semibold"
            >
              <ArrowLeft size={16} />
              {locale === "bn" ? "ফিরে যান" : "Back"}
            </Link>
          </div>
        }
      />

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card title={locale === "bn" ? "Borrower" : "Borrower"}>
          <div className="text-lg font-bold text-slate-900">{loan?.borrower?.name || "-"}</div>
          <div className="text-sm text-slate-500 mt-1">{loan?.borrower?.phone || "-"}</div>
          {loan?.borrower?.email ? (
            <div className="text-sm text-slate-500 mt-1">{loan.borrower.email}</div>
          ) : null}
          {loan?.borrower?.address ? (
            <div className="text-sm text-slate-500 mt-2">{loan.borrower.address}</div>
          ) : null}
        </Card>

        <Card title={locale === "bn" ? "লোন সারাংশ" : "Loan Summary"}>
          <div className="space-y-2 text-sm text-slate-600">
            <Row label="Code" value={loan?.code || "-"} />
            <Row label={locale === "bn" ? "Loan Date" : "Loan Date"} value={loan?.loan_date || "-"} />
            <Row label={locale === "bn" ? "Principal" : "Principal"} value={money(loan?.principal_amount)} />
            <Row label={locale === "bn" ? "Rate" : "Rate"} value={`${Number(loan?.interest_rate || 0).toFixed(2)}%`} />
            <Row label={locale === "bn" ? "Interest Type" : "Interest Type"} value={loan?.interest_type || "-"} />
            <Row label={locale === "bn" ? "Term" : "Term"} value={`${loan?.term_months || 0} month(s)`} />
          </div>
        </Card>

        <Card title={locale === "bn" ? "ফিন্যান্সিয়াল সারাংশ" : "Financial Summary"}>
          <div className="space-y-2 text-sm text-slate-600">
            <Row label={locale === "bn" ? "Approved" : "Approved"} value={money(loan?.approved_amount)} />
            <Row label={locale === "bn" ? "Disbursed" : "Disbursed"} value={money(loan?.disbursed_amount)} />
            <Row label={locale === "bn" ? "Installment" : "Installment"} value={money(loan?.installment_amount)} />
            <Row label={locale === "bn" ? "Paid" : "Paid"} value={money(loan?.paid_amount)} />
            <Row label={locale === "bn" ? "Due" : "Due"} value={money(loan?.due_amount)} />
            <Row label={locale === "bn" ? "Penalty" : "Penalty"} value={money(summary.totalPenaltyDue)} />
          </div>
        </Card>

        <Card title={locale === "bn" ? "স্ট্যাটাস ও টাইমলাইন" : "Status & Timeline"}>
          <div className="space-y-2 text-sm text-slate-600">
            <div className="flex justify-between items-center gap-3">
              <span>Status</span>
              <StatusBadge status={loan?.status} />
            </div>
            <Row
              label={locale === "bn" ? "Approved Date" : "Approved Date"}
              value={loan?.approved_date || "-"}
            />
            <Row
              label={locale === "bn" ? "Disbursed Date" : "Disbursed Date"}
              value={loan?.disbursed_date || "-"}
            />
            <Row
              label={
                locale === "bn" ? "First Installment" : "First Installment"
              }
              value={loan?.first_installment_date || "-"}
            />
            <Row
              label={locale === "bn" ? "Maturity Date" : "Maturity Date"}
              value={loan?.maturity_date || "-"}
            />
            <Row
              label={locale === "bn" ? "Closed Date" : "Closed Date"}
              value={loan?.closed_date || "-"}
            />
          </div>
        </Card>
      </div>

      <div className="mt-6 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="text-lg font-bold text-slate-900">
          {locale === "bn" ? "অতিরিক্ত তথ্য" : "Additional Information"}
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <InfoBox
            title={locale === "bn" ? "প্রসেসিং ফি" : "Processing Fee"}
            value={money(loan?.processing_fee)}
          />
          <InfoBox
            title={locale === "bn" ? "Penalty Rate" : "Penalty Rate"}
            value={`${Number(loan?.penalty_rate || 0).toFixed(2)}%`}
          />
          <InfoBox
            title={locale === "bn" ? "Paid Installments" : "Paid Installments"}
            value={`${summary.paidSchedules}`}
            subValue={`${locale === "bn" ? "Overdue" : "Overdue"}: ${summary.overdueSchedules}`}
          />
        </div>

        <div className="mt-5">
          <div className="text-sm font-semibold text-slate-700">
            {locale === "bn" ? "নোট" : "Note"}
          </div>
          <div className="mt-2 text-sm text-slate-600 whitespace-pre-wrap">
            {loan?.note || (locale === "bn" ? "কোন নোট নেই" : "No note available")}
          </div>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <div className="text-lg font-bold text-slate-900">
            {locale === "bn" ? "ইনস্টলমেন্ট সিডিউল" : "Installment Schedule"}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-left">
                <th className="px-4 py-3 font-bold text-slate-700">#</th>
                <th className="px-4 py-3 font-bold text-slate-700">Due Date</th>
                <th className="px-4 py-3 font-bold text-slate-700">Opening</th>
                <th className="px-4 py-3 font-bold text-slate-700">Principal</th>
                <th className="px-4 py-3 font-bold text-slate-700">Interest</th>
                <th className="px-4 py-3 font-bold text-slate-700">Penalty</th>
                <th className="px-4 py-3 font-bold text-slate-700">Total Due</th>
                <th className="px-4 py-3 font-bold text-slate-700">Paid</th>
                <th className="px-4 py-3 font-bold text-slate-700">Status</th>
                <th className="px-4 py-3 font-bold text-slate-700">Paid Date</th>
              </tr>
            </thead>
            <tbody>
              {schedules?.length ? (
                schedules.map((row) => {
                  const rowClass =
                    row.status === "overdue"
                      ? "bg-red-50/60"
                      : row.status === "paid"
                      ? "bg-green-50/40"
                      : row.status === "partial"
                      ? "bg-amber-50/40"
                      : "";

                  return (
                    <tr
                      key={row.id}
                      className={`border-b border-slate-50 hover:bg-slate-50/40 ${rowClass}`}
                    >
                      <td className="px-4 py-3 text-slate-700">{row.installment_no}</td>
                      <td className="px-4 py-3 text-slate-700">{row.due_date}</td>
                      <td className="px-4 py-3 text-slate-700">{money(row.opening_balance)}</td>
                      <td className="px-4 py-3 text-slate-700">{money(row.principal_due)}</td>
                      <td className="px-4 py-3 text-slate-700">{money(row.interest_due)}</td>
                      <td className="px-4 py-3 text-slate-700">{money(row.penalty_due)}</td>
                      <td className="px-4 py-3 text-slate-700 font-semibold">{money(row.total_due)}</td>
                      <td className="px-4 py-3 text-slate-700">{money(row.paid_amount)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-4 py-3 text-slate-700">{row.paid_date || "-"}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={10}>
                    {locale === "bn" ? "কোন সিডিউল নেই" : "No schedules found"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <div className="text-lg font-bold text-slate-900">
            {locale === "bn" ? "রিপেমেন্ট হিস্ট্রি" : "Repayment History"}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-left">
                <th className="px-4 py-3 font-bold text-slate-700">Date</th>
                <th className="px-4 py-3 font-bold text-slate-700">Amount</th>
                <th className="px-4 py-3 font-bold text-slate-700">Principal</th>
                <th className="px-4 py-3 font-bold text-slate-700">Interest</th>
                <th className="px-4 py-3 font-bold text-slate-700">Penalty</th>
                <th className="px-4 py-3 font-bold text-slate-700">Method</th>
                <th className="px-4 py-3 font-bold text-slate-700">Reference</th>
                <th className="px-4 py-3 font-bold text-slate-700">Note</th>
              </tr>
            </thead>
            <tbody>
              {repayments?.length ? (
                repayments.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-slate-50 hover:bg-slate-50/50"
                  >
                    <td className="px-4 py-3 text-slate-700">{row.payment_date}</td>
                    <td className="px-4 py-3 text-slate-700 font-semibold">
                      {money(row.amount)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{money(row.principal_amount)}</td>
                    <td className="px-4 py-3 text-slate-700">{money(row.interest_amount)}</td>
                    <td className="px-4 py-3 text-slate-700">{money(row.penalty_amount)}</td>
                    <td className="px-4 py-3 text-slate-700">{row.payment_method || "-"}</td>
                    <td className="px-4 py-3 text-slate-700">{row.reference_no || "-"}</td>
                    <td className="px-4 py-3 text-slate-700">{row.note || "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={8}>
                    {locale === "bn"
                      ? "কোন রিপেমেন্ট পাওয়া যায়নি"
                      : "No repayments found"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {approveOpen ? (
        <ModalWrapper
          title={locale === "bn" ? "লোন Approve" : "Approve Loan"}
          onClose={() => setApproveOpen(false)}
        >
          <form onSubmit={submitApprove} className="p-4 space-y-4">
            <Field
              label={locale === "bn" ? "Approved Amount" : "Approved Amount"}
              type="number"
              step="0.01"
              min="1"
              value={approveForm.data.approved_amount}
              onChange={(value) => approveForm.setData("approved_amount", value)}
              error={approveForm.errors.approved_amount}
            />

            <Field
              label={locale === "bn" ? "Approved Date" : "Approved Date"}
              type="date"
              value={approveForm.data.approved_date}
              onChange={(value) => approveForm.setData("approved_date", value)}
              error={approveForm.errors.approved_date}
              required
            />

            <Field
              label={locale === "bn" ? "প্রথম কিস্তির তারিখ" : "First Installment Date"}
              type="date"
              value={approveForm.data.first_installment_date}
              onChange={(value) => approveForm.setData("first_installment_date", value)}
              error={approveForm.errors.first_installment_date}
              required
            />

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setApproveOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-semibold"
              >
                {locale === "bn" ? "বাতিল" : "Cancel"}
              </button>
              <button
                type="submit"
                disabled={approveForm.processing}
                className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-semibold"
              >
                <CheckCircle2 size={16} />
                {locale === "bn" ? "Approve করুন" : "Approve"}
              </button>
            </div>
          </form>
        </ModalWrapper>
      ) : null}

      {rejectOpen ? (
        <ModalWrapper
          title={locale === "bn" ? "লোন Reject" : "Reject Loan"}
          onClose={() => setRejectOpen(false)}
        >
          <form onSubmit={submitReject} className="p-4 space-y-4">
            <div>
              <label className="text-sm font-semibold text-slate-700">
                {locale === "bn" ? "নোট" : "Note"}
              </label>
              <textarea
                value={rejectForm.data.note}
                onChange={(e) => rejectForm.setData("note", e.target.value)}
                rows={4}
                className="mt-1 w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-200"
              />
              {rejectForm.errors.note ? (
                <p className="text-xs text-rose-600 mt-1">{rejectForm.errors.note}</p>
              ) : null}
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-semibold"
              >
                {locale === "bn" ? "বাতিল" : "Cancel"}
              </button>
              <button
                type="submit"
                disabled={rejectForm.processing}
                className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-semibold"
              >
                <XCircle size={16} />
                {locale === "bn" ? "Reject করুন" : "Reject"}
              </button>
            </div>
          </form>
        </ModalWrapper>
      ) : null}

      {disburseOpen ? (
        <ModalWrapper
          title={locale === "bn" ? "লোন Disburse" : "Disburse Loan"}
          onClose={() => setDisburseOpen(false)}
        >
          <form onSubmit={submitDisburse} className="p-4 space-y-4">
            <Field
              label={locale === "bn" ? "Disbursed Date" : "Disbursed Date"}
              type="date"
              value={disburseForm.data.disbursed_date}
              onChange={(value) => disburseForm.setData("disbursed_date", value)}
              error={disburseForm.errors.disbursed_date}
              required
            />

            <Field
              label={locale === "bn" ? "Disbursed Amount" : "Disbursed Amount"}
              type="number"
              step="0.01"
              min="1"
              value={disburseForm.data.disbursed_amount}
              onChange={(value) => disburseForm.setData("disbursed_amount", value)}
              error={disburseForm.errors.disbursed_amount}
            />

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDisburseOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-semibold"
              >
                {locale === "bn" ? "বাতিল" : "Cancel"}
              </button>
              <button
                type="submit"
                disabled={disburseForm.processing}
                className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-semibold"
              >
                <Send size={16} />
                {locale === "bn" ? "Disburse করুন" : "Disburse"}
              </button>
            </div>
          </form>
        </ModalWrapper>
      ) : null}

      {collectOpen ? (
        <ModalWrapper
          title={locale === "bn" ? "রিপেমেন্ট সংগ্রহ" : "Collect Repayment"}
          onClose={() => setCollectOpen(false)}
        >
          <form onSubmit={submitCollect} className="p-4 space-y-4">
            <Field
              label={locale === "bn" ? "Payment Date" : "Payment Date"}
              type="date"
              value={collectForm.data.payment_date}
              onChange={(value) => collectForm.setData("payment_date", value)}
              error={collectForm.errors.payment_date}
              required
            />

            <Field
              label={locale === "bn" ? "Amount" : "Amount"}
              type="number"
              step="0.01"
              min="1"
              value={collectForm.data.amount}
              onChange={(value) => collectForm.setData("amount", value)}
              error={collectForm.errors.amount}
              required
            />

            <SelectField
              label={locale === "bn" ? "Payment Method" : "Payment Method"}
              value={collectForm.data.payment_method}
              onChange={(value) => collectForm.setData("payment_method", value)}
              error={collectForm.errors.payment_method}
              required
              options={[
                { value: "cash", label: "Cash" },
                { value: "bank", label: "Bank" },
                { value: "mobile_banking", label: "Mobile Banking" },
                { value: "cheque", label: "Cheque" },
              ]}
            />

            <Field
              label={locale === "bn" ? "Reference No" : "Reference No"}
              value={collectForm.data.reference_no}
              onChange={(value) => collectForm.setData("reference_no", value)}
              error={collectForm.errors.reference_no}
            />

            <div>
              <label className="text-sm font-semibold text-slate-700">
                {locale === "bn" ? "নোট" : "Note"}
              </label>
              <textarea
                value={collectForm.data.note}
                onChange={(e) => collectForm.setData("note", e.target.value)}
                rows={4}
                className="mt-1 w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-200"
              />
              {collectForm.errors.note ? (
                <p className="text-xs text-rose-600 mt-1">{collectForm.errors.note}</p>
              ) : null}
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCollectOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-semibold"
              >
                {locale === "bn" ? "বাতিল" : "Cancel"}
              </button>
              <button
                type="submit"
                disabled={collectForm.processing}
                className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-semibold"
              >
                <HandCoins size={16} />
                {locale === "bn" ? "সংগ্রহ করুন" : "Collect"}
              </button>
            </div>
          </form>
        </ModalWrapper>
      ) : null}

      {closeOpen ? (
        <ModalWrapper
          title={locale === "bn" ? "লোন Close" : "Close Loan"}
          onClose={() => setCloseOpen(false)}
        >
          <form onSubmit={submitClose} className="p-4 space-y-4">
            <Field
              label={locale === "bn" ? "Closed Date" : "Closed Date"}
              type="date"
              value={closeForm.data.closed_date}
              onChange={(value) => closeForm.setData("closed_date", value)}
              error={closeForm.errors.closed_date}
              required
            />

            <div>
              <label className="text-sm font-semibold text-slate-700">
                {locale === "bn" ? "নোট" : "Note"}
              </label>
              <textarea
                value={closeForm.data.note}
                onChange={(e) => closeForm.setData("note", e.target.value)}
                rows={4}
                className="mt-1 w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
              {closeForm.errors.note ? (
                <p className="text-xs text-rose-600 mt-1">{closeForm.errors.note}</p>
              ) : null}
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCloseOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-semibold"
              >
                {locale === "bn" ? "বাতিল" : "Cancel"}
              </button>
              <button
                type="submit"
                disabled={closeForm.processing}
                className="inline-flex items-center gap-2 bg-slate-700 hover:bg-slate-800 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-semibold"
              >
                <Archive size={16} />
                {locale === "bn" ? "Close করুন" : "Close"}
              </button>
            </div>
          </form>
        </ModalWrapper>
      ) : null}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-3">
      <span>{label}</span>
      <span className="font-semibold text-slate-800">{value}</span>
    </div>
  );
}

function InfoBox({ title, value, subValue = null }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {title}
      </div>
      <div className="mt-2 text-xl font-bold text-slate-900">{value}</div>
      {subValue ? <div className="mt-1 text-xs text-slate-500">{subValue}</div> : null}
    </div>
  );
}