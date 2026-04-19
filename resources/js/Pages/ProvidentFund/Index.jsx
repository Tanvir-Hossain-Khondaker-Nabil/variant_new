import { Head, useForm, Link, router } from '@inertiajs/react';
import { useState } from 'react';

// SVG Icons Component
const SVGIcon = ({ name, className = "w-4 h-4" }) => {
  const icons = {
    plus: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    ),
    report: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    calendar: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    user: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    filter: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
      </svg>
    ),
    reset: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
    spinner: (
      <svg className={`${className} animate-spin`} fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    ),
    close: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    money: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    document: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    eye: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
  };

  return icons[name] || null;
};

export default function ProvidentFund({ providentFunds, filters, employees }) {
    const { data, setData, get, processing } = useForm({
        month: filters.month || new Date().getMonth() + 1,
        year: filters.year || new Date().getFullYear(),
        employee_id: filters.employee_id || '',
    });

    const [showManualEntry, setShowManualEntry] = useState(false);
    const [manualEntryData, setManualEntryData] = useState({
        employee_id: '',
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        employee_contribution: '',
        employer_contribution: '',
        remarks: ''
    });

    const submit = (e) => {
        e.preventDefault();
        get(route('provident-fund.index'), {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleManualEntrySubmit = (e) => {
        e.preventDefault();
        router.post(route('provident-fund.manual-entry'), manualEntryData, {
            preserveScroll: true,
            onSuccess: () => {
                setShowManualEntry(false);
                setManualEntryData({
                    employee_id: '',
                    month: new Date().getMonth() + 1,
                    year: new Date().getFullYear(),
                    employee_contribution: '',
                    employer_contribution: '',
                    remarks: ''
                });
            }
        });
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-BD', {
            style: 'currency',
            currency: 'BDT',
            minimumFractionDigits: 2
        }).format(amount || 0);
    };

    const getMonthName = (monthNumber) => {
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        return months[monthNumber - 1] || '';
    };

    return (
        <>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Provident Fund</h1>
                    <p className="text-gray-600">Manage employee provident fund contributions</p>
                </div>
                <div className="flex space-x-3">
                    <button
                        onClick={() => setShowManualEntry(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                    >
                        <SVGIcon name="plus" className="w-4 h-4 mr-2" />
                        Manual Entry
                    </button>
                    <Link
                        href={route('provident-fund.summary')}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center"
                    >
                        <SVGIcon name="report" className="w-4 h-4 mr-2" />
                        Overall Summary
                    </Link>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow mb-6">
                <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                            <SVGIcon name="calendar" className="w-4 h-4 mr-1" />
                            Month
                        </label>
                        <select
                            value={data.month}
                            onChange={e => setData('month', e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">All Months</option>
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                <option key={m} value={m}>
                                    {getMonthName(m)}
                                </option>
                            ))}
                        </select>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                            <SVGIcon name="calendar" className="w-4 h-4 mr-1" />
                            Year
                        </label>
                        <input
                            type="number"
                            value={data.year}
                            onChange={e => setData('year', e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            min="2000"
                            max="2100"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                            <SVGIcon name="user" className="w-4 h-4 mr-1" />
                            Employee
                        </label>
                        <select
                            value={data.employee_id}
                            onChange={e => setData('employee_id', e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">All Employees</option>
                            {employees.map(employee => (
                                <option key={employee.id} value={employee.id}>
                                    {employee.display}
                                </option>
                            ))}
                        </select>
                    </div>
                    
                    <div className="flex items-end">
                        <div className="flex space-x-2 w-full">
                            <button
                                type="submit"
                                disabled={processing}
                                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center"
                            >
                                {processing ? (
                                    <>
                                        <SVGIcon name="spinner" className="w-4 h-4 mr-2" />
                                        Filtering...
                                    </>
                                ) : (
                                    <>
                                        <SVGIcon name="filter" className="w-4 h-4 mr-2" />
                                        Filter
                                    </>
                                )}
                            </button>
                            
                            <button
                                type="button"
                                onClick={() => {
                                    setData({
                                        month: '',
                                        year: new Date().getFullYear(),
                                        employee_id: ''
                                    });
                                    get(route('provident-fund.index'), {
                                        preserveState: true,
                                        preserveScroll: true,
                                    });
                                }}
                                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors flex items-center"
                            >
                                <SVGIcon name="reset" className="w-4 h-4 mr-2" />
                                Reset
                            </button>
                        </div>
                    </div>
                </form>
            </div>

            {/* PF Table */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <div>
                        <h2 className="text-lg font-medium text-gray-900">Provident Fund Contributions</h2>
                        <div className="text-sm text-gray-500 mt-1">
                            Period: {filters.month ? getMonthName(filters.month) + ' ' : ''}{filters.year || 'All'}
                        </div>
                    </div>
                    <div className="text-sm text-gray-500">
                        Total: {providentFunds.total || 0} records
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
                                    Period
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Employee Contribution
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Employer Contribution
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Total Contribution
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Current Balance
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th> */}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {providentFunds.data && providentFunds.data.length > 0 ? (
                                providentFunds.data.map((pf) => (
                                    <tr key={pf.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                                                    <span className="text-blue-600 font-medium">
                                                        {pf.employee?.name?.charAt(0) || 'E'}
                                                    </span>
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {pf.employee?.name || 'N/A'}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {pf.employee?.employee_id || 'N/A'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {getMonthName(pf.month)} {pf.year}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {pf.contribution_date ? new Date(pf.contribution_date).toLocaleDateString('en-BD') : ''}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {formatCurrency(pf.employee_contribution)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {formatCurrency(pf.employer_contribution)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                                            {formatCurrency(pf.total_contribution)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-600">
                                            {formatCurrency(pf.current_balance)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                                                pf.status === 'active' ? 'bg-green-100 text-green-800' :
                                                pf.status === 'withdrawn' ? 'bg-red-100 text-red-800' :
                                                'bg-yellow-100 text-yellow-800'
                                            }`}>
                                                {pf.status?.charAt(0).toUpperCase() + pf.status?.slice(1)}
                                            </span>
                                        </td>
                                        {/* <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <Link
                                                href={route('employee.pf-statement', pf.employee_id)}
                                                className="text-blue-600 hover:text-blue-900 transition-colors flex items-center"
                                                title="View Statement"
                                            >
                                                <SVGIcon name="document" className="w-4 h-4 mr-1" />
                                                Statement
                                            </Link>
                                        </td> */}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="8" className="px-6 py-12 text-center">
                                        <div className="text-gray-400 mb-4">
                                            <SVGIcon name="money" className="w-16 h-16 mx-auto" />
                                        </div>
                                        <h3 className="text-lg font-medium text-gray-900 mb-2">No provident fund records found</h3>
                                        <p className="text-gray-500 mb-4">
                                            {filters.month || filters.year || filters.employee_id
                                                ? 'Try adjusting your search filters'
                                                : 'No provident fund contributions available'
                                            }
                                        </p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {providentFunds.links && providentFunds.links.length > 3 && (
                    <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-gray-700">
                                Showing {providentFunds.from || 0} to {providentFunds.to || 0} of {providentFunds.total || 0} results
                            </div>
                            <div className="flex space-x-1">
                                {providentFunds.links.map((link, index) => (
                                    <button
                                        key={index}
                                        onClick={() => {
                                            if (link.url) {
                                                get(link.url, {
                                                    preserveState: true,
                                                    preserveScroll: true,
                                                });
                                            }
                                        }}
                                        disabled={!link.url || link.active}
                                        className={`px-3 py-1 text-sm rounded transition-colors ${
                                            link.active 
                                                ? 'bg-blue-600 text-white' 
                                                : link.url
                                                    ? 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        }`}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Manual Entry Modal */}
            {showManualEntry && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-900">Manual PF Entry</h3>
                            <button
                                onClick={() => setShowManualEntry(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <SVGIcon name="close" className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleManualEntrySubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                                    <SVGIcon name="user" className="w-4 h-4 mr-1" />
                                    Employee
                                </label>
                                <select
                                    value={manualEntryData.employee_id}
                                    onChange={e => setManualEntryData({...manualEntryData, employee_id: e.target.value})}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                    required
                                >
                                    <option value="">Select Employee</option>
                                    {employees.map(employee => (
                                        <option key={employee.id} value={employee.id}>
                                            {employee.display}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                                        <SVGIcon name="calendar" className="w-4 h-4 mr-1" />
                                        Month
                                    </label>
                                    <select
                                        value={manualEntryData.month}
                                        onChange={e => setManualEntryData({...manualEntryData, month: e.target.value})}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2"
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
                                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                                        <SVGIcon name="calendar" className="w-4 h-4 mr-1" />
                                        Year
                                    </label>
                                    <input
                                        type="number"
                                        value={manualEntryData.year}
                                        onChange={e => setManualEntryData({...manualEntryData, year: e.target.value})}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                                        required
                                        min="2000"
                                        max="2100"
                                    />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Employee Contribution
                                    </label>
                                    <input
                                        type="number"
                                        value={manualEntryData.employee_contribution}
                                        onChange={e => setManualEntryData({...manualEntryData, employee_contribution: e.target.value})}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                                        required
                                        min="0"
                                        
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Employer Contribution
                                    </label>
                                    <input
                                        type="number"
                                        value={manualEntryData.employer_contribution}
                                        onChange={e => setManualEntryData({...manualEntryData, employer_contribution: e.target.value})}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                                        required
                                        min="0"
                                        
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Remarks
                                </label>
                                <textarea
                                    value={manualEntryData.remarks}
                                    onChange={e => setManualEntryData({...manualEntryData, remarks: e.target.value})}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                    rows="2"
                                />
                            </div>
                            
                            <div className="flex justify-end space-x-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowManualEntry(false)}
                                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                                >
                                    Add Entry
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}