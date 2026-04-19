import { Head, useForm } from '@inertiajs/react';
import { useState } from 'react';

export default function Statement({ user, statement, totalEmployeeContribution, totalEmployerContribution, currentBalance }) {
    const { data, setData, post, processing } = useForm({
        provident_fund_percentage: user.provident_fund_percentage,
    });

    const updatePfPercentage = (e) => {
        e.preventDefault();
        if (confirm('Are you sure you want to update Provident Fund percentage? This will affect future salary calculations.')) {
            post(route('provident-fund.update-percentage', user.id), {
                preserveScroll: true,
            });
        }
    };

    return (
        <>
            <div className="bg-white p-6 rounded-lg shadow mb-6">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Provident Fund Statement</h1>
                        <p className="text-gray-600">{user.name} - {user.employee_id}</p>
                    </div>
                    
                    {/* Provident Fund Percentage Update Form */}
                    <form onSubmit={updatePfPercentage} className="flex items-end space-x-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Provident Fund Percentage</label>
                            <input
                                type="number"
                                
                                min="0"
                                max="20"
                                value={data.provident_fund_percentage}
                                onChange={e => setData('provident_fund_percentage', e.target.value)}
                                className="mt-1 block w-24 border border-gray-300 rounded-md px-3 py-2"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={processing}
                            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                            Update
                        </button>
                    </form>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-blue-50 p-4 rounded-lg">
                        <p className="text-sm text-blue-600">Employee Contribution</p>
                        <p className="text-2xl font-bold text-blue-900">${totalEmployeeContribution}</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                        <p className="text-sm text-green-600">Employer Contribution</p>
                        <p className="text-2xl font-bold text-green-900">${totalEmployerContribution}</p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                        <p className="text-sm text-purple-600">Total Contribution</p>
                        <p className="text-2xl font-bold text-purple-900">${totalEmployeeContribution + totalEmployerContribution}</p>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg">
                        <p className="text-sm text-orange-600">Current Balance</p>
                        <p className="text-2xl font-bold text-orange-900">${currentBalance}</p>
                    </div>
                </div>

                {/* Statement Table */}
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee Contribution</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employer Contribution</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Contribution</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Balance</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {statement.map((record) => (
                                <tr key={record.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {record.month}/{record.year}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        ${record.employee_contribution}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        ${record.employer_contribution}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        ${record.total_contribution}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        ${record.current_balance}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {new Date(record.contribution_date).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}