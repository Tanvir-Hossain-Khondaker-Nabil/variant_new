// resources/js/Components/FestivalBonusModal.jsx
import { useForm } from '@inertiajs/react';

export default function FestivalBonusModal({ onClose }) {
    const { data, setData, post, processing, errors } = useForm({
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        bonus_name: '',
        percentage: 50,
        employee_ids: []
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('bonus.apply-festival'), {
            onSuccess: () => {
                onClose();
            },
        });
    };

    return (
        <div className="fixed inset-0  bg-[#0000003b] flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Apply Festival Bonus</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        ✕
                    </button>
                </div>
                
                <form onSubmit={submit}>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Festival Name</label>
                            <input
                                type="text"
                                value={data.bonus_name}
                                onChange={e => setData('bonus_name', e.target.value)}
                                placeholder="e.g., Durga Puja Bonus, Christmas Bonus, etc."
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                required
                            />
                            {errors.bonus_name && <div className="text-red-600 text-sm">{errors.bonus_name}</div>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Month</label>
                            <select
                                value={data.month}
                                onChange={e => setData('month', e.target.value)}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                required
                            >
                                {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                                    <option key={m} value={m}>
                                        {new Date(2000, m-1).toLocaleString('default', { month: 'long' })}
                                    </option>
                                ))}
                            </select>
                            {errors.month && <div className="text-red-600 text-sm">{errors.month}</div>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Year</label>
                            <input
                                type="number"
                                value={data.year}
                                onChange={e => setData('year', e.target.value)}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                required
                                min="2020"
                                max="2100"
                            />
                            {errors.year && <div className="text-red-600 text-sm">{errors.year}</div>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Bonus Percentage (%)</label>
                            <input
                                type="number"
                                
                                min="0"
                                max="100"
                                value={data.percentage}
                                onChange={e => setData('percentage', e.target.value)}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                required
                            />
                            <p className="text-sm text-gray-500 mt-1">
                                Basic salary এর উপর কত % বোনাস দিবেন
                            </p>
                            {errors.percentage && <div className="text-red-600 text-sm">{errors.percentage}</div>}
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
                            {processing ? 'Applying...' : 'Apply Festival Bonus'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}