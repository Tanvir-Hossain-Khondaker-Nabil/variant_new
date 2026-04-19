import { Head, useForm, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { 
    Plus, 
    X, 
    Edit3, 
    Trash2, 
    AlertTriangle, 
    CheckCircle2, 
    Settings, 
    Percent, 
    DollarSign, 
    UserCog,
    RefreshCcw,
    Zap
} from 'lucide-react';

export default function Allowance({ allowanceSettings, employees, locale }) {
    const [showForm, setShowForm] = useState(false);
    const [editingSetting, setEditingSetting] = useState(null);
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    
    const { data, setData, post, processing, errors, reset } = useForm({
        allowance_type: '',
        percentage: 50,
        fixed_amount: 0,
        is_percentage: true,
        description: '',
        is_active: true,
    });

    const submit = (e) => {
        e.preventDefault();
        
        const url = editingSetting 
            ? route('allowances.update', editingSetting.id)
            : route('allowances.store');
        
        const method = editingSetting ? 'put' : 'post';
        
        router[method](url, data, {
            onSuccess: () => {
                reset();
                setShowForm(false);
                setEditingSetting(null);
            },
        });
    };

    const { post: applySettings, processing: applying } = useForm();
    const { post: resetAllowances, processing: resetting } = useForm();

    const handleApplySettings = () => {
        if (confirm('Are you sure you want to apply these allowance settings to all employees? This will update their allowance amounts based on their basic salary.')) {
            applySettings(route('allowances.apply-settings'), {
                preserveScroll: true,
            });
        }
    };

    const handleResetAllowances = () => {
        if (confirm('⚠️ WARNING: This will set ALL employee allowances to 0. Are you sure?')) {
            resetAllowances(route('allowances.reset-allowances'), {
                preserveScroll: true,
            });
            setShowResetConfirm(false);
        }
    };

    const handleEdit = (setting) => {
        setEditingSetting(setting);
        setData({
            allowance_type: setting.allowance_type,
            percentage: setting.percentage,
            fixed_amount: setting.fixed_amount,
            is_percentage: setting.is_percentage,
            description: setting.description,
            is_active: setting.is_active,
        });
        setShowForm(true);
    };

    const handleDelete = (setting) => {
        if (confirm('Are you sure you want to delete this allowance setting?')) {
            router.delete(route('allowances.destroy', setting.id), {
                preserveScroll: true,
            });
        }
    };

    const handleDebugAllowance = async (employeeId) => {
        try {
            const response = await fetch(`/debug/allowance-calculation/${employeeId}`);
            const data = await response.json();
            console.log('Allowance debug data:', data);
            alert('Check console for allowance calculation details');
        } catch (error) {
            console.error('Debug error:', error);
        }
    };

    return (
        <div className={`p-6 bg-[#fcfcfc] min-h-screen ${locale === 'bn' ? 'bangla-font' : ''}`}>
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b border-gray-200 pb-6 bg-white p-6 rounded-2xl shadow-sm">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Allowance <span className="text-red-600">Engine</span></h1>
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-xs mt-1">Global Compensation Logic & Parameters</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={() => setShowResetConfirm(true)}
                        disabled={resetting}
                        className="btn bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-600 border-none rounded-xl px-4 font-black uppercase text-[10px] tracking-widest transition-all"
                    >
                        {resetting ? 'Resetting...' : 'System Reset'}
                    </button>
                    <button
                        onClick={handleApplySettings}
                        disabled={applying}
                        className="btn bg-gray-900 hover:bg-red-600 text-white border-none rounded-xl px-4 font-black uppercase text-[10px] tracking-widest shadow-lg transition-all"
                    >
                        {applying ? 'Applying...' : 'Synchronize All'}
                    </button>
                    <button
                        onClick={() => { setEditingSetting(null); setShowForm(true); }}
                        className="btn bg-red-600 hover:bg-red-700 text-white border-none rounded-xl px-4 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-red-200 transition-all"
                    >
                        <Plus size={16} className="mr-1" /> New Parameter
                    </button>
                </div>
            </div>

            {/* Reset Confirmation Modal */}
            {showResetConfirm && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className="bg-white rounded-[2rem] border-4 border-gray-900 w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-8 text-center">
                            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <AlertTriangle size={40} className="text-red-600" />
                            </div>
                            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight mb-2">Registry Wipe</h2>
                            <p className="text-gray-500 font-bold text-sm mb-8 px-4">
                                This action will set ALL employee allowances to 0. This is irreversible. 
                                Are you sure you want to continue?
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowResetConfirm(false)}
                                    className="btn flex-1 bg-gray-100 text-gray-500 border-none rounded-xl font-black uppercase text-xs tracking-widest"
                                >
                                    Abort
                                </button>
                                <button
                                    onClick={handleResetAllowances}
                                    className="btn flex-1 bg-red-600 hover:bg-red-700 text-white border-none rounded-xl font-black uppercase text-xs tracking-widest shadow-lg"
                                >
                                    Confirm Reset
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add/Edit Allowance Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className="bg-white rounded-[2rem] border-4 border-gray-900 w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-gray-900 p-6 flex justify-between items-center text-white border-b border-gray-800">
                            <h2 className="font-black uppercase text-xs tracking-widest flex items-center gap-2">
                                <Settings size={18} className="text-red-500" />
                                {editingSetting ? 'Modify Allowance Logic' : 'Define New Allowance'}
                            </h2>
                            <button onClick={() => { setShowForm(false); setEditingSetting(null); reset(); }} className="hover:rotate-90 transition-transform">
                                <X size={24}/>
                            </button>
                        </div>
                        
                        <form onSubmit={submit} className="p-8 space-y-6">
                            <div className="space-y-5">
                                <div className="form-control">
                                    <label className="label text-[10px] font-black uppercase text-gray-400 tracking-widest">Allowance Class *</label>
                                    <select
                                        value={data.allowance_type}
                                        onChange={e => setData('allowance_type', e.target.value)}
                                        className="select select-bordered rounded-xl font-bold border-gray-300 focus:border-red-600 w-full"
                                        required
                                    >
                                        <option value="">Select Type</option>
                                        <option value="house_rent">House Rent</option>
                                        <option value="medical_allowance">Medical Allowance</option>
                                        <option value="transport_allowance">Transport Allowance</option>
                                        <option value="other_allowance">Other Allowance</option>
                                    </select>
                                    {errors.allowance_type && <p className="text-red-600 text-[10px] mt-1 font-bold">{errors.allowance_type}</p>}
                                </div>

                                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                                    <label className="flex items-center cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={data.is_percentage}
                                            onChange={e => setData('is_percentage', e.target.checked)}
                                            className="checkbox checkbox-error rounded-md"
                                        />
                                        <span className="ml-3 text-xs font-black uppercase text-gray-700 tracking-tight group-hover:text-red-600 transition-colors">Apply as Percentage of Basic Salary</span>
                                    </label>
                                </div>

                                <div className="form-control">
                                    <label className="label text-[10px] font-black uppercase text-gray-400 tracking-widest">
                                        {data.is_percentage ? 'Percentage Rate (%)' : 'Fixed Valuation (BDT)'} *
                                    </label>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-black">
                                            {data.is_percentage ? <Percent size={16}/> : <DollarSign size={16}/>}
                                        </div>
                                        <input
                                            type="number"
                                            
                                            value={data.is_percentage ? data.percentage : data.fixed_amount}
                                            onChange={e => setData(data.is_percentage ? 'percentage' : 'fixed_amount', e.target.value)}
                                            className="input input-bordered w-full pl-12 rounded-xl font-mono font-black border-gray-300 focus:border-red-600"
                                            required
                                        />
                                    </div>
                                    {errors[data.is_percentage ? 'percentage' : 'fixed_amount'] && (
                                        <p className="text-red-600 text-[10px] mt-1 font-bold">{errors[data.is_percentage ? 'percentage' : 'fixed_amount']}</p>
                                    )}
                                </div>

                                <div className="form-control">
                                    <label className="label text-[10px] font-black uppercase text-gray-400 tracking-widest">Parameter Description</label>
                                    <textarea
                                        value={data.description}
                                        onChange={e => setData('description', e.target.value)}
                                        rows="2"
                                        className="textarea textarea-bordered rounded-xl font-bold border-gray-300 focus:border-red-600"
                                        placeholder="Note the logic behind this allowance..."
                                    />
                                </div>

                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={data.is_active}
                                        onChange={e => setData('is_active', e.target.checked)}
                                        className="toggle toggle-error rounded-full"
                                    />
                                    <span className="ml-3 text-xs font-black uppercase text-gray-700 tracking-widest">Active State</span>
                                </div>
                            </div>

                            <div className="mt-8 flex justify-end gap-3 border-t border-gray-100 pt-6">
                                <button type="button" onClick={() => { setShowForm(false); setEditingSetting(null); reset(); }} className="btn btn-ghost font-black uppercase text-xs tracking-widest">Abort</button>
                                <button type="submit" disabled={processing} className="btn bg-gray-900 hover:bg-red-600 text-white border-none rounded-xl px-10 font-black uppercase text-xs tracking-widest shadow-lg">
                                    {processing ? 'Processing...' : (editingSetting ? 'Update Parameter' : 'Initialize Parameter')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Allowance Rules Registry */}
            <div className="bg-white rounded-3xl border-2 border-gray-900 overflow-hidden shadow-2xl mb-10">
                <div className="bg-gray-900 px-8 py-5 flex justify-between items-center text-white border-b border-gray-800">
                    <h2 className="font-black uppercase tracking-widest text-xs flex items-center gap-2">
                        <Zap size={16} className="text-red-500"/> Logic Registry
                    </h2>
                    <span className="text-[10px] font-black uppercase text-gray-400">{allowanceSettings.length} Parameters Operational</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="table w-full border-separate border-spacing-0">
                        <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 tracking-widest">
                            <tr>
                                <th className="py-4 pl-8 border-b">Allowance Type</th>
                                <th className="border-b">Calculation Mode</th>
                                <th className="border-b">Standard Value</th>
                                <th className="border-b">Registry Description</th>
                                <th className="border-b">Status</th>
                                <th className="border-b text-right pr-8">Commands</th>
                            </tr>
                        </thead>
                        <tbody className="font-bold text-sm text-gray-700 italic-last-child">
                            {allowanceSettings.length > 0 ? (
                                allowanceSettings.map((setting) => (
                                    <tr key={setting.id} className="hover:bg-red-50/30 transition-colors border-b last:border-0">
                                        <td className="pl-8 py-4 uppercase font-black text-gray-900 tracking-tight">{setting.allowance_type.replace(/_/g, ' ')}</td>
                                        <td>
                                            <span className={`badge border-none font-black text-[9px] uppercase px-3 py-2 ${setting.is_percentage ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                                {setting.is_percentage ? 'Relative %' : 'Static Fixed'}
                                            </span>
                                        </td>
                                        <td className="font-mono text-gray-900 font-black">
                                            {setting.is_percentage ? `${setting.percentage}%` : `৳${setting.fixed_amount?.toLocaleString()}`}
                                        </td>
                                        <td className="text-xs text-gray-400 max-w-xs truncate">{setting.description || '-'}</td>
                                        <td>
                                            <span className={`badge border-none font-black text-[9px] uppercase px-3 py-2 ${setting.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {setting.is_active ? 'Active' : 'Halted'}
                                            </span>
                                        </td>
                                        <td className="pr-8 text-right flex justify-end gap-1">
                                            <button onClick={() => handleEdit(setting)} className="btn btn-ghost btn-square btn-xs hover:bg-gray-900 hover:text-white"><Edit3 size={14}/></button>
                                            <button onClick={() => handleDelete(setting)} className="btn btn-ghost btn-square btn-xs hover:bg-red-600 hover:text-white text-red-400"><Trash2 size={14}/></button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="6" className="py-20 text-center text-gray-400 font-black uppercase text-xs tracking-widest opacity-30">No Parameters Defined</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Individual Payroll Matrix */}
            <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="bg-gray-50 px-8 py-5 border-b border-gray-200">
                    <h2 className="font-black uppercase tracking-widest text-xs text-gray-900">Personnel Compensation Matrix</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="table w-full border-separate border-spacing-0">
                        <thead className="text-[10px] font-black uppercase tracking-tighter text-gray-400 bg-white">
                            <tr>
                                <th className="py-4 pl-8 border-b">Personnel</th>
                                <th className="border-b">Basic Base</th>
                                <th className="border-b">House Rent</th>
                                <th className="border-b">Medical</th>
                                <th className="border-b">Transport</th>
                                <th className="border-b">Other</th>
                                <th className="border-b text-right pr-8">Audit</th>
                            </tr>
                        </thead>
                        <tbody className="font-bold text-sm">
                            {employees.map((employee) => (
                                <tr key={employee.id} className="hover:bg-gray-50 transition-colors border-b last:border-0">
                                    <td className="pl-8 py-4">
                                        <div className="flex flex-col leading-tight">
                                            <span className="font-black text-gray-900 uppercase tracking-tight">{employee.name}</span>
                                            <span className="text-[10px] font-mono text-red-600 font-bold uppercase tracking-tighter">ID: {employee.employee_id}</span>
                                        </div>
                                    </td>
                                    <td className="font-mono text-xs text-gray-900">৳{employee.basic_salary?.toLocaleString()}</td>
                                    <td className="font-mono text-xs">
                                        <span className={employee.house_rent > 0 ? 'text-red-600 font-black' : 'text-green-600'}>৳{employee.house_rent?.toLocaleString()}</span>
                                    </td>
                                    <td className="font-mono text-xs">
                                        <span className={employee.medical_allowance > 0 ? 'text-red-600 font-black' : 'text-green-600'}>৳{employee.medical_allowance?.toLocaleString()}</span>
                                    </td>
                                    <td className="font-mono text-xs">
                                        <span className={employee.transport_allowance > 0 ? 'text-red-600 font-black' : 'text-green-600'}>৳{employee.transport_allowance?.toLocaleString()}</span>
                                    </td>
                                    <td className="font-mono text-xs">
                                        <span className={employee.other_allowance > 0 ? 'text-red-600 font-black' : 'text-green-600'}>৳{employee.other_allowance?.toLocaleString()}</span>
                                    </td>
                                    <td className="pr-8 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => handleDebugAllowance(employee.id)} className="btn btn-xs bg-gray-900 text-white rounded-lg font-black uppercase text-[8px] tracking-widest px-3 border-none hover:bg-red-600 transition-colors">Debug</button>
                                            <Link href={route('employees.edit', employee.id)} className="btn btn-xs btn-ghost text-red-600 font-black uppercase text-[8px] tracking-widest px-3 border border-red-100 hover:bg-red-50">Edit</Link>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            
        </div>
    );
}