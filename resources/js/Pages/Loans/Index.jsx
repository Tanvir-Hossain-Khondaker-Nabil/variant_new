import React, { useEffect, useMemo, useState } from "react";
import PageHeader from "../../components/PageHeader";
import { Link, router, useForm, usePage } from "@inertiajs/react";
import {
  Wallet,
  Save,
  RefreshCw,
  Search,
  Pencil,
  Trash2,
  Eye,
  CheckCircle2,
  XCircle,
  Send,
  HandCoins,
  Archive,
  Plus,
  X,
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

function SummaryCard({ title, value, subValue = null }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
      <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">
        {title}
      </div>
      <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
      {subValue ? <div className="mt-1 text-xs text-slate-500">{subValue}</div> : null}
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
  placeholder = "",
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
        placeholder={placeholder}
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

export default function Index({ loans, borrowers = [], outlets = [], filters }) {
  const { flash } = usePage().props;
  const { locale } = useTranslation();

  const emptyForm = {
    outlet_id: "",
    borrower_id: "",
    loan_date: getLocalDate(),
    principal_amount: "",
    interest_rate: "",
    interest_type: "flat",
    term_months: 1,
    repayment_frequency: "monthly",
    processing_fee: "",
    penalty_rate: "",
    first_installment_date: "",
    note: "",
    status: "pending",
  };

  const [formMode, setFormMode] = useState("create");
  const [editingLoanId, setEditingLoanId] = useState(null);

  const {
    data,
    setData,
    post,
    put,
    processing,
    errors,
    reset,
    clearErrors,
  } = useForm(emptyForm);

  const [search, setSearch] = useState(filters?.search || "");
  const [status, setStatus] = useState(filters?.status || "all");
  const [borrowerId, setBorrowerId] = useState(filters?.borrower_id || "");
  const [outletId, setOutletId] = useState(filters?.outlet_id || "");

  const [approveLoan, setApproveLoan] = useState(null);
  const [rejectLoan, setRejectLoan] = useState(null);
  const [disburseLoan, setDisburseLoan] = useState(null);
  const [collectLoan, setCollectLoan] = useState(null);
  const [closeLoan, setCloseLoan] = useState(null);

  const approveForm = useForm({
    approved_amount: "",
    approved_date: getLocalDate(),
    first_installment_date: getLocalDate(),
  });

  const rejectForm = useForm({
    note: "",
  });

  const disburseForm = useForm({
    disbursed_date: getLocalDate(),
    disbursed_amount: "",
  });

  const collectForm = useForm({
    loan_id: "",
    payment_date: getLocalDate(),
    amount: "",
    payment_method: "cash",
    reference_no: "",
    note: "",
  });

  const closeForm = useForm({
    closed_date: getLocalDate(),
    note: "",
  });

  useEffect(() => {
    if (flash?.success) toast.success(flash.success);
    if (flash?.error) toast.error(flash.error);
  }, [flash]);

  const stats = useMemo(() => {
    const list = loans?.data || [];

    const totalLoans = loans?.total || 0;
    const activeLoans = list.filter((item) =>
      ["active", "disbursed"].includes(item.status)
    ).length;
    const totalDue = list.reduce((sum, item) => sum + Number(item.due_amount || 0), 0);
    const totalPaid = list.reduce((sum, item) => sum + Number(item.paid_amount || 0), 0);

    return {
      totalLoans,
      activeLoans,
      totalDue,
      totalPaid,
    };
  }, [loans]);

  const estimatedPreview = useMemo(() => {
    const principal = Number(data.principal_amount || 0);
    const rate = Number(data.interest_rate || 0);
    const term = Number(data.term_months || 0);
    const interestType = data.interest_type || "flat";

    if (!principal || !rate || !term) {
      return {
        totalInterest: 0,
        totalPayable: 0,
        installment: 0,
      };
    }

    if (interestType === "flat") {
      const totalInterest = (principal * rate * term) / (100 * 12);
      const totalPayable = principal + totalInterest;
      const installment = totalPayable / Math.max(1, term);

      return {
        totalInterest,
        totalPayable,
        installment,
      };
    }

    const monthlyRate = rate / 100 / 12;
    if (monthlyRate <= 0) {
      const installment = principal / Math.max(1, term);
      const totalPayable = installment * term;
      return {
        totalInterest: totalPayable - principal,
        totalPayable,
        installment,
      };
    }

    const installment =
      (principal * monthlyRate * Math.pow(1 + monthlyRate, term)) /
      (Math.pow(1 + monthlyRate, term) - 1);

    const totalPayable = installment * term;
    const totalInterest = totalPayable - principal;

    return {
      totalInterest,
      totalPayable,
      installment,
    };
  }, [data.principal_amount, data.interest_rate, data.term_months, data.interest_type]);

  const applyFilters = () => {
    router.get(
      route("loans.index"),
      {
        search,
        status,
        borrower_id: borrowerId || null,
        outlet_id: outletId || null,
      },
      { preserveScroll: true, preserveState: true }
    );
  };

  const resetFilters = () => {
    setSearch("");
    setStatus("all");
    setBorrowerId("");
    setOutletId("");
    router.get(route("loans.index"), {}, { preserveScroll: true, preserveState: true });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (formMode === "edit" && editingLoanId) {
      put(route("loans.update", editingLoanId), {
        preserveScroll: true,
        onSuccess: () => {
          cancelEdit();
        },
      });
      return;
    }

    post(route("loans.store"), {
      preserveScroll: true,
      onSuccess: () => {
        reset();
        setData("loan_date", getLocalDate());
        setData("interest_type", "flat");
        setData("term_months", 1);
        setData("repayment_frequency", "monthly");
        setData("status", "pending");
      },
    });
  };

  const handleEdit = (loan) => {
    setFormMode("edit");
    setEditingLoanId(loan.id);
    clearErrors();

    setData({
      outlet_id: loan.outlet_id || "",
      borrower_id: loan.borrower?.id || "",
      loan_date: loan.loan_date || "",
      principal_amount: loan.principal_amount || "",
      interest_rate: loan.interest_rate || "",
      interest_type: loan.interest_type || "flat",
      term_months: loan.term_months || 1,
      repayment_frequency: loan.repayment_frequency || "monthly",
      processing_fee: loan.processing_fee || "",
      penalty_rate: loan.penalty_rate || "",
      first_installment_date: loan.first_installment_date || "",
      note: loan.note || "",
      status: loan.status || "pending",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setFormMode("create");
    setEditingLoanId(null);
    reset();
    clearErrors();
    setData("loan_date", getLocalDate());
    setData("interest_type", "flat");
    setData("term_months", 1);
    setData("repayment_frequency", "monthly");
    setData("status", "pending");
  };

  const handleDelete = (loanId) => {
    const confirmed = confirm(
      locale === "bn"
        ? "এই loan ডিলিট করতে চান?"
        : "Do you want to delete this loan?"
    );

    if (!confirmed) return;

    router.delete(route("loans.destroy", loanId), {
      preserveScroll: true,
      onSuccess: () => {
        if (editingLoanId === loanId) {
          cancelEdit();
        }
      },
    });
  };

  const openApproveModal = (loan) => {
    setApproveLoan(loan);
    approveForm.setData({
      approved_amount: loan.approved_amount || loan.principal_amount || "",
      approved_date: getLocalDate(),
      first_installment_date: getLocalDate(),
    });
    approveForm.clearErrors();
  };

  const submitApprove = (e) => {
    e.preventDefault();
    approveForm.post(route("loans.approve", approveLoan.id), {
      preserveScroll: true,
      onSuccess: () => {
        setApproveLoan(null);
      },
    });
  };

  const openRejectModal = (loan) => {
    setRejectLoan(loan);
    rejectForm.setData({
      note: loan.note || "",
    });
    rejectForm.clearErrors();
  };

  const submitReject = (e) => {
    e.preventDefault();
    rejectForm.post(route("loans.reject", rejectLoan.id), {
      preserveScroll: true,
      onSuccess: () => {
        setRejectLoan(null);
      },
    });
  };

  const openDisburseModal = (loan) => {
    setDisburseLoan(loan);
    disburseForm.setData({
      disbursed_date: getLocalDate(),
      disbursed_amount: loan.approved_amount || loan.principal_amount || "",
    });
    disburseForm.clearErrors();
  };

  const submitDisburse = (e) => {
    e.preventDefault();
    disburseForm.post(route("loans.disburse", disburseLoan.id), {
      preserveScroll: true,
      onSuccess: () => {
        setDisburseLoan(null);
      },
    });
  };

  const openCollectModal = (loan) => {
    setCollectLoan(loan);
    collectForm.setData({
      loan_id: loan.id,
      payment_date: getLocalDate(),
      amount: loan.due_amount || "",
      payment_method: "cash",
      reference_no: "",
      note: "",
    });
    collectForm.clearErrors();
  };

  const submitCollect = (e) => {
    e.preventDefault();
    collectForm.post(route("loanRepayments.collect"), {
      preserveScroll: true,
      onSuccess: () => {
        setCollectLoan(null);
      },
    });
  };

  const openCloseModal = (loan) => {
    setCloseLoan(loan);
    closeForm.setData({
      closed_date: getLocalDate(),
      note: loan.note || "",
    });
    closeForm.clearErrors();
  };

  const submitClose = (e) => {
    e.preventDefault();
    closeForm.post(route("loans.close", closeLoan.id), {
      preserveScroll: true,
      onSuccess: () => {
        setCloseLoan(null);
      },
    });
  };

  return (
    <div className="p-4 lg:p-8">
      <PageHeader
        title={locale === "bn" ? "লোন ম্যানেজমেন্ট" : "Loan Management"}
        subtitle={
          locale === "bn"
            ? "একই পেজে loan create, edit, filter ও actions পরিচালনা করুন"
            : "Create, edit, filter and manage loans on one page"
        }
        icon={<Wallet className="w-5 h-5" />}
        actions={
          <Link
            href={route("loanRepayments.index")}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-semibold"
          >
            <HandCoins size={16} />
            {locale === "bn" ? "রিপেমেন্ট লিস্ট" : "Repayment List"}
          </Link>
        }
      />

      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard
          title={locale === "bn" ? "মোট লোন" : "Total Loans"}
          value={stats.totalLoans}
        />
        <SummaryCard
          title={locale === "bn" ? "Active / Disbursed" : "Active / Disbursed"}
          value={stats.activeLoans}
        />
        <SummaryCard
          title={locale === "bn" ? "এই পেজে মোট Due" : "Total Due On Page"}
          value={money(stats.totalDue)}
        />
        <SummaryCard
          title={locale === "bn" ? "এই পেজে মোট Paid" : "Total Paid On Page"}
          value={money(stats.totalPaid)}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 xl:sticky xl:top-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  {formMode === "edit" ? (
                    <>
                      <Pencil className="w-5 h-5 text-amber-600" />
                      {locale === "bn" ? "লোন এডিট" : "Edit Loan"}
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5 text-[#1e4d2b]" />
                      {locale === "bn" ? "নতুন লোন" : "Create Loan"}
                    </>
                  )}
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  {formMode === "edit"
                    ? locale === "bn"
                      ? "ফর্ম আপডেট করে loan edit করুন"
                      : "Update the form to edit this loan"
                    : locale === "bn"
                    ? "নতুন loan তৈরি করুন"
                    : "Create a new loan"}
                </p>
              </div>

              {formMode === "edit" ? (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-semibold text-slate-700"
                >
                  <XCircle size={16} />
                  {locale === "bn" ? "ক্যানসেল" : "Cancel"}
                </button>
              ) : null}
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <SelectField
                label={locale === "bn" ? "Borrower" : "Borrower"}
                value={data.borrower_id}
                onChange={(value) => setData("borrower_id", value)}
                error={errors.borrower_id}
                required
                options={[
                  {
                    value: "",
                    label: locale === "bn" ? "Borrower নির্বাচন করুন" : "Select borrower",
                  },
                  ...borrowers.map((borrower) => ({
                    value: borrower.id,
                    label: `${borrower.name}${borrower.phone ? ` (${borrower.phone})` : ""}`,
                  })),
                ]}
              />

              <SelectField
                label={locale === "bn" ? "আউটলেট" : "Outlet"}
                value={data.outlet_id}
                onChange={(value) => setData("outlet_id", value)}
                error={errors.outlet_id}
                options={[
                  { value: "", label: locale === "bn" ? "কোনটি নয়" : "None" },
                  ...outlets.map((outlet) => ({
                    value: outlet.id,
                    label: `${outlet.name}${outlet.code ? ` (${outlet.code})` : ""}`,
                  })),
                ]}
              />

              <Field
                label={locale === "bn" ? "লোন তারিখ" : "Loan Date"}
                type="date"
                value={data.loan_date}
                onChange={(value) => setData("loan_date", value)}
                error={errors.loan_date}
                required
              />

              <Field
                label={locale === "bn" ? "মূল টাকা" : "Principal Amount"}
                type="number"
                step="0.01"
                min="1"
                value={data.principal_amount}
                onChange={(value) => setData("principal_amount", value)}
                error={errors.principal_amount}
                required
                placeholder="0.00"
              />

              <Field
                label={locale === "bn" ? "সুদের হার (%)" : "Interest Rate (%)"}
                type="number"
                step="0.01"
                min="0"
                value={data.interest_rate}
                onChange={(value) => setData("interest_rate", value)}
                error={errors.interest_rate}
                required
                placeholder="0.00"
              />

              <SelectField
                label={locale === "bn" ? "সুদের ধরন" : "Interest Type"}
                value={data.interest_type}
                onChange={(value) => setData("interest_type", value)}
                error={errors.interest_type}
                required
                options={[
                  { value: "flat", label: "Flat" },
                  { value: "reducing", label: "Reducing" },
                ]}
              />

              <Field
                label={locale === "bn" ? "মেয়াদ (মাস)" : "Term (Months)"}
                type="number"
                min="1"
                value={data.term_months}
                onChange={(value) => setData("term_months", value)}
                error={errors.term_months}
                required
              />

              <SelectField
                label={locale === "bn" ? "রিপেমেন্ট ফ্রিকোয়েন্সি" : "Repayment Frequency"}
                value={data.repayment_frequency}
                onChange={(value) => setData("repayment_frequency", value)}
                error={errors.repayment_frequency}
                required
                options={[
                  { value: "monthly", label: "Monthly" },
                  { value: "weekly", label: "Weekly" },
                  { value: "daily", label: "Daily" },
                ]}
              />

              <Field
                label={locale === "bn" ? "প্রসেসিং ফি" : "Processing Fee"}
                type="number"
                step="0.01"
                min="0"
                value={data.processing_fee}
                onChange={(value) => setData("processing_fee", value)}
                error={errors.processing_fee}
                placeholder="0.00"
              />

              <Field
                label={locale === "bn" ? "Penalty Rate (%)" : "Penalty Rate (%)"}
                type="number"
                step="0.01"
                min="0"
                value={data.penalty_rate}
                onChange={(value) => setData("penalty_rate", value)}
                error={errors.penalty_rate}
                placeholder="0.00"
              />

              <Field
                label={
                  locale === "bn"
                    ? "প্রথম কিস্তির তারিখ (ঐচ্ছিক)"
                    : "First Installment Date (Optional)"
                }
                type="date"
                value={data.first_installment_date}
                onChange={(value) => setData("first_installment_date", value)}
                error={errors.first_installment_date}
              />

              {formMode === "edit" ? (
                <SelectField
                  label={locale === "bn" ? "স্ট্যাটাস" : "Status"}
                  value={data.status}
                  onChange={(value) => setData("status", value)}
                  error={errors.status}
                  required
                  options={[
                    { value: "pending", label: "Pending" },
                    { value: "approved", label: "Approved" },
                    { value: "rejected", label: "Rejected" },
                    { value: "disbursed", label: "Disbursed" },
                    { value: "active", label: "Active" },
                    { value: "completed", label: "Completed" },
                    { value: "closed", label: "Closed" },
                    { value: "defaulted", label: "Defaulted" },
                  ]}
                />
              ) : null}

              <div>
                <label className="text-sm font-semibold text-slate-700">
                  {locale === "bn" ? "নোট" : "Note"}
                </label>
                <textarea
                  value={data.note}
                  onChange={(e) => setData("note", e.target.value)}
                  rows={4}
                  placeholder={locale === "bn" ? "ঐচ্ছিক নোট লিখুন" : "Write optional note"}
                  className="mt-1 w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-green-200"
                />
                {errors.note ? <p className="text-xs text-rose-600 mt-1">{errors.note}</p> : null}
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                <div className="text-sm font-bold text-slate-800">
                  {locale === "bn" ? "প্রিভিউ" : "Preview"}
                </div>

                <div className="mt-3 space-y-2 text-sm text-slate-600">
                  <div className="flex justify-between gap-3">
                    <span>{locale === "bn" ? "আনুমানিক সুদ" : "Estimated Interest"}</span>
                    <span className="font-semibold">{money(estimatedPreview.totalInterest)}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span>{locale === "bn" ? "মোট পরিশোধযোগ্য" : "Total Payable"}</span>
                    <span className="font-semibold">{money(estimatedPreview.totalPayable)}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span>{locale === "bn" ? "আনুমানিক কিস্তি" : "Estimated Installment"}</span>
                    <span className="font-semibold">{money(estimatedPreview.installment)}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="submit"
                  disabled={processing}
                  className="inline-flex items-center gap-2 bg-[#1e4d2b] hover:bg-[#163a21] disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-semibold"
                >
                  <Save size={16} />
                  {formMode === "edit"
                    ? locale === "bn"
                      ? "আপডেট করুন"
                      : "Update Loan"
                    : locale === "bn"
                    ? "সেভ করুন"
                    : "Save Loan"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    reset();
                    clearErrors();
                    setData("loan_date", getLocalDate());
                    setData("interest_type", "flat");
                    setData("term_months", 1);
                    setData("repayment_frequency", "monthly");
                    setData("status", "pending");
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-semibold"
                >
                  <RefreshCw size={16} />
                  {locale === "bn" ? "রিসেট" : "Reset"}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="xl:col-span-8">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
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
                        ? "কোড / borrower / ফোন"
                        : "Code / borrower / phone"
                    }
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-green-200"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-semibold text-slate-700">
                  {locale === "bn" ? "স্ট্যাটাস" : "Status"}
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="mt-1 w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-green-200"
                >
                  <option value="all">{locale === "bn" ? "সব" : "All"}</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="disbursed">Disbursed</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="closed">Closed</option>
                  <option value="defaulted">Defaulted</option>
                </select>
              </div>

              <div className="md:col-span-3">
                <label className="text-sm font-semibold text-slate-700">
                  {locale === "bn" ? "Borrower" : "Borrower"}
                </label>
                <select
                  value={borrowerId}
                  onChange={(e) => setBorrowerId(e.target.value)}
                  className="mt-1 w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-green-200"
                >
                  <option value="">{locale === "bn" ? "সব" : "All"}</option>
                  {borrowers.map((borrower) => (
                    <option key={borrower.id} value={borrower.id}>
                      {borrower.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-3">
                <label className="text-sm font-semibold text-slate-700">
                  {locale === "bn" ? "আউটলেট" : "Outlet"}
                </label>
                <select
                  value={outletId}
                  onChange={(e) => setOutletId(e.target.value)}
                  className="mt-1 w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-green-200"
                >
                  <option value="">{locale === "bn" ? "সব" : "All"}</option>
                  {outlets.map((outlet) => (
                    <option key={outlet.id} value={outlet.id}>
                      {outlet.name} {outlet.code ? `(${outlet.code})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-12 flex gap-2 justify-end mt-2">
                <button
                  type="button"
                  onClick={applyFilters}
                  className="bg-[#1e4d2b] hover:bg-[#163a21] text-white px-4 py-2.5 rounded-xl font-semibold"
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
                    <th className="px-4 py-3 font-bold text-slate-700">Code</th>
                    <th className="px-4 py-3 font-bold text-slate-700">
                      {locale === "bn" ? "Borrower" : "Borrower"}
                    </th>
                    <th className="px-4 py-3 font-bold text-slate-700">
                      {locale === "bn" ? "তারিখ" : "Loan Date"}
                    </th>
                    <th className="px-4 py-3 font-bold text-slate-700">
                      {locale === "bn" ? "মূল টাকা" : "Principal"}
                    </th>
                    <th className="px-4 py-3 font-bold text-slate-700">
                      {locale === "bn" ? "কিস্তি" : "Installment"}
                    </th>
                    <th className="px-4 py-3 font-bold text-slate-700">
                      {locale === "bn" ? "Paid" : "Paid"}
                    </th>
                    <th className="px-4 py-3 font-bold text-slate-700">
                      {locale === "bn" ? "Due" : "Due"}
                    </th>
                    <th className="px-4 py-3 font-bold text-slate-700">
                      {locale === "bn" ? "স্ট্যাটাস" : "Status"}
                    </th>
                    <th className="px-4 py-3 font-bold text-slate-700 text-right">
                      {locale === "bn" ? "একশন" : "Action"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loans?.data?.length ? (
                    loans.data.map((loan) => {
                      const canEdit = ["pending", "approved"].includes(loan.status);
                      const canDelete = ["pending", "rejected"].includes(loan.status);
                      const canApprove = loan.status === "pending";
                      const canReject = loan.status === "pending";
                      const canDisburse = loan.status === "approved";
                      const canCollect = ["active", "disbursed"].includes(loan.status);
                      const canClose =
                        ["completed", "active", "disbursed"].includes(loan.status) &&
                        Number(loan.due_amount || 0) <= 0.01;

                      return (
                        <tr
                          key={loan.id}
                          className="border-b border-slate-50 hover:bg-slate-50/50"
                        >
                          <td className="px-4 py-3 font-semibold text-slate-900">
                            {loan.code}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-900">
                              {loan.borrower?.name || "-"}
                            </div>
                            <div className="text-xs text-slate-500">
                              {loan.borrower?.phone || "-"}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {loan.loan_date || "-"}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {money(loan.principal_amount)}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {money(loan.installment_amount)}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {money(loan.paid_amount)}
                          </td>
                          <td className="px-4 py-3 text-slate-700 font-semibold">
                            {money(loan.due_amount)}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={loan.status} />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end flex-wrap gap-2">
                              <Link
                                href={route("loans.show", loan.id)}
                                className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 inline-flex items-center gap-2"
                              >
                                <Eye size={16} />
                                {locale === "bn" ? "দেখুন" : "View"}
                              </Link>

                              {canEdit ? (
                                <button
                                  type="button"
                                  onClick={() => handleEdit(loan)}
                                  className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 inline-flex items-center gap-2"
                                >
                                  <Pencil size={16} />
                                  {locale === "bn" ? "এডিট" : "Edit"}
                                </button>
                              ) : null}

                              {canDelete ? (
                                <button
                                  type="button"
                                  onClick={() => handleDelete(loan.id)}
                                  className="px-3 py-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 inline-flex items-center gap-2"
                                >
                                  <Trash2 size={16} />
                                  {locale === "bn" ? "ডিলিট" : "Delete"}
                                </button>
                              ) : null}

                              {canApprove ? (
                                <button
                                  type="button"
                                  onClick={() => openApproveModal(loan)}
                                  className="px-3 py-2 rounded-xl border border-green-200 text-green-700 hover:bg-green-50 inline-flex items-center gap-2"
                                >
                                  <CheckCircle2 size={16} />
                                  {locale === "bn" ? "Approve" : "Approve"}
                                </button>
                              ) : null}

                              {canReject ? (
                                <button
                                  type="button"
                                  onClick={() => openRejectModal(loan)}
                                  className="px-3 py-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 inline-flex items-center gap-2"
                                >
                                  <XCircle size={16} />
                                  {locale === "bn" ? "Reject" : "Reject"}
                                </button>
                              ) : null}

                              {canDisburse ? (
                                <button
                                  type="button"
                                  onClick={() => openDisburseModal(loan)}
                                  className="px-3 py-2 rounded-xl border border-sky-200 text-sky-700 hover:bg-sky-50 inline-flex items-center gap-2"
                                >
                                  <Send size={16} />
                                  {locale === "bn" ? "Disburse" : "Disburse"}
                                </button>
                              ) : null}

                              {canCollect ? (
                                <button
                                  type="button"
                                  onClick={() => openCollectModal(loan)}
                                  className="px-3 py-2 rounded-xl border border-amber-200 text-amber-700 hover:bg-amber-50 inline-flex items-center gap-2"
                                >
                                  <HandCoins size={16} />
                                  {locale === "bn" ? "Collect" : "Collect"}
                                </button>
                              ) : null}

                              {canClose ? (
                                <button
                                  type="button"
                                  onClick={() => openCloseModal(loan)}
                                  className="px-3 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 inline-flex items-center gap-2"
                                >
                                  <Archive size={16} />
                                  {locale === "bn" ? "Close" : "Close"}
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        className="px-4 py-8 text-center text-slate-500"
                        colSpan={9}
                      >
                        {locale === "bn" ? "কোন loan পাওয়া যায়নি" : "No loans found"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4">
              <Pagination links={loans?.links || []} />
            </div>
          </div>
        </div>
      </div>

      {approveLoan ? (
        <ModalWrapper
          title={locale === "bn" ? "লোন Approve" : "Approve Loan"}
          onClose={() => setApproveLoan(null)}
        >
          <form onSubmit={submitApprove} className="p-4 space-y-4">
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 text-sm">
              <div className="font-semibold text-slate-900">{approveLoan.code}</div>
              <div className="text-slate-600 mt-1">
                {approveLoan.borrower?.name || "-"}
              </div>
            </div>

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
              label={
                locale === "bn"
                  ? "প্রথম কিস্তির তারিখ"
                  : "First Installment Date"
              }
              type="date"
              value={approveForm.data.first_installment_date}
              onChange={(value) =>
                approveForm.setData("first_installment_date", value)
              }
              error={approveForm.errors.first_installment_date}
              required
            />

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setApproveLoan(null)}
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

      {rejectLoan ? (
        <ModalWrapper
          title={locale === "bn" ? "লোন Reject" : "Reject Loan"}
          onClose={() => setRejectLoan(null)}
        >
          <form onSubmit={submitReject} className="p-4 space-y-4">
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 text-sm">
              <div className="font-semibold text-slate-900">{rejectLoan.code}</div>
              <div className="text-slate-600 mt-1">
                {rejectLoan.borrower?.name || "-"}
              </div>
            </div>

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
                onClick={() => setRejectLoan(null)}
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

      {disburseLoan ? (
        <ModalWrapper
          title={locale === "bn" ? "লোন Disburse" : "Disburse Loan"}
          onClose={() => setDisburseLoan(null)}
        >
          <form onSubmit={submitDisburse} className="p-4 space-y-4">
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 text-sm">
              <div className="font-semibold text-slate-900">{disburseLoan.code}</div>
              <div className="text-slate-600 mt-1">
                {disburseLoan.borrower?.name || "-"}
              </div>
            </div>

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
                onClick={() => setDisburseLoan(null)}
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

      {collectLoan ? (
        <ModalWrapper
          title={locale === "bn" ? "রিপেমেন্ট সংগ্রহ" : "Collect Repayment"}
          onClose={() => setCollectLoan(null)}
        >
          <form onSubmit={submitCollect} className="p-4 space-y-4">
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 text-sm space-y-1">
              <div className="font-semibold text-slate-900">{collectLoan.code}</div>
              <div className="text-slate-600">{collectLoan.borrower?.name || "-"}</div>
              <div className="flex justify-between gap-3 text-slate-600 pt-1">
                <span>{locale === "bn" ? "Due" : "Due"}</span>
                <span className="font-semibold">{money(collectLoan.due_amount)}</span>
              </div>
            </div>

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
                onClick={() => setCollectLoan(null)}
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

      {closeLoan ? (
        <ModalWrapper
          title={locale === "bn" ? "লোন Close" : "Close Loan"}
          onClose={() => setCloseLoan(null)}
        >
          <form onSubmit={submitClose} className="p-4 space-y-4">
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 text-sm space-y-1">
              <div className="font-semibold text-slate-900">{closeLoan.code}</div>
              <div className="text-slate-600">{closeLoan.borrower?.name || "-"}</div>
              <div className="flex justify-between gap-3 text-slate-600 pt-1">
                <span>{locale === "bn" ? "Due" : "Due"}</span>
                <span className="font-semibold">{money(closeLoan.due_amount)}</span>
              </div>
            </div>

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
                onClick={() => setCloseLoan(null)}
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