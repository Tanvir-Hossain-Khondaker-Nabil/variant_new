import React, { useState } from "react";
import { router, useForm } from "@inertiajs/react";
import {
    Plus,
    Edit,
    Trash2,
    X,
    Filter,
    Search,
    Store,
    Phone,
    Mail,
    MapPin,
    Building,
    User,
    CheckCircle,
    AlertCircle,
} from "lucide-react";
import Pagination from "../../../components/Pagination";

export default function ShopIndex({ shops = {}, filters = {} }) {
    const safeShops = Array.isArray(shops?.data) ? shops.data : [];

    const [open, setOpen] = useState(false);
    const [edit, setEdit] = useState(null);

    const [f, setF] = useState({
        search: filters?.search || "",
        type: filters?.type || "",
        status: filters?.status || "",
    });

    const form = useForm({
        name: "",
        owner_name: "",
        phone: "",
        email: "",
        address: "",
        company: "",
        type: "both",
        is_active: true,
    });

    const openCreate = () => {
        setEdit(null);

        form.setData({
            name: "",
            owner_name: "",
            phone: "",
            email: "",
            address: "",
            company: "",
            type: "both",
            is_active: true,
        });

        setOpen(true);
    };

    const openEdit = (shop) => {
        setEdit(shop);

        form.setData({
            name: shop?.name || "",
            owner_name: shop?.owner_name || "",
            phone: shop?.phone || "",
            email: shop?.email || "",
            address: shop?.address || "",
            company: shop?.company || "",
            type: shop?.type || "both",
            is_active: Boolean(shop?.is_active),
        });

        setOpen(true);
    };

    const closeModal = () => {
        setOpen(false);
        setEdit(null);

        form.setData({
            name: "",
            owner_name: "",
            phone: "",
            email: "",
            address: "",
            company: "",
            type: "both",
            is_active: true,
        });
    };

    const submit = (e) => {
        e.preventDefault();

        if (edit) {
            form.put(route("shops.update", edit.id), {
                preserveScroll: true,
                onSuccess: () => {
                    closeModal();
                },
            });
        } else {
            form.post(route("shops.store"), {
                preserveScroll: true,
                onSuccess: () => {
                    closeModal();
                },
            });
        }
    };

    const apply = () => {
        const params = {};

        Object.entries(f).forEach(([key, value]) => {
            if (value !== "" && value !== null && value !== undefined) {
                params[key] = value;
            }
        });

        router.get(route("shops.index"), params, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    };

    const clearFilters = () => {
        setF({
            search: "",
            type: "",
            status: "",
        });

        router.get(route("shops.index"), {}, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    };

    const deleteShop = (shop) => {
        if (!shop?.id) return;

        if (confirm(`Delete ${shop.name}?`)) {
            router.delete(route("shops.destroy", shop.id), {
                preserveScroll: true,
            });
        }
    };

    const getTypeBadgeClass = (type) => {
        if (type === "customer") return "badge-info";
        if (type === "supplier") return "badge-warning";
        return "badge-primary";
    };

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                            <Store size={24} className="text-primary" />
                            Neighbor Shops
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Shop can be customer, supplier, or both
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={openCreate}
                        className="btn btn-primary btn-sm"
                    >
                        <Plus size={16} />
                        Add Shop
                    </button>
                </div>

                <div className="bg-white rounded-2xl border shadow-sm p-4 mb-5">
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                        <div className="md:col-span-2 relative">
                            <Search
                                size={15}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                            />
                            <input
                                className="input input-bordered input-sm w-full pl-9"
                                placeholder="Search shop, phone, company"
                                value={f.search}
                                onChange={(e) =>
                                    setF({
                                        ...f,
                                        search: e.target.value,
                                    })
                                }
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        apply();
                                    }
                                }}
                            />
                        </div>

                        <select
                            className="select select-bordered select-sm"
                            value={f.type}
                            onChange={(e) =>
                                setF({
                                    ...f,
                                    type: e.target.value,
                                })
                            }
                        >
                            <option value="">All Type</option>
                            <option value="customer">Customer</option>
                            <option value="supplier">Supplier</option>
                            <option value="both">Both</option>
                        </select>

                        <select
                            className="select select-bordered select-sm"
                            value={f.status}
                            onChange={(e) =>
                                setF({
                                    ...f,
                                    status: e.target.value,
                                })
                            }
                        >
                            <option value="">All Status</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>

                        <button
                            type="button"
                            onClick={apply}
                            className="btn btn-primary btn-sm"
                        >
                            <Filter size={14} />
                            Filter
                        </button>

                        <button
                            type="button"
                            onClick={clearFilters}
                            className="btn btn-outline btn-sm"
                        >
                            <X size={14} />
                            Clear
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="table table-zebra">
                            <thead>
                                <tr>
                                    <th>Shop</th>
                                    <th>Owner</th>
                                    <th>Phone</th>
                                    <th>Email</th>
                                    <th>Type</th>
                                    <th>Customer / Supplier</th>
                                    <th>Holds</th>
                                    <th>Status</th>
                                    <th className="text-right">Action</th>
                                </tr>
                            </thead>

                            <tbody>
                                {safeShops.length > 0 ? (
                                    safeShops.map((shop) => (
                                        <tr key={shop.id}>
                                            <td>
                                                <div className="font-bold text-gray-900">
                                                    {shop.name}
                                                </div>

                                                <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                                    <Building size={12} />
                                                    {shop.company || "N/A"}
                                                </div>
                                            </td>

                                            <td>
                                                <div className="flex items-center gap-1">
                                                    <User size={13} className="text-gray-400" />
                                                    {shop.owner_name || "N/A"}
                                                </div>
                                            </td>

                                            <td>
                                                <div className="flex items-center gap-1">
                                                    <Phone size={13} className="text-gray-400" />
                                                    {shop.phone || "N/A"}
                                                </div>
                                            </td>

                                            <td>
                                                <div className="flex items-center gap-1">
                                                    <Mail size={13} className="text-gray-400" />
                                                    {shop.email || "N/A"}
                                                </div>
                                            </td>

                                            <td>
                                                <span
                                                    className={`badge ${getTypeBadgeClass(
                                                        shop.type
                                                    )}`}
                                                >
                                                    {shop.type || "both"}
                                                </span>
                                            </td>

                                            <td>
                                                <div className="text-xs leading-5">
                                                    <div>
                                                        Customer:{" "}
                                                        <span className="font-semibold">
                                                            {shop.customer_id || "N/A"}
                                                        </span>
                                                    </div>

                                                    <div>
                                                        Supplier:{" "}
                                                        <span className="font-semibold">
                                                            {shop.supplier_id || "N/A"}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>

                                            <td>
                                                <span className="badge badge-neutral">
                                                    {shop.holds_count || 0}
                                                </span>
                                            </td>

                                            <td>
                                                <span
                                                    className={`badge gap-1 ${shop.is_active
                                                            ? "badge-success"
                                                            : "badge-error"
                                                        }`}
                                                >
                                                    {shop.is_active ? (
                                                        <CheckCircle size={12} />
                                                    ) : (
                                                        <AlertCircle size={12} />
                                                    )}
                                                    {shop.is_active ? "Active" : "Inactive"}
                                                </span>
                                            </td>

                                            <td className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => openEdit(shop)}
                                                        className="btn btn-ghost btn-xs"
                                                        title="Edit"
                                                    >
                                                        <Edit size={14} />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => deleteShop(shop)}
                                                        className="btn btn-ghost btn-xs text-red-600"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="9">
                                            <div className="py-10 text-center text-gray-500">
                                                <Store
                                                    size={34}
                                                    className="mx-auto mb-2 text-gray-300"
                                                />
                                                No shops found
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {Array.isArray(shops?.links) && shops.links.length > 0 && (
                        <div className="p-4 border-t flex flex-wrap gap-2 justify-center">
                            {shops.links.map((link, index) => (
                                <button
                                    key={index}
                                    type="button"
                                    disabled={!link.url}
                                    onClick={() => {
                                        if (link.url) {
                                            router.visit(link.url, {
                                                preserveScroll: true,
                                                preserveState: true,
                                            });
                                        }
                                    }}
                                    className={`btn btn-sm ${link.active
                                            ? "btn-primary"
                                            : "btn-outline"
                                        } ${!link.url ? "btn-disabled opacity-50" : ""}`}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {open && (
                    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
                        <form
                            onSubmit={submit}
                            className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl"
                        >
                            <div className="p-5 border-b flex items-center justify-between bg-slate-50">
                                <div>
                                    <h3 className="font-black text-lg text-gray-900">
                                        {edit ? "Edit Shop" : "Add Shop"}
                                    </h3>
                                    <p className="text-xs text-gray-500">
                                        Shop can become customer/supplier after pickup hold action
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

                            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-bold">
                                            Shop Name *
                                        </span>
                                    </label>
                                    <input
                                        className="input input-bordered"
                                        placeholder="Shop name"
                                        value={form.data.name}
                                        onChange={(e) =>
                                            form.setData("name", e.target.value)
                                        }
                                        required
                                    />
                                    {form.errors.name && (
                                        <div className="text-xs text-red-500 mt-1">
                                            {form.errors.name}
                                        </div>
                                    )}
                                </div>

                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-bold">
                                            Owner
                                        </span>
                                    </label>
                                    <input
                                        className="input input-bordered"
                                        placeholder="Owner"
                                        value={form.data.owner_name}
                                        onChange={(e) =>
                                            form.setData("owner_name", e.target.value)
                                        }
                                    />
                                    {form.errors.owner_name && (
                                        <div className="text-xs text-red-500 mt-1">
                                            {form.errors.owner_name}
                                        </div>
                                    )}
                                </div>

                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-bold">
                                            Phone
                                        </span>
                                    </label>
                                    <input
                                        className="input input-bordered"
                                        placeholder="Phone"
                                        value={form.data.phone}
                                        onChange={(e) =>
                                            form.setData("phone", e.target.value)
                                        }
                                    />
                                    {form.errors.phone && (
                                        <div className="text-xs text-red-500 mt-1">
                                            {form.errors.phone}
                                        </div>
                                    )}
                                </div>

                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-bold">
                                            Email
                                        </span>
                                    </label>
                                    <input
                                        type="email"
                                        className="input input-bordered"
                                        placeholder="Email"
                                        value={form.data.email}
                                        onChange={(e) =>
                                            form.setData("email", e.target.value)
                                        }
                                    />
                                    {form.errors.email && (
                                        <div className="text-xs text-red-500 mt-1">
                                            {form.errors.email}
                                        </div>
                                    )}
                                </div>

                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-bold">
                                            Company
                                        </span>
                                    </label>
                                    <input
                                        className="input input-bordered"
                                        placeholder="Company"
                                        value={form.data.company}
                                        onChange={(e) =>
                                            form.setData("company", e.target.value)
                                        }
                                    />
                                    {form.errors.company && (
                                        <div className="text-xs text-red-500 mt-1">
                                            {form.errors.company}
                                        </div>
                                    )}
                                </div>

                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-bold">
                                            Type
                                        </span>
                                    </label>
                                    <select
                                        className="select select-bordered"
                                        value={form.data.type}
                                        onChange={(e) =>
                                            form.setData("type", e.target.value)
                                        }
                                    >
                                        <option value="customer">Customer</option>
                                        <option value="supplier">Supplier</option>
                                        <option value="both">Both</option>
                                    </select>
                                    {form.errors.type && (
                                        <div className="text-xs text-red-500 mt-1">
                                            {form.errors.type}
                                        </div>
                                    )}
                                </div>

                                <div className="form-control md:col-span-2">
                                    <label className="label">
                                        <span className="label-text font-bold">
                                            Address
                                        </span>
                                    </label>
                                    <textarea
                                        className="textarea textarea-bordered"
                                        placeholder="Address"
                                        value={form.data.address}
                                        onChange={(e) =>
                                            form.setData("address", e.target.value)
                                        }
                                    />
                                    {form.errors.address && (
                                        <div className="text-xs text-red-500 mt-1">
                                            {form.errors.address}
                                        </div>
                                    )}
                                </div>

                                <label className="flex gap-2 items-center md:col-span-2">
                                    <input
                                        type="checkbox"
                                        className="checkbox checkbox-primary"
                                        checked={form.data.is_active}
                                        onChange={(e) =>
                                            form.setData("is_active", e.target.checked)
                                        }
                                    />
                                    <span className="font-semibold">Active</span>
                                </label>
                            </div>

                            <div className="p-5 border-t flex justify-end gap-2 bg-slate-50">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="btn btn-outline"
                                    disabled={form.processing}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={form.processing}
                                >
                                    {form.processing ? "Saving..." : "Save"}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}
