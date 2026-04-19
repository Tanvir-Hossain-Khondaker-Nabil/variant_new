import { useForm, router } from "@inertiajs/react";
import {
    ArrowLeft,
    Save,
    User,
    Building,
    Calendar,
    CreditCard,
    CheckCircle,
    Clock,
    Star,
    FileText,
    Zap,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useTranslation } from "../../hooks/useTranslation";

export default function Edit({ subscription, plans }) {
    const { t, locale } = useTranslation();
    const { data, setData, post, processing, errors } = useForm({
        plan_id: subscription.plan_id,
        start_date: new Date().toISOString().split("T")[0],
        end_date: "",
        amount: subscription.plan?.price || "",
        payment_method: "",
        transaction_id: "",
        notes: subscription.notes || "",
        auto_renew: subscription.auto_renew || false,
        renew_type: "same_plan",
    });

    const [selectedPlan, setSelectedPlan] = useState(subscription.plan || null);
    const [renewOption, setRenewOption] = useState("same_plan");
    const [showUpgradeWarning, setShowUpgradeWarning] = useState(false);

    const gradient = "linear-gradient(rgb(15, 45, 26) 0%, rgb(30, 77, 43) 100%)";

    useEffect(() => {
        if (subscription.plan) {
            setSelectedPlan(subscription.plan);
            setData("amount", subscription.plan.price);

            const startDate = new Date();
            const endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + parseInt(subscription.plan.validity));
            setData("end_date", endDate.toISOString().split("T")[0]);
        }
    }, [subscription]);

    // Handle plan selection
    const handlePlanSelect = (planId) => {
        const plan = plans.find((p) => p.id == planId);
        if (plan) {
            setSelectedPlan(plan);
            setData("plan_id", planId);
            setData("amount", plan.price);

            // Calculate end date based on plan validity
            if (data.start_date && plan.validity) {
                const startDate = new Date(data.start_date);
                const endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + parseInt(plan.validity));
                setData("end_date", endDate.toISOString().split("T")[0]);
            }

            // Show upgrade warning if selecting a higher-priced plan
            if (plan.price > subscription.plan.price) {
                setShowUpgradeWarning(true);
                setRenewOption("upgrade");
            } else if (plan.price < subscription.plan.price) {
                setRenewOption("downgrade");
            } else {
                setRenewOption("same_plan");
            }
        }
    };

    // Handle start date change
    const handleStartDateChange = (date) => {
        setData("start_date", date);
        if (selectedPlan && date) {
            const startDate = new Date(date);
            const endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + parseInt(selectedPlan.validity));
            setData("end_date", endDate.toISOString().split("T")[0]);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route("subscriptions.renew", { subscription: subscription.id }));
    };

    // Format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat("en-BD", {
            style: "currency",
            currency: "BDT",
            minimumFractionDigits: 2,
        }).format(amount);
    };

    // Calculate price difference
    const getPriceDifference = () => {
        if (!selectedPlan) return 0;
        return selectedPlan.price - subscription.plan.price;
    };

    // Get status color
    const getStatusColor = (status) => {
        const colors = {
            1: "text-green-700 bg-green-50 border-green-200",
            2: "text-red-700 bg-red-50 border-red-200",
            3: "text-orange-700 bg-orange-50 border-orange-200",
            4: "text-blue-700 bg-blue-50 border-blue-200",
        };
        return colors[status] || "text-gray-700 bg-gray-50 border-gray-200";
    };

    return (
        <div className={`min-h-screen bg-slate-50 p-6 ${locale === "bn" ? "bangla-font" : ""}`}>
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div
                    className="rounded-2xl p-8 text-white shadow-lg mb-8"
                    style={{ background: gradient }}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-extrabold">
                                {t("subscription.update_subscription", "Update Subscription")}
                            </h1>
                            <p className="text-white/80 mt-2">
                                {t("subscription.reactivate_modify_plan", "Reactivate or modify the subscription plan")}
                            </p>
                        </div>
                        <a
                            href={route("subscriptions.index")}
                            className="group flex items-center gap-2 px-5 py-2 bg-white/15 rounded-xl hover:bg-white/25 transition-all"
                        >
                            <ArrowLeft size={18} />
                            <span className="font-semibold">{t("subscription.back", "Back")}</span>
                        </a>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Current Subscription Status */}
                    <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
                        <div className="px-6 py-4 text-white font-bold text-lg flex items-center gap-2" style={{ background: gradient }}>
                            <Zap size={20} />
                            {t("subscription.current_subscription", "Current Subscription")}
                        </div>

                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                                <div className="text-center p-4 border rounded-xl bg-emerald-50 border-emerald-200">
                                    <p className="text-sm text-gray-600">
                                        {t("subscription.current_plan", "Current Plan")}
                                    </p>
                                    <p className="font-semibold text-emerald-800">{subscription.plan?.name}</p>
                                </div>

                                <div className="text-center p-4 border rounded-xl bg-emerald-50 border-emerald-200">
                                    <p className="text-sm text-gray-600">
                                        {t("subscription.current_price", "Current Price")}
                                    </p>
                                    <p className="font-semibold text-emerald-800">
                                        {formatCurrency(subscription.plan?.price)}
                                    </p>
                                </div>

                                <div className={`text-center p-4 border rounded-xl ${getStatusColor(subscription.status)}`}>
                                    <p className="text-sm text-gray-600">{t("subscription.status", "Status")}</p>
                                    <p className="font-semibold capitalize">
                                        {subscription.status == 1
                                            ? t("subscription.active", "active")
                                            : subscription.status == 2
                                                ? t("subscription.expired", "expired")
                                                : subscription.status == 3
                                                    ? t("subscription.cancelled", "cancelled")
                                                    : subscription.status == 4
                                                        ? t("subscription.pending", "pending")
                                                        : "unknown"}
                                    </p>
                                </div>

                                <div className="text-center p-4 border rounded-xl bg-emerald-50 border-emerald-200">
                                    <p className="text-sm text-gray-600">{t("subscription.expires", "Expires")}</p>
                                    <p className="font-semibold text-emerald-800">
                                        {subscription.end_date
                                            ? new Date(subscription.end_date).toLocaleDateString()
                                            : "N/A"}
                                    </p>
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                                    <User size={18} />
                                    {t("subscription.user_information", "User Information")}
                                </h4>
                                <p className="text-gray-700">
                                    <strong>{subscription.user?.name}</strong> • {subscription.user?.email}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Plan Selection */}
                    <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
                        <div className="px-6 py-4 text-white font-bold text-lg flex items-center gap-2" style={{ background: gradient }}>
                            <Star size={20} />
                            {t("subscription.select_plan", "Select Plan")}
                        </div>

                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                    <Star size={16} className="text-emerald-700" />
                                    {t("subscription.select_plan", "Select Plan")}
                                    <span className="text-red-500 ml-1">{t("subscription.required_field", "*")}</span>
                                </label>

                                <select
                                    value={data.plan_id}
                                    onChange={(e) => handlePlanSelect(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-200 focus:border-emerald-400 transition"
                                >
                                    <option value={subscription.plan_id}>
                                        {subscription.plan?.name} - {formatCurrency(subscription.plan?.price)} (
                                        {t("subscription.current", "Current")})
                                    </option>

                                    {plans
                                        .filter((plan) => plan.id !== subscription.plan_id)
                                        .map((plan) => (
                                            <option key={plan.id} value={plan.id}>
                                                {plan.name} - {formatCurrency(plan.price)} - {plan.validity}{" "}
                                                {t("subscription.days", "days")}
                                            </option>
                                        ))}
                                </select>

                                {errors.plan_id && <p className="text-red-500 text-sm mt-2">{errors.plan_id}</p>}
                            </div>

                            {selectedPlan && selectedPlan.id !== subscription.plan_id && (
                                <div className="border rounded-2xl p-5 bg-emerald-50 border-emerald-200">
                                    <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                                        <CheckCircle size={18} className="text-emerald-700" />
                                        {selectedPlan.price > subscription.plan.price
                                            ? t("subscription.upgrade", "Upgrade")
                                            : selectedPlan.price < subscription.plan.price
                                                ? t("subscription.downgrade", "Downgrade")
                                                : t("subscription.same_plan", "Same")}{" "}
                                        {t("subscription.plan_details", "Plan Details")}
                                    </h4>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                        <div>
                                            <span className="font-semibold text-gray-700">
                                                {t("subscription.plan_name", "Plan Name")}:
                                            </span>
                                            <p className="text-emerald-800 font-medium">{selectedPlan.name}</p>
                                        </div>
                                        <div>
                                            <span className="font-semibold text-gray-700">
                                                {t("subscription.price", "Price")}:
                                            </span>
                                            <p className="text-emerald-800 font-medium">
                                                {formatCurrency(selectedPlan.price)}
                                            </p>
                                        </div>
                                        <div>
                                            <span className="font-semibold text-gray-700">
                                                {t("subscription.validity", "Validity")}:
                                            </span>
                                            <p className="text-emerald-800 font-medium">
                                                {selectedPlan.validity} {t("subscription.days", "days")}
                                            </p>
                                        </div>
                                    </div>

                                    {selectedPlan.price !== subscription.plan.price && (
                                        <div className="mt-4 pt-4 border-t border-emerald-200">
                                            <div className="flex justify-between items-center">
                                                <span className="font-semibold text-gray-700">
                                                    {t("subscription.price_difference", "Price Difference")}:
                                                </span>
                                                <span className="font-extrabold text-lg text-emerald-800">
                                                    {getPriceDifference() > 0 ? "+" : ""}
                                                    {formatCurrency(getPriceDifference())}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                    <Calendar size={16} className="text-emerald-700" />
                                    {t("subscription.start_date", "Start Date")}
                                    <span className="text-red-500 ml-1">{t("subscription.required_field", "*")}</span>
                                </label>

                                <input
                                    type="date"
                                    value={data.start_date}
                                    onChange={(e) => handleStartDateChange(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-200 focus:border-emerald-400 transition bg-gray-50"
                                />
                                {errors.start_date && <p className="text-red-500 text-sm mt-2">{errors.start_date}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                    <Clock size={16} className="text-emerald-700" />
                                    {t("subscription.end_date", "End Date")}
                                    <span className="text-red-500 ml-1">{t("subscription.required_field", "*")}</span>
                                </label>

                                <input
                                    type="date"
                                    value={data.end_date}
                                    onChange={(e) => setData("end_date", e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50"
                                    readOnly
                                />
                                {errors.end_date && <p className="text-red-500 text-sm mt-2">{errors.end_date}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                    ৳ {t("subscription.amount", "Amount")}
                                    <span className="text-red-500 ml-1">{t("subscription.required_field", "*")}</span>
                                </label>

                                <input
                                    type="number"
                                    value={data.amount}
                                    onChange={(e) => setData("amount", e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50"
                                    placeholder="0.00"
                                    
                                    min="0"
                                    readOnly
                                />
                                {errors.amount && <p className="text-red-500 text-sm mt-2">{errors.amount}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                    <Building size={16} className="text-emerald-700" />
                                    {t("subscription.payment_method", "Payment Method")}
                                </label>

                                <select
                                    value={data.payment_method}
                                    onChange={(e) => setData("payment_method", e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-200 focus:border-emerald-400 transition"
                                >
                                    <option value="">{t("subscription.select_payment_method", "Select payment method")}</option>
                                    <option value="adjust_deposit">Adjust User Deposit</option>
                                    <option value="cash">{t("subscription.cash", "Cash")}</option>
                                    <option value="card">{t("subscription.card", "Credit Card")}</option>
                                    <option value="bank">{t("subscription.bank", "Bank Transfer")}</option>
                                    <option value="mobile">{t("subscription.mobile", "Mobile Banking")}</option>
                                </select>

                                {errors.payment_method && (
                                    <p className="text-red-500 text-sm mt-2">{errors.payment_method}</p>
                                )}
                            </div>


                            {
                                data.payment_method !== 'adjust_deposit' &&
                                data.payment_method !== 'cash' && (
                                    <div xclassName="md:col-span-2">
                                        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                            <CreditCard size={16} className="text-emerald-700" />
                                            {t("subscription.transaction_id", "Transaction ID")}
                                        </label>

                                        <input
                                            type="text"
                                            value={data.transaction_id}
                                            onChange={(e) => setData("transaction_id", e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-200 focus:border-emerald-400 transition"
                                            placeholder={t("subscription.transaction_placeholder", "Enter transaction ID (if applicable)")}
                                            required
                                        />
                                        {errors.transaction_id && (
                                            <p className="text-red-500 text-sm mt-2">{errors.transaction_id}</p>
                                        )}
                                    </div>

                            )}



                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    {t("subscription.renewal_notes", "Renewal Notes")}
                                </label>

                                <textarea
                                    value={data.notes}
                                    onChange={(e) => setData("notes", e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-200 focus:border-emerald-400 transition resize-none"
                                    rows={4}
                                    placeholder={t("subscription.renewal_notes_placeholder", "Any additional notes about this renewal or upgrade...")}
                                />
                                {errors.notes && <p className="text-red-500 text-sm mt-2">{errors.notes}</p>}
                            </div>

                        </div>
                    </div>




                    {/* Additional Information */}
                    <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
                        <div className="px-6 py-4 text-white font-bold text-lg flex items-center gap-2" style={{ background: gradient }}>
                            <FileText size={20} />
                            {t("subscription.additional_information", "Additional Information")}
                        </div>


                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-4">
                        <a
                            href={route("subscriptions.index")}
                            className="px-6 py-3 rounded-xl font-semibold border border-gray-300 bg-white hover:border-emerald-300 hover:text-emerald-800 transition"
                        >
                            {t("subscription.cancel", "Cancel")}
                        </a>

                        <button
                            disabled={processing}
                            className={`px-8 py-3 rounded-xl font-bold text-white shadow-md hover:shadow-lg transition ${processing ? "bg-gray-400 cursor-not-allowed" : ""
                                }`}
                            style={!processing ? { background: gradient } : {}}
                        >
                            <Save size={18} className="inline mr-2" />
                            {processing
                                ? t("subscription.updating_subscription", "Updating...")
                                : t("subscription.update_subscription", "Update Subscription")}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
