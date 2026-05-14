import React, { useState } from "react";
import { Link, router } from "@inertiajs/react";
import {
    Plus,
    Eye,
    Filter,
    X,
    Search,
    Package,
    Store,
    ArrowRightLeft,
    RotateCcw,
    CheckCircle,
    Calendar,
} from "lucide-react";

export default function PickupHoldIndex({ holds = {}, filters = {}, shops = [] }) {
    const safeHolds = Array.isArray(holds?.data) ? holds.data : [];
    const safeLinks = Array.isArray(holds?.links) ? holds.links : [];

    const [localFilters, setLocalFilters] = useState({
        search: filters?.search || "",
        direction: filters?.direction || "",
        status: filters?.status || "",
        shop_id: filters?.shop_id || "",
        date_from: filters?.date_from || "",
        date_to: filters?.date_to || "",
    });

    const applyFilters = () => {
        const params = {};

        Object.entries(localFilters).forEach(([key, value]) => {
            if (value !== "" && value !== null && value !== undefined) {
                params[key] = value;
            }
        });

        router.get(route("pickup-holds.index"), params, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    };

    const clearFilters = () => {
        const emptyFilters = {
            search: "",
            direction: "",
            status: "",
            shop_id: "",
            date_from: "",
            date_to: "",
        };

        setLocalFilters(emptyFilters);

        router.get(route("pickup-holds.index"), {}, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    };

    const visitPage = (url) => {
        if (!url) return;

        router.visit(url, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
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

    const getDirectionBadgeClass = (direction) => {
        if (direction === "outgoing") return "badge-primary";
        if (direction === "incoming") return "badge-secondary";
        return "badge-neutral";
    };

    const formatDate = (date) => {
        if (!date) return "N/A";

        try {
            return new Date(date).toLocaleDateString();
        } catch {
            return date;
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                            <Package size={24} className="text-primary" />
                            Pickup Holds
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Manage outgoing and incoming pickup hold products.
                        </p>
                    </div>

                    <Link href={route("pickup-holds.create")} className="btn btn-primary btn-sm">
                        <Plus size={16} />
                        New Pickup Hold
                    </Link>
                </div>

                <div className="bg-white rounded-2xl border shadow-sm p-4 mb-5">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="md:col-span-2 relative">
                            <Search
                                size={15}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                            />
                            <input
                                className="input input-bordered input-sm w-full pl-9"
                                placeholder="Search hold, shop, product"
                                value={localFilters.search}
                                onChange={(e) =>
                                    setLocalFilters((prev) => ({
                                        ...prev,
                                        search: e.target.value,
                                    }))
                                }
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") applyFilters();
                                }}
                            />
                        </div>

                        <select
                            className="select select-bordered select-sm"
                            value={localFilters.direction}
                            onChange={(e) =>
                                setLocalFilters((prev) => ({
                                    ...prev,
                                    direction: e.target.value,
                                }))
                            }
                        >
                            <option value="">All Direction</option>
                            <option value="outgoing">Outgoing</option>
                            <option value="incoming">Incoming</option>
                        </select>

                        <select
                            className="select select-bordered select-sm"
                            value={localFilters.status}
                            onChange={(e) =>
                                setLocalFilters((prev) => ({
                                    ...prev,
                                    status: e.target.value,
                                }))
                            }
                        >
                            <option value="">All Status</option>
                            <option value="active">Active</option>
                            <option value="partial">Partial</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                        </select>

                        <select
                            className="select select-bordered select-sm"
                            value={localFilters.shop_id}
                            onChange={(e) =>
                                setLocalFilters((prev) => ({
                                    ...prev,
                                    shop_id: e.target.value,
                                }))
                            }
                        >
                            <option value="">All Shop</option>
                            {(shops || []).map((shop) => (
                                <option key={shop.id} value={shop.id}>
                                    {shop.name}
                                </option>
                            ))}
                        </select>

                        <input
                            type="date"
                            className="input input-bordered input-sm"
                            value={localFilters.date_from}
                            onChange={(e) =>
                                setLocalFilters((prev) => ({
                                    ...prev,
                                    date_from: e.target.value,
                                }))
                            }
                        />

                        <input
                            type="date"
                            className="input input-bordered input-sm"
                            value={localFilters.date_to}
                            onChange={(e) =>
                                setLocalFilters((prev) => ({
                                    ...prev,
                                    date_to: e.target.value,
                                }))
                            }
                        />

                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={applyFilters}
                                className="btn btn-primary btn-sm flex-1"
                            >
                                <Filter size={14} />
                                Filter
                            </button>

                            <button
                                type="button"
                                onClick={clearFilters}
                                className="btn btn-outline btn-sm flex-1"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="table table-zebra">
                            <thead>
                                <tr>
                                    <th>Hold No</th>
                                    <th>Shop</th>
                                    <th>Direction</th>
                                    <th>Status</th>
                                    <th>Total Qty</th>
                                    <th>Remaining</th>
                                    <th>Sold</th>
                                    <th>Returned</th>
                                    <th>Date</th>
                                    <th className="text-right">Action</th>
                                </tr>
                            </thead>

                            <tbody>
                                {safeHolds.length > 0 ? (
                                    safeHolds.map((hold) => (
                                        <tr key={hold.id}>
                                            <td>
                                                <div className="font-bold text-gray-900">
                                                    {hold.hold_no}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    ID: {hold.id}
                                                </div>
                                            </td>

                                            <td>
                                                <div className="font-semibold flex items-center gap-1">
                                                    <Store size={13} className="text-gray-400" />
                                                    {hold.shop?.name || "N/A"}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {hold.shop?.phone || "N/A"}
                                                </div>
                                            </td>

                                            <td>
                                                <span
                                                    className={`badge gap-1 ${getDirectionBadgeClass(
                                                        hold.direction
                                                    )}`}
                                                >
                                                    {hold.direction === "outgoing" ? (
                                                        <ArrowRightLeft size={12} />
                                                    ) : (
                                                        <RotateCcw size={12} />
                                                    )}
                                                    {hold.direction}
                                                </span>
                                            </td>

                                            <td>
                                                <span
                                                    className={`badge ${getStatusBadgeClass(
                                                        hold.status
                                                    )}`}
                                                >
                                                    {hold.status}
                                                </span>
                                            </td>

                                            <td>{hold.total_quantity || 0}</td>

                                            <td className="font-bold text-orange-600">
                                                {hold.remaining_quantity || 0}
                                            </td>

                                            <td className="font-bold text-green-600">
                                                {hold.sold_quantity || 0}
                                            </td>

                                            <td className="font-bold text-blue-600">
                                                {hold.returned_quantity || 0}
                                            </td>

                                            <td>
                                                <div className="flex items-center gap-1">
                                                    <Calendar size={13} className="text-gray-400" />
                                                    {formatDate(hold.hold_date)}
                                                </div>
                                            </td>

                                            <td className="text-right">
                                                <Link
                                                    href={route("pickup-holds.show", hold.id)}
                                                    className="btn btn-ghost btn-xs"
                                                >
                                                    <Eye size={14} />
                                                    View
                                                </Link>
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
                                                No pickup holds found
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {safeLinks.length > 0 && (
                        <div className="p-4 border-t flex flex-wrap gap-2 justify-center">
                            {safeLinks.map((link, index) => (
                                <button
                                    key={index}
                                    type="button"
                                    disabled={!link.url}
                                    onClick={() => visitPage(link.url)}
                                    className={`btn btn-sm ${
                                        link.active ? "btn-primary" : "btn-outline"
                                    } ${!link.url ? "btn-disabled opacity-50" : ""}`}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}