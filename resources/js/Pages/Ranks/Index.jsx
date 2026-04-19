import { Head, useForm, Link } from '@inertiajs/react';
import { useState } from 'react';
import { Plus, X, Award, DollarSign, Calendar, Clock, Save, Trash2 } from 'lucide-react';

export default function Ranks({ ranks }) {
    const [showForm, setShowForm] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        level: '',
        base_salary: '',
        salary_increment_percentage: '',
        min_working_days: 22,
        max_late_minutes: 30,
        benefits: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('ranks.store'), {
            onSuccess: () => {
                reset();
                setShowForm(false);
            },
        });
    };

    return (
        <div className="p-6 bg-[#fcfcfc] min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b border-gray-200 pb-6">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Personnel <span className="text-red-600">Ranks</span></h1>
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">Hierarchical Wage & Benefit Configuration</p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="btn bg-red-600 hover:bg-red-700 text-white border-none rounded-xl px-8 font-black uppercase text-xs tracking-widest shadow-lg transition-all"
                >
                    <Plus size={16} className="mr-2" /> Add New Rank
                </button>
            </div>

            {/* Add Rank Modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl border-4 border-gray-900 w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                        <div className="bg-gray-900 p-4 flex justify-between items-center text-white">
                            <h2 className="font-black uppercase text-xs tracking-widest flex items-center gap-2">
                                <Award size={18} className="text-red-500" /> Define System Rank
                            </h2>
                            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-red-500 transition-colors"><X size={24}/></button>
                        </div>
                        
                        <form onSubmit={submit} className="p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="form-control">
                                    <label className="label font-black text-[10px] uppercase text-gray-400 tracking-widest">Rank Title</label>
                                    <input type="text" value={data.name} onChange={e => setData('name', e.target.value)} className="input input-bordered rounded-xl font-bold border-gray-300 focus:border-red-600" required placeholder="e.g. Senior Technician" />
                                    {errors.name && <p className="text-red-600 text-[10px] mt-1 font-bold">{errors.name}</p>}
                                </div>

                                <div className="form-control">
                                    <label className="label font-black text-[10px] uppercase text-gray-400 tracking-widest">Grade Level</label>
                                    <input type="text" value={data.level} onChange={e => setData('level', e.target.value)} className="input input-bordered rounded-xl font-bold border-gray-300 focus:border-red-600" required placeholder="e.g. A1" />
                                    {errors.level && <p className="text-red-600 text-[10px] mt-1 font-bold">{errors.level}</p>}
                                </div>

                                <div className="form-control">
                                    <label className="label font-black text-[10px] uppercase text-gray-400 tracking-widest">Base Salary (Monthly)</label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
                                        <input type="number"  value={data.base_salary} onChange={e => setData('base_salary', e.target.value)} className="input input-bordered w-full pl-10 rounded-xl font-mono font-black border-gray-300" required />
                                    </div>
                                </div>

                                <div className="form-control">
                                    <label className="label font-black text-[10px] uppercase text-gray-400 tracking-widest">Annual Increment %</label>
                                    <input type="number"  value={data.salary_increment_percentage} onChange={e => setData('salary_increment_percentage', e.target.value)} className="input input-bordered rounded-xl font-mono font-black border-gray-300" required />
                                </div>

                                <div className="form-control">
                                    <label className="label font-black text-[10px] uppercase text-gray-400 tracking-widest">Duty Threshold (Days)</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
                                        <input type="number" value={data.min_working_days} onChange={e => setData('min_working_days', e.target.value)} className="input input-bordered w-full pl-10 rounded-xl font-black border-gray-300" required />
                                    </div>
                                </div>

                                <div className="form-control">
                                    <label className="label font-black text-[10px] uppercase text-gray-400 tracking-widest">Late Allowance (Mins)</label>
                                    <div className="relative">
                                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
                                        <input type="number" value={data.max_late_minutes} onChange={e => setData('max_late_minutes', e.target.value)} className="input input-bordered w-full pl-10 rounded-xl font-black border-gray-300" required />
                                    </div>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="label font-black text-[10px] uppercase text-gray-400 tracking-widest">Benefit Package Details</label>
                                    <textarea value={data.benefits} onChange={e => setData('benefits', e.target.value)} rows="3" className="textarea textarea-bordered w-full rounded-xl font-bold border-gray-300 focus:border-red-600" placeholder="List medical, fuel, or meal allowances..."></textarea>
                                </div>
                            </div>

                            <div className="mt-8 flex justify-end gap-3 border-t pt-6">
                                <button type="button" onClick={() => setShowForm(false)} className="btn btn-ghost font-black uppercase text-xs tracking-widest">Abort</button>
                                <button type="submit" disabled={processing} className="btn bg-red-600 hover:bg-red-700 text-white border-none rounded-xl px-10 font-black uppercase text-xs tracking-widest shadow-lg">
                                    {processing ? 'Syncing...' : 'Commit Rank'} <Save size={16} className="ml-2"/>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {ranks.map((rank) => (
                    <div key={rank.id} className="bg-white rounded-2xl border-t-8 border-gray-900 shadow-sm hover:shadow-md transition-all group overflow-hidden">
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <span className="text-[10px] font-black text-red-600 uppercase tracking-[0.2em]">Level {rank.level}</span>
                                    <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">{rank.name}</h3>
                                </div>
                                <div className="p-3 bg-gray-100 rounded-xl text-gray-900 group-hover:bg-red-600 group-hover:text-white transition-colors">
                                    <Award size={20} />
                                </div>
                            </div>

                            <div className="space-y-3 bg-gray-50 p-4 rounded-xl mb-6">
                                <div className="flex justify-between text-xs font-bold uppercase tracking-tighter">
                                    <span className="text-gray-400">Base Salary</span>
                                    <span className="text-gray-900 font-mono">৳{rank.base_salary}</span>
                                </div>
                                <div className="flex justify-between text-xs font-bold uppercase tracking-tighter">
                                    <span className="text-gray-400">Annual Growth</span>
                                    <span className="text-red-600">{rank.salary_increment_percentage}%</span>
                                </div>
                                <div className="flex justify-between text-xs font-bold uppercase tracking-tighter">
                                    <span className="text-gray-400">Monthly Duty</span>
                                    <span className="text-gray-900">{rank.min_working_days} Days</span>
                                </div>
                            </div>

                            {rank.benefits && (
                                <div className="mb-6">
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Benefit Dossier</p>
                                    <p className="text-xs font-bold text-gray-600 italic line-clamp-2">"{rank.benefits}"</p>
                                </div>
                            )}

                            <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                    {rank.users_count} Active Staff
                                </span>
                                <button className="btn btn-ghost btn-xs text-red-400 hover:text-red-600 font-black uppercase">
                                    <Trash2 size={14} className="mr-1"/> Delete
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}