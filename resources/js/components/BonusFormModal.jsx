// resources/js/Components/BonusFormModal.jsx
import { useForm } from '@inertiajs/react';

export default function BonusFormModal({ data, setData, errors, processing, onSubmit, onClose }) {
    return (
        <div className="fixed inset-0  bg-[#0000003b] flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Add Bonus Setting</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        ✕
                    </button>
                </div>
                
                <form onSubmit={onSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Bonus Name</label>
                            <input
                                type="text"
                                value={data.bonus_name}
                                onChange={e => setData('bonus_name', e.target.value)}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                required
                            />
                            {errors.bonus_name && <div className="text-red-600 text-sm">{errors.bonus_name}</div>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Bonus Type</label>
                            <select
                                value={data.bonus_type}
                                onChange={e => setData('bonus_type', e.target.value)}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                required
                            >
                                <option value="eid">Eid Bonus</option>
                                <option value="festival">Festival Bonus</option>
                                <option value="performance">Performance Bonus</option>
                                <option value="other">Other Bonus</option>
                            </select>
                            {errors.bonus_type && <div className="text-red-600 text-sm">{errors.bonus_type}</div>}
                        </div>

                        <div>
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={data.is_percentage}
                                    onChange={e => setData('is_percentage', e.target.checked)}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="ml-2 text-sm text-gray-700">Calculate as percentage of basic salary</span>
                            </label>
                        </div>

                        {data.is_percentage ? (
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Percentage (%)</label>
                                <input
                                    type="number"
                                    
                                    min="0"
                                    max="100"
                                    value={data.percentage}
                                    onChange={e => setData('percentage', e.target.value)}
                                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                    required
                                />
                                {errors.percentage && <div className="text-red-600 text-sm">{errors.percentage}</div>}
                            </div>
                        ) : (
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Fixed Amount</label>
                                <input
                                    type="number"
                                    
                                    min="0"
                                    value={data.fixed_amount}
                                    onChange={e => setData('fixed_amount', e.target.value)}
                                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                    required
                                />
                                {errors.fixed_amount && <div className="text-red-600 text-sm">{errors.fixed_amount}</div>}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Effective Date</label>
                            <input
                                type="date"
                                value={data.effective_date}
                                onChange={e => setData('effective_date', e.target.value)}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                required
                            />
                            {errors.effective_date && <div className="text-red-600 text-sm">{errors.effective_date}</div>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Description</label>
                            <textarea
                                value={data.description}
                                onChange={e => setData('description', e.target.value)}
                                rows="3"
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                            />
                            {errors.description && <div className="text-red-600 text-sm">{errors.description}</div>}
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                            {processing ? 'Creating...' : 'Create Setting'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}