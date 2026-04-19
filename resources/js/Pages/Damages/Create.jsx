import PageHeader from "../../components/PageHeader";
import { useForm, router } from "@inertiajs/react";
import { ArrowLeft } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "../../hooks/useTranslation";

export default function CreateDamage({ data, type, accounts = [] }) {
    const { t, locale } = useTranslation();
    const isSale = type === "sale";

    // Parent info
    const parentData = isSale ? data?.sale : data?.purchase;
    const product = data?.product;
    const variant = data?.variant;
    const warehouse = data?.warehouse;

    const form = useForm({
        type,
        item_id: data?.id || "",
        parent_id: parentData?.id || "",
        product_id: product?.id || "",
        variant_id: variant?.id || "",
        warehouse_id: warehouse?.id || "",
        date: new Date().toISOString().split("T")[0],
        quantity: 1,
        reason: "",
        notes: "",
        account_id: "",
        loss_amount: data?.unit_price || product?.price || 0,
    });

    const totalLoss = useMemo(
        () => Number(form.data.loss_amount || 0) * Number(form.data.quantity || 0),
        [form.data.loss_amount, form.data.quantity]
    );

    const goBack = () => {
        if (isSale) router.visit(route("sales.show", parentData?.id));
        else router.visit(route("purchases.show", parentData?.id));
    };

    const formatDate = date =>
        date ? new Date(date).toISOString().split("T")[0] : "-";


    const submit = (e) => {
        e.preventDefault();
        form.post(route("damages.store"), { onSuccess: goBack });
    };

    const InfoRow = ({ label, value }) => (
        <div className="flex items-center justify-between gap-4 py-2">
            <div className="text-xs text-gray-500">{label}</div>
            <div className="text-sm font-medium text-gray-900 text-right">{value || "—"}</div>
        </div>
    );

    return (
        <div className={`${locale === "bn" ? "bangla-font" : ""} max-w-5xl mx-auto`}>
            {/* Header */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <PageHeader
                    title={t("damages.create_damage", "Create Damage Record")}
                    subtitle={t("damages.damage_information", "Damage Information")}
                >
                    <button onClick={goBack} className="btn btn-sm btn-ghost">
                        <ArrowLeft size={15} /> {t("damages.back_to_transaction", "Back to Transaction")}
                    </button>
                </PageHeader>

                {/* Compact top summary */}
                <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-3">
                    <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
                        <div className="text-xs text-gray-700 mb-1">
                            <b>
                                {isSale
                                    ? t("damages.sale_information", "Sale Information")
                                    : t("damages.purchase_information", "Purchase Information")}
                            </b>
                        </div>
                        <InfoRow
                            label={
                                isSale ? t("damages.sale_number", "Sale Number") : t("damages.purchase_number", "Purchase Number")
                            }
                            value={parentData?.reference || parentData?.id}
                        />
                        <div className="border-t border-gray-100" />
                        <InfoRow
                            label={isSale ? t("damages.sale_date") : t("damages.purchase_date")}
                            value={formatDate(parentData?.created_at)}
                        />
                    </div>

                    <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 lg:col-span-2">
                        <div className="text-xs text-gray-500 mb-1">
                           <b>{t("damages.product_information", "Product Information")}</b>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="rounded-lg bg-white border border-gray-100 p-3">
                                <div className="text-xs text-gray-500">{t("damages.product_name", "Product Name")}</div>
                                <div className="text-sm font-semibold text-gray-900 mt-1">{product?.name || "—"} ({product?.product_no })</div>
                            </div>

                            <div className="rounded-lg bg-white border border-gray-100 p-3">
                                <div className="text-xs text-gray-500">{t("damages.variant", "Variant")}</div>
                                <div className="text-sm font-semibold text-gray-900 mt-1">
                                    {variant?.attribute_values[0] || t("damages.n_a", "N/A")}
                                </div>
                            </div>

                            <div className="rounded-lg bg-white border border-gray-100 p-3">
                                <div className="text-xs text-gray-500">{t("damages.warehouse", "Warehouse")}</div>
                                <div className="text-sm font-semibold text-gray-900 mt-1">{warehouse?.name || "—"}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Form */}
            <form onSubmit={submit} className="mt-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Left: Damage Details */}
                    <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-semibold text-gray-900">
                                {t("damages.damage_details", "Damage Details")}
                            </h3>
                            <div className="text-xs text-gray-500">
                                {t("damages.available_quantity", "Available Quantity")}:{" "}
                                <span className="font-semibold text-gray-900">{data?.quantity || 0}</span>
                            </div>
                        </div>

                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Date */}
                            <div className="form-control">
                                <label className="label py-1">
                                    <span className="label-text text-sm">
                                        {t("damages.damage_date", "Damage Date")} <span className="text-red-500">*</span>
                                    </span>
                                </label>
                                <input
                                    type="date"
                                    className="input input-bordered rounded-xl"
                                    value={form.data.date}
                                    onChange={(e) => form.setData("date", e.target.value)}
                                    required
                                />
                            </div>

                            {/* Quantity */}
                            <div className="form-control">
                                <label className="label py-1">
                                    <span className="label-text text-sm">
                                        {t("damages.damaged_quantity", "Damaged Quantity")} <span className="text-red-500">*</span>
                                    </span>
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max={data?.quantity || 9999}
                                    className="input input-bordered rounded-xl"
                                    value={form.data.quantity}
                                    onChange={(e) => {
                                        const value = parseInt(e.target.value, 10) || 0;
                                        const maxQuantity = data?.quantity || 9999;
                                        form.setData("quantity", Math.min(Math.max(value, 1), maxQuantity));
                                    }}
                                    required
                                />
                            </div>

                            {/* Account */}
                            <div className="form-control md:col-span-2">
                                <label className="label py-1">
                                    <span className="label-text text-sm">
                                        {t("damages.account", "Account")} <span className="text-red-500">*</span>
                                    </span>
                                </label>
                                <select
                                    className="select select-bordered rounded-xl"
                                    value={form.data.account_id}
                                    onChange={(e) => form.setData("account_id", e.target.value)}
                                    required
                                >
                                    <option value="">{t("damages.select_account", "Select Account")}</option>
                                    {accounts.map((account) => (
                                        <option key={account.id} value={account.id}>
                                            {account.name} (Balance: {account.current_balance})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Loss amount (readonly) */}
                            <div className="form-control">
                                <label className="label py-1">
                                    <span className="label-text text-sm">
                                        {t("damages.loss_amount_per_unit", "Loss Amount per Unit")} <span className="text-red-500">*</span>
                                    </span>
                                </label>
                                <input
                                    type="number"
                                    
                                    min="0"
                                    className="input input-bordered rounded-xl"
                                    value={form.data.loss_amount}
                                    onChange={(e) => form.setData("loss_amount", parseFloat(e.target.value) || 0)}
                                    readOnly
                                    required
                                />
                                <div className="mt-1 text-xs text-gray-500">
                                    {t("damages.loss_amount_locked", "Loss amount is auto-set from unit price.")}
                                </div>
                            </div>

                            {/* Reason */}
                            <div className="form-control">
                                <label className="label py-1">
                                    <span className="label-text text-sm">
                                        {t("damages.damage_reason", "Damage Reason")} <span className="text-red-500">*</span>
                                    </span>
                                </label>
                                <select
                                    className="select select-bordered rounded-xl"
                                    value={form.data.reason}
                                    onChange={(e) => form.setData("reason", e.target.value)}
                                    required
                                >
                                    <option value="">{t("damages.select_reason", "Select Reason")}</option>
                                    <option value="transport">{t("damages.transport_damage", "Transport Damage")}</option>
                                    <option value="storage">{t("damages.storage_damage", "Storage Damage")}</option>
                                    <option value="manufacturing">{t("damages.manufacturing_defect", "Manufacturing Defect")}</option>
                                    <option value="expired">{t("damages.expired_product", "Expired Product")}</option>
                                    <option value="handling">{t("damages.mishandling", "Mishandling")}</option>
                                    <option value="other">{t("damages.other", "Other")}</option>
                                </select>
                            </div>

                            {/* Notes */}
                            <div className="form-control md:col-span-2">
                                <label className="label py-1">
                                    <span className="label-text text-sm">{t("damages.notes", "Notes")}</span>
                                </label>
                                <textarea
                                    className="textarea textarea-bordered rounded-xl"
                                    rows={4}
                                    placeholder={t("damages.additional_notes_placeholder", "Additional notes about the damage...")}
                                    value={form.data.notes}
                                    onChange={(e) => form.setData("notes", e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Errors */}
                        {Object.keys(form.errors).length > 0 && (
                            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                                <div className="font-semibold">{t("damages.form_errors", "Please fix the following errors:")}</div>
                                <ul className="mt-2 list-disc pl-5">
                                    {Object.entries(form.errors).map(([key, error]) => (
                                        <li key={key}>{error}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="mt-5 flex flex-wrap gap-3">
                            <button
                                type="submit"
                                className="btn rounded-xl bg-[#1e4d2b] text-white hover:bg-[#173b22]"
                                disabled={form.processing}
                            >
                                {form.processing ? t("damages.saving", "Saving...") : t("damages.create_damage_record", "Create Damage")}
                            </button>
                            <button type="button" onClick={goBack} className="btn btn-ghost rounded-xl">
                                {t("damages.cancel", "Cancel")}
                            </button>
                        </div>
                    </div>

                    {/* Right: Summary */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 h-fit">
                        <h3 className="text-base font-semibold text-gray-900">{t("damages.summary", "Summary")}</h3>

                        <div className="mt-4 space-y-3">
                            <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
                                <div className="text-xs text-gray-500">{t("damages.damaged_quantity", "Damaged Quantity")}</div>
                                <div className="text-2xl font-bold text-gray-900 mt-1">{form.data.quantity}</div>
                            </div>

                            <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
                                <div className="text-xs text-gray-500">{t("damages.total_loss", "Total Loss")}</div>
                                <div className="text-2xl font-bold text-red-600 mt-1">{totalLoss.toFixed(2)}</div>
                            </div>

                            <div className="text-xs text-gray-500">
                                {t(
                                    "damages.summary_hint",
                                    "Tip: quantity is limited by available stock of the item in this transaction."
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}
