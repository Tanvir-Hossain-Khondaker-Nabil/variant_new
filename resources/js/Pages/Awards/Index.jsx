// resources/js/Pages/Awards/Index.jsx
import Layout from '@/Layouts/Layout';
import { Head, useForm, Link } from '@inertiajs/react';
import { useState } from 'react';

export default function Awards({ awards }) {
    const [showForm, setShowForm] = useState(false);
    const [showAssignForm, setShowAssignForm] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm({
        title: '',
        description: '',
        cash_reward: '',
        type: 'monthly',
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        criteria: {},
    });

    const { data: assignData, setData: setAssignData, post: assignAwards, processing: assigning } = useForm({
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('awards.store'), {
            onSuccess: () => {
                reset();
                setShowForm(false);
            },
        });
    };

    const handleAssignAwards = (e) => {
        e.preventDefault();
        if (confirm('Are you sure you want to assign monthly awards? This will automatically select top performers based on attendance and assign awards.')) {
            assignAwards(route('awards.assign-monthly'), {
                preserveScroll: true,
                onSuccess: () => {
                    setShowAssignForm(false);
                },
            });
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-BD', {
            style: 'currency',
            currency: 'BDT',
            minimumFractionDigits: 2
        }).format(amount || 0);
    };

    const getMonthName = (month) => {
        return new Date(2000, month - 1).toLocaleString('default', { month: 'long' });
    };

    return (
        <Layout>
            <Head title="Award Management" />

            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Award Management</h1>
                <div className="flex space-x-3">
                    <Link
                        href={route('awards.employee-awards')}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                    >
                        View Employee Awards
                    </Link>
                    <Link
                        href={route('awards.statistics')}
                        className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
                    >
                        Statistics
                    </Link>
                    <button
                        onClick={() => setShowAssignForm(true)}
                        className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700"
                    >
                        Assign Monthly Awards
                    </button>
                    <button
                        onClick={() => setShowForm(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                    >
                        Create Award
                    </button>
                </div>
            </div>

            {/* Create Award Form */}
            {showForm && (
                <div className="fixed inset-0  bg-[#0000003b] flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg w-full max-w-2xl max-h-screen overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Create New Award</h2>
                            <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-gray-700">
                                ✕
                            </button>
                        </div>

                        <form onSubmit={submit}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700">Award Title *</label>
                                    <input
                                        type="text"
                                        value={data.title}
                                        onChange={e => setData('title', e.target.value)}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                        required
                                        placeholder="e.g., Employee of the Month"
                                    />
                                    {errors.title && <div className="text-red-600 text-sm">{errors.title}</div>}
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700">Description *</label>
                                    <textarea
                                        value={data.description}
                                        onChange={e => setData('description', e.target.value)}
                                        rows="3"
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                        required
                                        placeholder="Describe the award and its criteria"
                                    />
                                    {errors.description && <div className="text-red-600 text-sm">{errors.description}</div>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Cash Reward (৳) *</label>
                                    <input
                                        type="number"
                                        
                                        min="0"
                                        value={data.cash_reward}
                                        onChange={e => setData('cash_reward', e.target.value)}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                        required
                                    />
                                    {errors.cash_reward && <div className="text-red-600 text-sm">{errors.cash_reward}</div>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Award Type *</label>
                                    <select
                                        value={data.type}
                                        onChange={e => setData('type', e.target.value)}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                        required
                                    >
                                        <option value="monthly">Monthly</option>
                                        <option value="quarterly">Quarterly</option>
                                        <option value="yearly">Yearly</option>
                                        <option value="special">Special</option>
                                    </select>
                                    {errors.type && <div className="text-red-600 text-sm">{errors.type}</div>}
                                </div>

                                {['monthly', 'quarterly'].includes(data.type) && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Month *</label>
                                        <select
                                            value={data.month}
                                            onChange={e => setData('month', e.target.value)}
                                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                            required
                                        >
                                            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                                <option key={m} value={m}>
                                                    {getMonthName(m)}
                                                </option>
                                            ))}
                                        </select>
                                        {errors.month && <div className="text-red-600 text-sm">{errors.month}</div>}
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Year *</label>
                                    <input
                                        type="number"
                                        value={data.year}
                                        onChange={e => setData('year', e.target.value)}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                        required
                                        min="2020"
                                        max="2030"
                                    />
                                    {errors.year && <div className="text-red-600 text-sm">{errors.year}</div>}
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {processing ? 'Creating...' : 'Create Award'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Assign Monthly Awards Form */}
            {showAssignForm && (
                <div className="fixed inset-0  bg-[#0000003b] flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg w-full max-w-md">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Assign Monthly Awards</h2>
                            <button onClick={() => setShowAssignForm(false)} className="text-gray-500 hover:text-gray-700">
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleAssignAwards}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Month</label>
                                    <select
                                        value={assignData.month}
                                        onChange={e => setAssignData('month', e.target.value)}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                        required
                                    >
                                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                            <option key={m} value={m}>
                                                {getMonthName(m)}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Year</label>
                                    <input
                                        type="number"
                                        value={assignData.year}
                                        onChange={e => setAssignData('year', e.target.value)}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                        required
                                        min="2020"
                                        max="2030"
                                    />
                                </div>

                                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                                    <h4 className="font-medium text-yellow-800 mb-2">Award Criteria</h4>
                                    <ul className="text-sm text-yellow-700 list-disc list-inside space-y-1">
                                        <li>Minimum 20 present days</li>
                                        <li>Top 3 performers based on attendance</li>
                                        <li>Considers overtime hours and late hours</li>
                                        <li>Cash rewards: ৳5,000 (1st), ৳3,000 (2nd), ৳1,000 (3rd)</li>
                                    </ul>
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setShowAssignForm(false)}
                                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={assigning}
                                    className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
                                >
                                    {assigning ? 'Assigning...' : 'Assign Awards'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Awards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {awards.map((award) => (
                    <div key={award.id} className="bg-white rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow">
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <Link
                                        href={route('awards.show', award.id)}
                                        className="text-lg font-semibold text-gray-900 hover:text-blue-600"
                                    >
                                        {award.title}
                                    </Link>
                                    <p className="text-sm text-gray-600 capitalize">{award.type} Award</p>
                                </div>
                                <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full font-medium">
                                    {formatCurrency(award.cash_reward)}
                                </span>
                            </div>

                            <p className="text-sm text-gray-700 mb-4 line-clamp-2">{award.description}</p>

                            <div className="space-y-2 mb-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Period:</span>
                                    <span className="font-medium">
                                        {award.month ? `${getMonthName(award.month)} ${award.year}` : `Year ${award.year}`}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Recipients:</span>
                                    <span className="font-medium">{award.employee_awards_count}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Status:</span>
                                    <span className={`px-2 py-1 text-xs rounded-full ${award.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                        }`}>
                                        {award.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                                <div className="flex space-x-2">
                                    <Link
                                        href={route('awards.show', award.id)}
                                        className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                                    >
                                        View Details
                                    </Link>
                                    <Link
                                        href={route('awards.employee-awards', { award_id: award.id })}
                                        className="text-green-600 hover:text-green-900 text-sm font-medium"
                                    >
                                        Recipients
                                    </Link>
                                </div>
                                <div className="flex space-x-2">
                                    <button className="text-blue-600 hover:text-blue-900 text-sm">
                                        Edit
                                    </button>
                                    <button className="text-red-600 hover:text-red-900 text-sm">
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Empty State */}
            {awards.length === 0 && (
                <div className="bg-white shadow rounded-lg p-8 text-center">
                    <div className="text-gray-400 text-6xl mb-4">🏆</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No awards created yet</h3>
                    <p className="text-gray-500 mb-4">
                        Create your first award to recognize employee achievements
                    </p>
                    <button
                        onClick={() => setShowForm(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                    >
                        Create Award
                    </button>
                </div>
            )}
        </Layout>
    );
}