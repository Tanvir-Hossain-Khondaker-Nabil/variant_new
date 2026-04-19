import React, { useEffect, useMemo, useState } from "react";
import PageHeader from "../../components/PageHeader";
import { useForm, usePage, router } from "@inertiajs/react";
import {
  Users,
  Save,
  RefreshCw,
  Search,
  Pencil,
  Trash2,
  XCircle,
  UserPlus,
} from "lucide-react";
import { toast } from "react-toastify";
import { useTranslation } from "../../hooks/useTranslation";

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

function Field({
  label,
  value,
  onChange,
  error,
  type = "text",
  required = false,
  placeholder = "",
}) {
  return (
    <div>
      <label className="text-sm font-semibold text-slate-700">
        {label} {required ? <span className="text-rose-600">*</span> : null}
      </label>
      <input
        type={type}
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

export default function Index({ borrowers, filters, outlets = [] }) {
  const { flash } = usePage().props;
  const { locale } = useTranslation();

  const emptyForm = {
    outlet_id: "",
    name: "",
    phone: "",
    email: "",
    address: "",
    is_active: true,
  };

  const [formMode, setFormMode] = useState("create");
  const [editingBorrowerId, setEditingBorrowerId] = useState(null);

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

  useEffect(() => {
    if (flash?.success) toast.success(flash.success);
    if (flash?.error) toast.error(flash.error);
  }, [flash]);

  const totalBorrowers = useMemo(() => borrowers?.total || 0, [borrowers]);
  const activeOnPage = useMemo(
    () => (borrowers?.data || []).filter((item) => item.is_active).length,
    [borrowers]
  );
  const inactiveOnPage = useMemo(
    () => (borrowers?.data || []).filter((item) => !item.is_active).length,
    [borrowers]
  );

  const applyFilters = () => {
    router.get(
      route("borrowers.index"),
      { search, status },
      { preserveScroll: true, preserveState: true }
    );
  };

  const resetFilters = () => {
    setSearch("");
    setStatus("all");
    router.get(route("borrowers.index"), {}, { preserveScroll: true, preserveState: true });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (formMode === "edit" && editingBorrowerId) {
      put(route("borrowers.update", editingBorrowerId), {
        preserveScroll: true,
        onSuccess: () => {
          cancelEdit();
        },
      });
      return;
    }

    post(route("borrowers.store"), {
      preserveScroll: true,
      onSuccess: () => {
        reset(emptyForm);
        setData("is_active", true);
      },
    });
  };

  const handleEdit = (borrower) => {
    setFormMode("edit");
    setEditingBorrowerId(borrower.id);
    clearErrors();

    setData({
      outlet_id: borrower.outlet_id || "",
      name: borrower.name || "",
      phone: borrower.phone || "",
      email: borrower.email || "",
      address: borrower.address || "",
      is_active: !!borrower.is_active,
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setFormMode("create");
    setEditingBorrowerId(null);
    reset();
    clearErrors();
    setData("is_active", true);
  };

  const handleDelete = (borrowerId) => {
    const confirmed = confirm(
      locale === "bn"
        ? "এই borrower ডিলিট করতে চান?"
        : "Do you want to delete this borrower?"
    );

    if (!confirmed) return;

    router.delete(route("borrowers.destroy", borrowerId), {
      preserveScroll: true,
      onSuccess: () => {
        if (editingBorrowerId === borrowerId) {
          cancelEdit();
        }
      },
    });
  };

  return (
    <div className="p-4 lg:p-8">
      <PageHeader
        title={locale === "bn" ? "Borrower ম্যানেজমেন্ট" : "Borrower Management"}
        subtitle={
          locale === "bn"
            ? "একই পেজে borrower create, edit, list ও delete করুন"
            : "Create, edit, list and delete borrowers on one page"
        }
        icon={<Users className="w-5 h-5" />}
      />

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard
          title={locale === "bn" ? "মোট Borrower" : "Total Borrowers"}
          value={totalBorrowers}
        />
        <SummaryCard
          title={locale === "bn" ? "এই পেজে Active" : "Active On This Page"}
          value={activeOnPage}
        />
        <SummaryCard
          title={locale === "bn" ? "এই পেজে Inactive" : "Inactive On This Page"}
          value={inactiveOnPage}
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
                      {locale === "bn" ? "Borrower এডিট" : "Edit Borrower"}
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-5 h-5 text-[#1e4d2b]" />
                      {locale === "bn" ? "নতুন Borrower" : "Create Borrower"}
                    </>
                  )}
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  {formMode === "edit"
                    ? locale === "bn"
                      ? "ফর্ম আপডেট করে borrower edit করুন"
                      : "Update the form to edit this borrower"
                    : locale === "bn"
                    ? "নতুন borrower যোগ করুন"
                    : "Add a new borrower"}
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
                label={locale === "bn" ? "নাম" : "Name"}
                value={data.name}
                onChange={(value) => setData("name", value)}
                error={errors.name}
                required
                placeholder={locale === "bn" ? "Borrower নাম লিখুন" : "Enter borrower name"}
              />

              <Field
                label={locale === "bn" ? "ফোন" : "Phone"}
                type="tel"
                value={data.phone}
                onChange={(value) => setData("phone", value)}
                error={errors.phone}
                placeholder={locale === "bn" ? "ফোন নম্বর লিখুন" : "Enter phone number"}
              />

              <Field
                label={locale === "bn" ? "ইমেইল" : "Email"}
                type="email"
                value={data.email}
                onChange={(value) => setData("email", value)}
                error={errors.email}
                placeholder={locale === "bn" ? "ইমেইল লিখুন" : "Enter email"}
              />

              <div>
                <label className="text-sm font-semibold text-slate-700">
                  {locale === "bn" ? "ঠিকানা" : "Address"}
                </label>
                <textarea
                  value={data.address}
                  onChange={(e) => setData("address", e.target.value)}
                  rows={4}
                  placeholder={locale === "bn" ? "ঠিকানা লিখুন" : "Enter address"}
                  className="mt-1 w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-green-200"
                />
                {errors.address ? (
                  <p className="text-xs text-rose-600 mt-1">{errors.address}</p>
                ) : null}
              </div>

              <SelectField
                label={locale === "bn" ? "স্ট্যাটাস" : "Status"}
                value={data.is_active ? "1" : "0"}
                onChange={(value) => setData("is_active", value === "1")}
                error={errors.is_active}
                options={[
                  { value: "1", label: locale === "bn" ? "Active" : "Active" },
                  { value: "0", label: locale === "bn" ? "Inactive" : "Inactive" },
                ]}
                required
              />

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
                      : "Update Borrower"
                    : locale === "bn"
                    ? "সেভ করুন"
                    : "Save Borrower"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    reset();
                    clearErrors();
                    setData("is_active", true);
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
              <div className="md:col-span-7">
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
                        ? "নাম / ফোন / ইমেইল দিয়ে সার্চ"
                        : "Search by name / phone / email"
                    }
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-green-200"
                  />
                </div>
              </div>

              <div className="md:col-span-3">
                <label className="text-sm font-semibold text-slate-700">
                  {locale === "bn" ? "স্ট্যাটাস" : "Status"}
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="mt-1 w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-green-200"
                >
                  <option value="all">{locale === "bn" ? "সব" : "All"}</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="md:col-span-2 flex gap-2">
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
                    <th className="px-4 py-3 font-bold text-slate-700">
                      {locale === "bn" ? "নাম" : "Name"}
                    </th>
                    <th className="px-4 py-3 font-bold text-slate-700">
                      {locale === "bn" ? "ফোন" : "Phone"}
                    </th>
                    <th className="px-4 py-3 font-bold text-slate-700">
                      {locale === "bn" ? "ইমেইল" : "Email"}
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
                  {borrowers?.data?.length ? (
                    borrowers.data.map((borrower) => (
                      <tr
                        key={borrower.id}
                        className="border-b border-slate-50 hover:bg-slate-50/50"
                      >
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">{borrower.name}</div>
                          {borrower.address ? (
                            <div className="text-xs text-slate-500 line-clamp-1">
                              {borrower.address}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{borrower.phone || "-"}</td>
                        <td className="px-4 py-3 text-slate-700">{borrower.email || "-"}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 rounded-lg text-xs font-bold ${
                              borrower.is_active
                                ? "bg-green-100 text-green-700"
                                : "bg-rose-100 text-rose-700"
                            }`}
                          >
                            {borrower.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleEdit(borrower)}
                              className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 inline-flex items-center gap-2"
                            >
                              <Pencil size={16} />
                              {locale === "bn" ? "এডিট" : "Edit"}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDelete(borrower.id)}
                              className="px-3 py-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 inline-flex items-center gap-2"
                            >
                              <Trash2 size={16} />
                              {locale === "bn" ? "ডিলিট" : "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        className="px-4 py-8 text-center text-slate-500"
                        colSpan={5}
                      >
                        {locale === "bn"
                          ? "কোন borrower পাওয়া যায়নি"
                          : "No borrowers found"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4">
              <Pagination links={borrowers?.links || []} />
            </div>
          </div>
        </div>
      </div>
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