import React, { useState } from "react";
import { Link, router } from "@inertiajs/react";
import {
    ArrowLeft,
    RotateCcw,
    CheckCircle,
    Package,
    History,
    X,
    Store,
    Calendar,
    DollarSign,
    Info,
} from "lucide-react";

export default function PickupHoldShow({ hold = {}, accounts = [] }) {
    const [modal, setModal] = useState(null);
    const [selectedItem, setSelectedItem] = useState(null);

    const [quantity, setQuantity] = useState("");
    const [unitPrice, setUnitPrice] = useState("");
    const [paidAmount, setPaidAmount] = useState("");
    const [accountId, setAccountId] = useState("");
    const [notes, setNotes] = useState("");
    const [processing, setProcessing] = useState(false);

    const safeItems = Array.isArray(hold?.items) ? hold.items : [];
    const safeActions = Array.isArray(hold?.actions) ? hold.actions : [];
    const safeAccounts = Array.isArray(accounts) ? accounts : [];

    const formatCurrency = (value) => {
        const num = Number(value) || 0;
        return num.toFixed(2);
    };

    const formatDate = (date) => {
        if (!date) return "N/A";

        try {
            return new Date(date).toLocaleDateString();
        } catch {
            return date;
        }
    };

    const formatVariant = (item) => {
        const attrs = item?.variant?.attribute_values || {};

        if (!attrs || Object.keys(attrs).length === 0) {
            return item?.variant?.sku || "Default Variant";
        }

        return Object.entries(attrs)
            .map(([key, value]) => `${key}: ${value}`)
            .join(" | ");
    };

    const openActionModal = (type, item) => {
        setModal(type);
        setSelectedItem(item);

        setQuantity(item.remaining_quantity || "");

        const defaultPrice =
            type === "sold"
                ? hold.direction === "outgoing"
                    ? item.sale_price
                    : item.unit_price
                : item.unit_price;

        setUnitPrice(defaultPrice || "");
        setPaidAmount("");
        setAccountId("");
        setNotes("");
    };

    const closeModal = () => {
        setModal(null);
        setSelectedItem(null);
        setQuantity("");
        setUnitPrice("");
        setPaidAmount("");
        setAccountId("");
        setNotes("");
        setProcessing(false);
    };

    const submitAction = (e) => {
        e.preventDefault();

        if (!selectedItem || !modal) return;

        const qty = Number(quantity) || 0;

        if (qty <= 0) {
            alert("Quantity must be greater than zero");
            return;
        }

        if (qty > Number(selectedItem.remaining_quantity || 0)) {
            alert("Quantity cannot exceed remaining quantity");
            return;
        }

        const routeName =
            modal === "return"
                ? "pickup-hold-items.return"
                : "pickup-hold-items.sold";

        const payload =
            modal === "return"
                ? {
                      quantity: qty,
                      notes,
                  }
                : {
                      quantity: qty,
                      unit_price: Number(unitPrice) || 0,
                      paid_amount: Number(paidAmount) || 0,
                      account_id: accountId || null,
                      notes,
                  };

        setProcessing(true);

        router.post(route(routeName, selectedItem.id), payload, {
            preserveScroll: true,
            onError: (errors) => {
                console.error(errors);
                alert("Action failed");
            },
            onFinish: () => setProcessing(false),
        });
    };

    const getStatusBadgeClass = (status) => {
        switch (status) {
            case "active":
                return "badge-info";
            case "partial":
                return "badge-warning";
            case "completed":
                return "badge-success";
            case "cancelled":
                return "badge-error";
            default:
                return "badge-neutral";
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
                <div className="mb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                            <Package size={24} className="text-primary" />
                            {hold.hold_no || "Pickup Hold"}
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            {hold.direction === "outgoing"
                                ? "Outgoing: shop took my product on hold"
                                : "Incoming: I took shop product on hold"}
                        </p>
                    </div>

                    <Link href={route("pickup-holds.index")} className="btn btn-outline btn-sm">
                        <ArrowLeft size={16} />
                        Back
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
                    <div className="bg-white rounded-2xl border shadow-sm p-4">
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                            <Store size={13} />
                            Shop
                        </div>
                        <div className="font-black text-lg">{hold.shop?.name || "N/A"}</div>
                        <div className="text-sm text-gray-500">{hold.shop?.phone || "N/A"}</div>
                    </div>

                    <div className="bg-white rounded-2xl border shadow-sm p-4">
                        <div className="text-xs text-gray-500">Total Qty</div>
                        <div className="font-black text-2xl">{hold.total_quantity || 0}</div>
                    </div>

                    <div className="bg-white rounded-2xl border shadow-sm p-4">
                        <div className="text-xs text-gray-500">Remaining Qty</div>
                        <div className="font-black text-2xl text-orange-600">
                            {hold.remaining_quantity || 0}
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border shadow-sm p-4">
                        <div className="text-xs text-gray-500">Status</div>
                        <div>
                            <span className={`badge ${getStatusBadgeClass(hold.status)}`}>
                                {hold.status || "N/A"}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
                    <div className="bg-white rounded-2xl border shadow-sm p-4">
                        <div className="text-xs text-gray-500">Direction</div>
                        <div className="font-bold capitalize">{hold.direction || "N/A"}</div>
                    </div>

                    <div className="bg-white rounded-2xl border shadow-sm p-4">
                        <div className="text-xs text-gray-500">Sold Qty</div>
                        <div className="font-black text-xl text-green-600">
                            {hold.sold_quantity || 0}
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border shadow-sm p-4">
                        <div className="text-xs text-gray-500">Returned Qty</div>
                        <div className="font-black text-xl text-blue-600">
                            {hold.returned_quantity || 0}
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border shadow-sm p-4">
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                            <Calendar size={13} />
                            Hold Date
                        </div>
                        <div className="font-bold">{formatDate(hold.hold_date)}</div>
                    </div>
                </div>

                {hold.notes && (
                    <div className="bg-white rounded-2xl border shadow-sm p-4 mb-5">
                        <div className="text-xs text-gray-500 flex items-center gap-1 mb-1">
                            <Info size={13} />
                            Notes
                        </div>
                        <div className="text-sm text-gray-700">{hold.notes}</div>
                    </div>
                )}

                <div className="bg-white rounded-2xl border shadow-sm overflow-hidden mb-5">
                    <div className="p-5 border-b flex items-center gap-2">
                        <Package size={18} className="text-primary" />
                        <h2 className="font-black text-gray-900">Hold Items</h2>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="table table-zebra">
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Variant</th>
                                    <th>Warehouse</th>
                                    <th>Qty</th>
                                    <th>Remaining</th>
                                    <th>Sold</th>
                                    <th>Returned</th>
                                    <th>Price</th>
                                    <th>Status</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>

                            <tbody>
                                {safeItems.length > 0 ? (
                                    safeItems.map((item) => (
                                        <tr key={item.id}>
                                            <td>
                                                <div className="font-bold">
                                                    {item.product?.name || "N/A"}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {item.product?.product_no || "N/A"}
                                                </div>
                                            </td>

                                            <td className="text-sm">{formatVariant(item)}</td>

                                            <td>{item.warehouse?.name || "N/A"}</td>

                                            <td>
                                                {item.quantity || 0} {item.unit}
                                            </td>

                                            <td className="font-bold text-orange-600">
                                                {item.remaining_quantity || 0}
                                            </td>

                                            <td>{item.sold_quantity || 0}</td>

                                            <td>{item.returned_quantity || 0}</td>

                                            <td>
                                                {hold.direction === "outgoing"
                                                    ? formatCurrency(item.sale_price)
                                                    : formatCurrency(item.unit_price)}
                                            </td>

                                            <td>
                                                <span className="badge badge-neutral">
                                                    {item.status || "N/A"}
                                                </span>
                                            </td>

                                            <td className="text-right">
                                                {Number(item.remaining_quantity || 0) > 0 ? (
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                openActionModal("return", item)
                                                            }
                                                            className="btn btn-outline btn-xs"
                                                        >
                                                            <RotateCcw size={14} />
                                                            Return
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                openActionModal("sold", item)
                                                            }
                                                            className="btn btn-primary btn-xs"
                                                        >
                                                            <CheckCircle size={14} />
                                                            Sold / Confirm
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-400">
                                                        Completed
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="10">
                                            <div className="py-10 text-center text-gray-500">
                                                <Package
                                                    size={34}
                                                    className="mx-auto mb-2 text-gray-300"
                                                />
                                                No hold items found
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                    <div className="p-5 border-b flex items-center gap-2">
                        <History size={18} className="text-primary" />
                        <h2 className="font-black text-gray-900">Action History</h2>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="table table-zebra">
                            <thead>
                                <tr>
                                    <th>Action</th>
                                    <th>Qty</th>
                                    <th>Price</th>
                                    <th>Total</th>
                                    <th>Sale / Purchase</th>
                                    <th>Notes</th>
                                    <th>Date</th>
                                </tr>
                            </thead>

                            <tbody>
                                {safeActions.length > 0 ? (
                                    safeActions.map((action) => (
                                        <tr key={action.id}>
                                            <td>
                                                <span
                                                    className={`badge ${
                                                        action.action_type === "sold"
                                                            ? "badge-success"
                                                            : "badge-info"
                                                    }`}
                                                >
                                                    {action.action_type}
                                                </span>
                                            </td>

                                            <td>{action.quantity || 0}</td>

                                            <td>{formatCurrency(action.unit_price)}</td>

                                            <td>{formatCurrency(action.total_price)}</td>

                                            <td>
                                                {action.sale_id ? (
                                                    <div>Sale #{action.sale_id}</div>
                                                ) : null}

                                                {action.purchase_id ? (
                                                    <div>Purchase #{action.purchase_id}</div>
                                                ) : null}

                                                {!action.sale_id && !action.purchase_id ? "N/A" : null}
                                            </td>

                                            <td>{action.notes || "N/A"}</td>

                                            <td>{formatDate(action.created_at)}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="7">
                                            <div className="py-8 text-center text-gray-500">
                                                No action history yet
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {modal && selectedItem && (
                    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
                        <form
                            onSubmit={submitAction}
                            className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
                        >
                            <div className="p-5 border-b flex items-center justify-between bg-slate-50">
                                <div>
                                    <h3 className="font-black text-lg capitalize">
                                        {modal === "return"
                                            ? "Return Item"
                                            : "Sold / Confirm Item"}
                                    </h3>
                                    <p className="text-xs text-gray-500">
                                        Remaining: {selectedItem.remaining_quantity}{" "}
                                        {selectedItem.unit}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="btn btn-ghost btn-sm btn-circle"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="p-5 space-y-4">
                                <div className="bg-slate-50 rounded-xl p-3">
                                    <div className="font-bold">
                                        {selectedItem.product?.name || "N/A"}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {formatVariant(selectedItem)}
                                    </div>
                                </div>

                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-bold">Quantity</span>
                                    </label>

                                    <input
                                        type="number"
                                        
                                        min="0"
                                        className="input input-bordered"
                                        value={quantity}
                                        onChange={(e) => setQuantity(e.target.value)}
                                    />
                                </div>

                                {modal === "sold" && (
                                    <>
                                        <div className="form-control">
                                            <label className="label">
                                                <span className="label-text font-bold">
                                                    {hold.direction === "outgoing"
                                                        ? "Sale Price"
                                                        : "Purchase Price"}
                                                </span>
                                            </label>

                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                className="input input-bordered"
                                                value={unitPrice}
                                                onChange={(e) =>
                                                    setUnitPrice(e.target.value)
                                                }
                                            />
                                        </div>

                                        <div className="form-control">
                                            <label className="label">
                                                <span className="label-text font-bold">
                                                    Paid Amount
                                                </span>
                                            </label>

                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                className="input input-bordered"
                                                value={paidAmount}
                                                onChange={(e) =>
                                                    setPaidAmount(e.target.value)
                                                }
                                            />
                                        </div>

                                        <div className="form-control">
                                            <label className="label">
                                                <span className="label-text font-bold">
                                                    Account
                                                </span>
                                            </label>

                                            <select
                                                className="select select-bordered"
                                                value={accountId}
                                                onChange={(e) =>
                                                    setAccountId(e.target.value)
                                                }
                                            >
                                                <option value="">Select Account</option>

                                                {safeAccounts.map((account) => (
                                                    <option key={account.id} value={account.id}>
                                                        {account.name} - {account.type}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </>
                                )}

                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-bold">Notes</span>
                                    </label>

                                    <textarea
                                        className="textarea textarea-bordered"
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Optional notes"
                                    />
                                </div>
                            </div>

                            <div className="p-5 border-t flex justify-end gap-2 bg-slate-50">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="btn btn-outline"
                                    disabled={processing}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="btn btn-primary"
                                >
                                    {processing ? "Processing..." : "Submit"}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}
