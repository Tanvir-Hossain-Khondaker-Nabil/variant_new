import { Head, useForm, Link, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import axios from 'axios';

export default function Attendance({ attendances, filters, employees }) {
    const [processing, setProcessing] = useState(false);
    const [checkingStates, setCheckingStates] = useState({});

    const { data, setData, get } = useForm({
        date: filters.date || new Date().toISOString().split('T')[0],
        employee_id: filters.employee_id || '',
    });

    const submit = (e) => {
        e.preventDefault();
        setProcessing(true);
        get(route('attendance.index'), {
            preserveState: true,
            preserveScroll: true,
            onFinish: () => setProcessing(false),
        });
    };

    const handleCheckIn = async (employeeId) => {
        if (checkingStates[`checkin-${employeeId}`]) return;
        
        setCheckingStates(prev => ({ ...prev, [`checkin-${employeeId}`]: true }));
        
        try {
            const response = await axios.post(route('attendance.checkin'), {
                employee_id: employeeId
            });
            
            if (response.data.success) {
                router.visit(route('attendance.index'), {
                    preserveScroll: true,
                    preserveState: true,
                    only: ['attendances', 'filters', 'employees'],
                });
            } else {
                alert(response.data.message || 'Check-in failed');
            }
        } catch (error) {
            console.error('Check-in error:', error);
            alert(error.response?.data?.message || error.response?.data?.error || 'Check-in failed');
        } finally {
            setCheckingStates(prev => ({ ...prev, [`checkin-${employeeId}`]: false }));
        }
    };

    const handleCheckOut = async (employeeId) => {
        if (checkingStates[`checkout-${employeeId}`]) return;
        
        setCheckingStates(prev => ({ ...prev, [`checkout-${employeeId}`]: true }));
        
        try {
            const response = await axios.post(route('attendance.checkout'), {
                employee_id: employeeId
            });
            
            if (response.data.success) {
                router.visit(route('attendance.index'), {
                    preserveScroll: true,
                    preserveState: true,
                    only: ['attendances', 'filters', 'employees'],
                });
            } else {
                alert(response.data.message || 'Check-out failed');
            }
        } catch (error) {
            console.error('Check-out error:', error);
            alert(error.response?.data?.message || error.response?.data?.error || 'Check-out failed');
        } finally {
            setCheckingStates(prev => ({ ...prev, [`checkout-${employeeId}`]: false }));
        }
    };

    const handleEarlyOut = async (employeeId) => {
        if (!confirm('Are you sure you want to check out early? Overtime will not be calculated.')) {
            return;
        }
        
        if (checkingStates[`earlyout-${employeeId}`]) return;
        
        setCheckingStates(prev => ({ ...prev, [`earlyout-${employeeId}`]: true }));
        
        try {
            const response = await axios.post(route('attendance.early-out'), {
                employee_id: employeeId
            });
            
            if (response.data.success) {
                router.visit(route('attendance.index'), {
                    preserveScroll: true,
                    preserveState: true,
                    only: ['attendances', 'filters', 'employees'],
                });
            } else {
                alert(response.data.message || 'Early out failed');
            }
        } catch (error) {
            console.error('Early out error:', error);
            alert(error.response?.data?.message || error.response?.data?.error || 'Early out failed');
        } finally {
            setCheckingStates(prev => ({ ...prev, [`earlyout-${employeeId}`]: false }));
        }
    };

    // SVG Icons
    const Icons = {
        Calendar: () => (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
        ),
        Users: () => (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5 0c-.281.384-.612.735-.983 1.05a10.697 10.697 0 01-4.031 1.95 11.056 11.056 0 01-4.986 0 10.697 10.697 0 01-4.031-1.95 6.487 6.487 0 01-.983-1.05" />
            </svg>
        ),
        Search: () => (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
        ),
        Reset: () => (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
        ),
        Plus: () => (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
        ),
        ChartBar: () => (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
        ),
        CheckCircle: () => (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
        XCircle: () => (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
        Clock: () => (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
        Hourglass: () => (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
        CheckIn: () => (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
        CheckOut: () => (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
        ),
        EarlyOut: () => (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
        Loading: () => (
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
        ),
        Money: () => (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
        Employee: () => (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
        ),
        List: () => (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
        ),
        UsersGroup: () => (
            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
        ),
        ChartPie: () => (
            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
        ),
        Warning: () => (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
        ),
        CircleCheck: () => (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
        CircleX: () => (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
        Time: () => (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
        ChevronLeft: () => (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
        ),
        ChevronRight: () => (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
        ),
    };

    const getStatusColor = (status) => {
        const colors = {
            'present': 'bg-green-100 text-green-800',
            'absent': 'bg-red-100 text-red-800',
            'late': 'bg-yellow-100 text-yellow-800',
            'half_day': 'bg-blue-100 text-blue-800',
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    const getStatusIcon = (status) => {
        switch(status) {
            case 'present': return <Icons.CheckCircle />;
            case 'absent': return <Icons.XCircle />;
            case 'late': return <Icons.Clock />;
            case 'half_day': return <Icons.Hourglass />;
            default: return <Icons.Clock />;
        }
    };

    const attendanceData = attendances?.data || attendances || [];
    const todayDate = new Date().toISOString().split('T')[0];

    const todayAttendances = Array.isArray(attendanceData) 
        ? attendanceData.filter(att => att.date === todayDate || att.date === todayDate.split('T')[0])
        : [];

    const employeeStatus = {};
    employees.forEach(employee => {
        const attendance = todayAttendances.find(a => 
            a.employee_id === employee.id || a.employee?.id === employee.id
        );
        employeeStatus[employee.id] = {
            checkedIn: !!attendance,
            checkedOut: !!attendance?.check_out,
            status: attendance?.status || 'not_checked',
            attendance: attendance
        };
    });

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-BD', {
            style: 'currency',
            currency: 'BDT',
            minimumFractionDigits: 2
        }).format(amount || 0);
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <Head title="Attendance Registry" />

            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b border-gray-200 pb-6 bg-white p-6 rounded-2xl shadow-sm">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Shift <span className="text-red-600">Terminal</span></h1>
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-xs mt-1">Live Employee Punch-Clock Management</p>
                </div>
            </div>

            {/* Filter Console */}
            <div className="bg-white p-6 rounded-2xl border-2 border-gray-900 shadow-lg mb-8">
                <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                    <div>
                        <label className="block text-[10px] font-black uppercase text-gray-400 mb-1 flex items-center gap-1">
                            <Icons.Calendar /> Target Date
                        </label>
                        <input
                            type="date"
                            value={data.date}
                            onChange={e => setData('date', e.target.value)}
                            className="w-full border-gray-300 rounded-xl px-4 py-2.5 font-bold focus:border-red-600 focus:ring-0 transition-all"
                            max={new Date().toISOString().split('T')[0]}
                        />
                    </div>
                    
                    <div>
                        <label className="block text-[10px] font-black uppercase text-gray-400 mb-1 flex items-center gap-1">
                            <Icons.Users /> Personnel lookup
                        </label>
                        <select
                            value={data.employee_id}
                            onChange={e => setData('employee_id', e.target.value)}
                            className="w-full border-gray-300 rounded-xl px-4 py-2.5 font-bold focus:border-red-600 transition-all"
                        >
                            <option value="">Full Roster</option>
                            {employees.map(employee => (
                                <option key={employee.id} value={employee.id}>
                                    {employee.name} ({employee.employee_id})
                                </option>
                            ))}
                        </select>
                    </div>
                    
                    <div className="flex gap-2">
                        <button
                            type="submit"
                            disabled={processing}
                            className="flex-1 bg-gray-900 text-white px-6 py-3 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-red-600 transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {processing ? <Icons.Loading /> : <Icons.Search />}
                            Execute Filter
                        </button>
                        
                        <button
                            type="button"
                            onClick={() => {
                                setData({
                                    date: new Date().toISOString().split('T')[0],
                                    employee_id: ''
                                });
                                setTimeout(() => {
                                    get(route('attendance.index'), {
                                        preserveState: true,
                                        preserveScroll: true,
                                    });
                                }, 100);
                            }}
                            className="bg-gray-200 text-gray-700 px-5 py-3 rounded-xl hover:bg-gray-300 transition-all"
                        >
                            <Icons.Reset />
                        </button>
                    </div>
                </form>
            </div>

            {/* Quick Access Grid */}
            <div className="mb-10">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-900 flex items-center gap-2">
                        <Icons.List /> LIVE SHIFT ROSTER
                    </h2>
                    <div className="text-[10px] font-black uppercase bg-gray-200 px-3 py-1 rounded-full text-gray-600">
                        {todayAttendances.length} Active • {employees.length} Total
                    </div>
                </div>
                
                {employees.length === 0 ? (
                    <div className="bg-white rounded-3xl border-2 border-dashed border-gray-300 p-12 text-center">
                        <div className="flex justify-center"><Icons.UsersGroup /></div>
                        <h3 className="text-lg font-black text-gray-900 uppercase mt-4">Registry Empty</h3>
                        <p className="text-gray-500">No employees registered in the system.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {employees.map(employee => {
                            const status = employeeStatus[employee.id];
                            const isCheckingIn = checkingStates[`checkin-${employee.id}`];
                            const isCheckingOut = checkingStates[`checkout-${employee.id}`];
                            const isEarlyOut = checkingStates[`earlyout-${employee.id}`];
                            
                            return (
                                <div key={employee.id} className="bg-white rounded-2xl shadow-sm border-2 border-transparent hover:border-red-600 transition-all group overflow-hidden relative">
                                    <div className={`absolute top-0 left-0 w-1 h-full ${status.checkedIn ? (status.checkedOut ? 'bg-gray-300' : 'bg-green-500') : 'bg-red-600'}`}></div>
                                    <div className="p-5">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="font-black text-gray-900 uppercase tracking-tight text-sm">{employee.name}</h3>
                                                <p className="text-[10px] font-mono text-gray-400 font-bold uppercase">
                                                    ID: {employee.employee_id}
                                                </p>
                                            </div>
                                            {status.checkedIn && (
                                                <span className={`px-2 py-1 text-[9px] font-black uppercase rounded-lg border-none ${getStatusColor(status.status)}`}>
                                                    {status.status?.replace('_', ' ')}
                                                </span>
                                            )}
                                        </div>
                                        
                                        <div className="space-y-2">
                                            {!status.checkedIn ? (
                                                <button
                                                    onClick={() => handleCheckIn(employee.id)}
                                                    disabled={isCheckingIn}
                                                    className="w-full bg-gray-900 text-white py-3 px-4 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-green-600 disabled:opacity-50 transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                                                >
                                                    {isCheckingIn ? <Icons.Loading /> : <Icons.CheckIn />}
                                                    PUNCH IN
                                                </button>
                                            ) : !status.checkedOut ? (
                                                <div className="flex flex-col gap-2">
                                                    <button
                                                        onClick={() => handleCheckOut(employee.id)}
                                                        disabled={isCheckingOut}
                                                        className="w-full bg-red-600 text-white py-3 px-4 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-red-700 disabled:opacity-50 transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                                                    >
                                                        {isCheckingOut ? <Icons.Loading /> : <Icons.CheckOut />}
                                                        PUNCH OUT
                                                    </button>
                                                    
                                                    <button
                                                        onClick={() => handleEarlyOut(employee.id)}
                                                        disabled={isEarlyOut}
                                                        className="w-full bg-orange-100 text-orange-700 py-2 px-4 rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-orange-200 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                                                    >
                                                        {isEarlyOut ? <Icons.Loading /> : <Icons.EarlyOut />}
                                                        EARLY RELEASE
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="text-center py-3 text-[10px] font-black uppercase text-green-600 bg-green-50 rounded-xl border-2 border-green-100">
                                                    Shift Logged
                                                </div>
                                            )}
                                        </div>
                                        
                                        {status.checkedIn && status.attendance && (
                                            <div className="mt-4 pt-4 border-t border-gray-50">
                                                <div className="grid grid-cols-2 gap-2 text-[10px] font-black uppercase text-gray-400">
                                                    <div>
                                                        <span className="opacity-60 block">Arrival</span>
                                                        <span className="text-gray-900 font-mono">{status.attendance.formatted_check_in || status.attendance.check_in || '-'}</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="opacity-60 block">Departure</span>
                                                        <span className="text-gray-900 font-mono">{status.attendance.formatted_check_out || status.attendance.check_out || '-'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Master Log Table */}
            <div className="bg-white rounded-3xl border-2 border-gray-900 overflow-hidden shadow-2xl">
                <div className="px-8 py-5 border-b border-gray-100 bg-gray-900 flex justify-between items-center">
                    <h2 className="text-white text-xs font-black uppercase tracking-widest flex items-center gap-2">
                        <Icons.List /> Registry Master Log
                    </h2>
                    <div className="text-[10px] font-black uppercase text-red-500">
                        Total {attendances?.total || attendanceData.length} records
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="min-w-full border-separate border-spacing-0">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b">Personnel</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b">Date</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b">Arrival</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b">Departure</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b">Log Metrics</th>
                                <th className="px-8 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest border-b">Protocol Status</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {attendanceData.length > 0 ? (
                                attendanceData.map((attendance) => (
                                    <tr key={attendance.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-8 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="h-10 w-10 bg-gray-900 rounded-xl flex items-center justify-center text-white font-black text-sm">
                                                    {attendance.employee?.name?.charAt(0)}
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-black text-gray-900 uppercase tracking-tight">
                                                        {attendance.employee?.name || 'N/A'}
                                                    </div>
                                                    <div className="text-[10px] font-mono font-bold text-red-600">
                                                        #{attendance.employee?.employee_id || 'N/A'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-gray-500 uppercase tracking-tighter">
                                            {attendance.formatted_date || attendance.date}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-black text-gray-900">
                                            {attendance.formatted_check_in || attendance.check_in || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-black text-gray-900">
                                            {attendance.formatted_check_out || attendance.check_out || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col gap-1">
                                                {attendance.late_hours > 0 && (
                                                    <div className="text-[10px] text-red-600 font-black uppercase">
                                                        Late: {Number(attendance.late_hours).toFixed(2)}h
                                                    </div>
                                                )}
                                                {attendance.overtime_hours > 0 && (
                                                    <div className="text-[10px] text-green-600 font-black uppercase">
                                                        OT: {Number(attendance.overtime_hours).toFixed(2)}h
                                                    </div>
                                                )}
                                                {!(attendance.late_hours > 0) && !(attendance.overtime_hours > 0) && (
                                                    <span className="text-gray-300">-</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-8 py-4 whitespace-nowrap text-right">
                                            <span className={`px-3 py-1 text-[9px] font-black uppercase rounded-lg shadow-sm border-none ${getStatusColor(attendance.status)}`}>
                                                {attendance.status?.replace('_', ' ')}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center opacity-30 grayscale">
                                            <Icons.ChartPie />
                                            <p className="text-xs font-black uppercase tracking-[0.2em] mt-4">Registry Null</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination (Design Only update) */}
                {attendances?.links && attendances.links.length > 3 && (
                    <div className="px-8 py-5 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                        <div className="text-[10px] font-black uppercase text-gray-400">
                            Page {attendances.current_page} of {attendances.last_page}
                        </div>
                        <div className="flex gap-1">
                            {attendances.links.map((link, index) => (
                                <button
                                    key={index}
                                    onClick={() => link.url && get(link.url, { preserveState: true, preserveScroll: true })}
                                    disabled={!link.url || link.active}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                                        link.active 
                                            ? 'bg-red-600 text-white shadow-lg' 
                                            : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-900'
                                    } ${!link.url ? 'opacity-30 grayscale' : ''}`}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}