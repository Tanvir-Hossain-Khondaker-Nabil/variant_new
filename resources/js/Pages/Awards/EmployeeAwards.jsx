// resources/js/Pages/Awards/EmployeeAwards.jsx
import Layout from '@/Layouts/Layout';
import { Head, useForm, Link, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';

export default function EmployeeAwards({ employeeAwards, filters, employees, awardsList }) {
    const [showAssignForm, setShowAssignForm] = useState(false);
    
    const { data, setData, post, processing, errors, reset } = useForm({
        award_id: filters.award_id || '',
        employee_id: '',
        achievement_reason: '',
        cash_amount: '',
    });

    const { data: filterData, setData: setFilterData, get } = useForm({
        employee_id: filters.employee_id || '',
        award_id: filters.award_id || '',
        is_paid: filters.is_paid || '',
    });

    // Set award_id from URL parameter when component loads
    useEffect(() => {
        if (filters.award_id) {
            setData('award_id', filters.award_id);
        }
    }, [filters.award_id]);

    const submit = (e) => {
        e.preventDefault();
        post(route('awards.assign-to-employee'), {
            onSuccess: () => {
                reset();
                setShowAssignForm(false);
            },
        });
    };

    const handleFilter = () => {
        get(route('awards.employee-awards'), {
            preserveState: true,
            replace: true,
        });
    };

    const clearFilters = () => {
        setFilterData({
            employee_id: '',
            award_id: '',
            is_paid: '',
        });
        get(route('awards.employee-awards'), {
            preserveState: true,
            replace: true,
        });
    };

    const markAsPaid = (awardId) => {
        if (confirm('Mark this award as paid?')) {
            router.post(route('awards.mark-paid', awardId));
        }
    };

    const markAsUnpaid = (awardId) => {
        if (confirm('Mark this award as unpaid?')) {
            router.post(route('awards.mark-unpaid', awardId));
        }
    };

    const deleteAward = (awardId) => {
        if (confirm('Delete this award record?')) {
            router.delete(route('awards.destroy-employee-award', awardId));
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-BD', {
            style: 'currency',
            currency: 'BDT',
            minimumFractionDigits: 2
        }).format(amount || 0);
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-BD');
    };

    // Get current award name for display
    const currentAward = awardsList.find(award => award.id == filters.award_id);

    return (
        <Layout>
            <Head title="Employee Awards" />

            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Employee Awards</h1>
                    {filters.award_id && currentAward && (
                        <p className="text-sm text-gray-600 mt-1">
                            Filtered by: <span className="font-medium">{currentAward.title}</span>
                        </p>
                    )}
                </div>
                <div className="flex space-x-3">
                    <Link
                        href={route('awards.index')}
                        className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                        Back to Awards
                    </Link>
                    <button
                        onClick={() => setShowAssignForm(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Assign Award
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
                        <select
                            value={filterData.employee_id}
                            onChange={e => setFilterData('employee_id', e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        >
                            <option value="">All Employees</option>
                            {employees.map(employee => (
                                <option key={employee.id} value={employee.id}>
                                    {employee.name} ({employee.employee_id})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Award</label>
                        <select
                            value={filterData.award_id}
                            onChange={e => setFilterData('award_id', e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        >
                            <option value="">All Awards</option>
                            {awardsList.map(award => (
                                <option key={award.id} value={award.id}>{award.title}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
                        <select
                            value={filterData.is_paid}
                            onChange={e => setFilterData('is_paid', e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        >
                            <option value="">All Status</option>
                            <option value="paid">Paid</option>
                            <option value="unpaid">Unpaid</option>
                        </select>
                    </div>

                    <div className="flex items-end space-x-2">
                        <button
                            onClick={handleFilter}
                            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm"
                        >
                            Filter
                        </button>
                        <button
                            onClick={clearFilters}
                            className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors text-sm"
                        >
                            Clear
                        </button>
                    </div>
                </div>
            </div>

            {/* Assign Award Form */}
            {showAssignForm && (
                <div className="fixed inset-0  bg-[#0000003b] flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg w-full max-w-md max-h-screen overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Assign Award to Employee</h2>
                            <button 
                                onClick={() => setShowAssignForm(false)} 
                                className="text-gray-500 hover:text-gray-700 text-xl"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={submit}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Award *</label>
                                    <select
                                        value={data.award_id}
                                        onChange={e => setData('award_id', e.target.value)}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                        required
                                    >
                                        <option value="">Select Award</option>
                                        {awardsList.map(award => (
                                            <option key={award.id} value={award.id}>
                                                {award.title} - {formatCurrency(award.cash_reward)}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.award_id && <div className="text-red-600 text-sm">{errors.award_id}</div>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Employee *</label>
                                    <select
                                        value={data.employee_id}
                                        onChange={e => setData('employee_id', e.target.value)}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                        required
                                    >
                                        <option value="">Select Employee</option>
                                        {employees.map(employee => (
                                            <option key={employee.id} value={employee.id}>
                                                {employee.name} ({employee.employee_id})
                                            </option>
                                        ))}
                                    </select>
                                    {errors.employee_id && <div className="text-red-600 text-sm">{errors.employee_id}</div>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Cash Amount (৳) *</label>
                                    <input
                                        type="number"
                                        
                                        min="0"
                                        value={data.cash_amount}
                                        onChange={e => setData('cash_amount', e.target.value)}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                        required
                                        placeholder="Enter cash amount"
                                    />
                                    {errors.cash_amount && <div className="text-red-600 text-sm">{errors.cash_amount}</div>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Achievement Reason *</label>
                                    <textarea
                                        value={data.achievement_reason}
                                        onChange={e => setData('achievement_reason', e.target.value)}
                                        rows="3"
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                        required
                                        placeholder="Describe why this award is being given..."
                                    />
                                    {errors.achievement_reason && <div className="text-red-600 text-sm">{errors.achievement_reason}</div>}
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setShowAssignForm(false)}
                                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                >
                                    {processing ? 'Assigning...' : 'Assign Award'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Awards Table */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-lg font-medium text-gray-900">Award Records</h2>
                    <div className="text-sm text-gray-500">
                        Total: {employeeAwards.total} records
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Employee
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Award
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Achievement Reason
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Amount
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Date
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {employeeAwards.data.map((award) => (
                                <tr key={award.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div>
                                            <div className="text-sm font-medium text-gray-900">
                                                {award.employee?.name || 'N/A'}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {award.employee?.employee_id || 'N/A'}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">
                                            {award.award?.title}
                                        </div>
                                        <div className="text-sm text-gray-500 capitalize">
                                            {award.award?.type} Award
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-900 max-w-xs">
                                            {award.achievement_reason}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {formatCurrency(award.cash_amount)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {formatDate(award.award_date)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                            award.is_paid 
                                                ? 'bg-green-100 text-green-800' 
                                                : 'bg-yellow-100 text-yellow-800'
                                        }`}>
                                            {award.is_paid ? 'Paid' : 'Unpaid'}
                                        </span>
                                        {award.paid_date && (
                                            <div className="text-xs text-gray-500 mt-1">
                                                Paid: {formatDate(award.paid_date)}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex space-x-3">
                                            {!award.is_paid ? (
                                                <button
                                                    onClick={() => markAsPaid(award.id)}
                                                    className="text-green-600 hover:text-green-900 transition-colors"
                                                >
                                                    Mark Paid
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => markAsUnpaid(award.id)}
                                                    className="text-yellow-600 hover:text-yellow-900 transition-colors"
                                                >
                                                    Mark Unpaid
                                                </button>
                                            )}
                                            <button
                                                onClick={() => deleteAward(award.id)}
                                                className="text-red-600 hover:text-red-900 transition-colors"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {employeeAwards.links && employeeAwards.links.length > 1 && (
                    <div className="px-6 py-4 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-gray-700">
                                Showing {employeeAwards.from} to {employeeAwards.to} of {employeeAwards.total} results
                            </div>
                            <div className="flex space-x-2">
                                {employeeAwards.links.map((link, index) => (
                                    <Link
                                        key={index}
                                        href={link.url || '#'}
                                        className={`px-3 py-1 rounded-md text-sm ${
                                            link.active
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                        } ${!link.url ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        preserveScroll
                                    >
                                        {link.label.replace('&laquo;', '«').replace('&raquo;', '»')}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Empty State */}
            {employeeAwards.data.length === 0 && (
                <div className="bg-white shadow rounded-lg p-8 text-center">
                    <div className="text-gray-400 text-6xl mb-4">🏆</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No award records found</h3>
                    <p className="text-gray-500 mb-4">
                        {filters.employee_id || filters.award_id || filters.is_paid
                            ? 'Try adjusting your filters'
                            : 'Get started by assigning awards to employees'
                        }
                    </p>
                    <button
                        onClick={() => setShowAssignForm(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Assign First Award
                    </button>
                </div>
            )}
        </Layout>
    );
}