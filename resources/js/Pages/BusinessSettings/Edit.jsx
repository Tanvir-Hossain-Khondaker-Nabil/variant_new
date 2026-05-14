import { Link, useForm } from "@inertiajs/react";
import { ArrowLeft, Save, Settings } from "lucide-react";
import PageHeader from "../../components/PageHeader";

export default function Edit({ settings, accounts }) {
    const normalizeTime = (time) => {
        if (!time) return "";
        return time.substring(0, 5);
    };

    const { data, setData, put, processing, errors } = useForm({
        office_start_time: normalizeTime(settings.office_start_time),
        office_end_time: normalizeTime(settings.office_end_time),
        late_after_minutes: settings.late_after_minutes ?? 30,
        late_fee_amount: settings.late_fee_amount ?? 0,
        petty_cash_account_id: settings.petty_cash_account_id ?? "",
        salary_advance_adjustment: Boolean(settings.salary_advance_adjustment),
        auto_late_calculation: Boolean(settings.auto_late_calculation),
    });

    const submit = (e) => {
        e.preventDefault();
        put(route("business-settings.update"), {
            preserveScroll: true,
        });
    };

    return (
        <div className="bg-white rounded-box p-5">
            <PageHeader
                title="Business Settings"
                subtitle="Control office time, late fee, petty cash, and payroll rules dynamically"
            >
                <Link href={route("home")} className="btn btn-sm btn-ghost">
                    <ArrowLeft size={16} />
                    Back
                </Link>
            </PageHeader>

            <form onSubmit={submit} className="max-w-4xl space-y-6">
                <div className="bg-gray-50 rounded-xl p-5 border">
                    <div className="flex items-center gap-2 mb-4">
                        <Settings size={18} className="text-red-600" />
                        <h3 className="font-bold text-lg">Office & Attendance Rules</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="label">
                                <span className="label-text font-bold">Office Start Time *</span>
                            </label>
                            <input
                                type="time"
                                value={data.office_start_time}
                                onChange={(e) => setData("office_start_time", e.target.value)}
                                className="input input-bordered w-full"
                            />
                            {errors.office_start_time && (
                                <p className="text-red-500 text-sm mt-1">{errors.office_start_time}</p>
                            )}
                        </div>

                        <div>
                            <label className="label">
                                <span className="label-text font-bold">Office End Time *</span>
                            </label>
                            <input
                                type="time"
                                value={data.office_end_time}
                                onChange={(e) => setData("office_end_time", e.target.value)}
                                className="input input-bordered w-full"
                            />
                            {errors.office_end_time && (
                                <p className="text-red-500 text-sm mt-1">{errors.office_end_time}</p>
                            )}
                        </div>

                        <div>
                            <label className="label">
                                <span className="label-text font-bold">Late After Minutes *</span>
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={data.late_after_minutes}
                                onChange={(e) => setData("late_after_minutes", e.target.value)}
                                className="input input-bordered w-full"
                                placeholder="Example: 30"
                            />
                            {errors.late_after_minutes && (
                                <p className="text-red-500 text-sm mt-1">{errors.late_after_minutes}</p>
                            )}
                        </div>

                        <div>
                            <label className="label">
                                <span className="label-text font-bold">Late Fee Amount *</span>
                            </label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={data.late_fee_amount}
                                onChange={(e) => setData("late_fee_amount", e.target.value)}
                                className="input input-bordered w-full"
                                placeholder="Example: 100"
                            />
                            {errors.late_fee_amount && (
                                <p className="text-red-500 text-sm mt-1">{errors.late_fee_amount}</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-5 border">
                    <h3 className="font-bold text-lg mb-4">Petty Cash & Payroll Rules</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="label">
                                <span className="label-text font-bold">Petty Cash Account</span>
                            </label>
                            <select
                                value={data.petty_cash_account_id}
                                onChange={(e) => setData("petty_cash_account_id", e.target.value)}
                                className="select select-bordered w-full"
                            >
                                <option value="">Select Petty Cash Account</option>
                                {accounts.map((account) => (
                                    <option key={account.id} value={account.id}>
                                        {account.name} — {account.type} — Balance: {Number(account.current_balance).toFixed(2)}
                                    </option>
                                ))}
                            </select>
                            {errors.petty_cash_account_id && (
                                <p className="text-red-500 text-sm mt-1">{errors.petty_cash_account_id}</p>
                            )}
                        </div>

                        <div className="space-y-4 pt-8">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={data.auto_late_calculation}
                                    onChange={(e) => setData("auto_late_calculation", e.target.checked)}
                                    className="checkbox checkbox-error"
                                />
                                <span className="font-semibold">Enable Auto Late Calculation</span>
                            </label>

                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={data.salary_advance_adjustment}
                                    onChange={(e) => setData("salary_advance_adjustment", e.target.checked)}
                                    className="checkbox checkbox-error"
                                />
                                <span className="font-semibold">Enable Salary Advance Adjustment</span>
                            </label>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={processing}
                        className="btn bg-red-600 hover:bg-red-700 text-white border-none"
                    >
                        <Save size={16} />
                        {processing ? "Saving..." : "Save Settings"}
                    </button>
                </div>
            </form>
        </div>
    );
}