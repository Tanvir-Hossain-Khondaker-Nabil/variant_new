import { Head, useForm, router } from '@inertiajs/react';
import { useState } from 'react';
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

    const reloadAttendance = () => {
        router.visit(route('attendance.index'), {
            preserveScroll: true,
            preserveState: true,
            only: ['attendances', 'filters', 'employees'],
        });
    };

    const handleCheckIn = async (employeeId) => {
        if (checkingStates[`checkin-${employeeId}`]) return;

        setCheckingStates(prev => ({ ...prev, [`checkin-${employeeId}`]: true }));

        try {
            const response = await axios.post(route('attendance.checkin'), {
                employee_id: employeeId,
            });

            if (response.data.success) {
                reloadAttendance();
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
                employee_id: employeeId,
            });

            if (response.data.success) {
                reloadAttendance();
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
                employee_id: employeeId,
            });

            if (response.data.success) {
                reloadAttendance();
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

    const handleResumeShift = async (employeeId) => {

        if (!confirm('Are you sure you want to resume this shift?')) {
            return;
        }

        if (checkingStates[`resume-${employeeId}`]) return;

        setCheckingStates(prev => ({
            ...prev,
            [`resume-${employeeId}`]: true
        }));

        try {

            const response = await axios.post(
                route('attendance.resume-shift'),
                {
                    employee_id: employeeId,
                }
            );

            if (response.data.success) {

                reloadAttendance();

            } else {

                alert(response.data.message || 'Resume shift failed');
            }

        } catch (error) {

            console.error('Resume shift error:', error);

            alert(
                error.response?.data?.message ||
                error.response?.data?.error ||
                'Resume shift failed'
            );

        } finally {

            setCheckingStates(prev => ({
                ...prev,
                [`resume-${employeeId}`]: false
            }));
        }
    };

    const Icons = {
        Calendar: () => (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
        ),
        Users: () => (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5 0c-.281.384-.612.735-.983 1.05a10.697 10.697 0 01-4.031 1.95 11.056 11.056 0 01-4.986 0 10.697 10.697 0 01-4.031-1.95 6.487 6.487 0 01-.983-1.05" />
            </svg>
        ),
        Search: () => (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
        ),
        Reset: () => (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
        ),
        CheckIn: () => (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
        CheckOut: () => (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
        ),
        EarlyOut: () => (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
        Loading: () => (
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
        ),
        Clock: () => (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
        List: () => (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
        ),
        Empty: () => (
            <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        ),
    };

    const getStatusValue = (attendance) => {
        return attendance?.attendance_status || attendance?.status || 'not_checked';
    };
    const getDisplayStatus = (attendance) => {
    if (!attendance) {
        return 'not_checked';
    }

    if (attendance.check_out) {
        return 'completed';
    }

    return attendance.attendance_status || attendance.status || 'not_checked';
};

    const getCheckInValue = (attendance) => {
        return attendance?.formatted_check_in || attendance?.check_in_time || attendance?.check_in || '-';
    };

    const getCheckOutValue = (attendance) => {
        return attendance?.formatted_check_out || attendance?.check_out || '-';
    };

    const calculateWorkedDuration = (attendance) => {

        if (!attendance?.check_in || !attendance?.check_out) {
            return null;
        }

        const parseTime = (timeString) => {

            if (!timeString) return null;

            const cleanTime = timeString.split(' ')[0];

            const parts = cleanTime.split(':').map(Number);

            return {
                hour: parts[0] || 0,
                minute: parts[1] || 0,
            };
        };

        const checkIn = parseTime(attendance.check_in);

        const checkOut = parseTime(attendance.check_out);

        if (!checkIn || !checkOut) {
            return null;
        }

        const inMinutes =
            (checkIn.hour * 60) + checkIn.minute;

        const outMinutes =
            (checkOut.hour * 60) + checkOut.minute;

        if (outMinutes < inMinutes) {
            return null;
        }

        const totalMinutes = outMinutes - inMinutes;

        const hours = Math.floor(totalMinutes / 60);

        const minutes = totalMinutes % 60;

        return `${hours}h ${minutes}m`;
    };

    const isEarlyOutShift = (attendance) => {

        if (!attendance?.check_out) {
            return false;
        }

        if (!attendance?.office_end_time) {
            return false;
        }

        const parseTime = (timeString) => {

            const cleanTime = timeString.split(' ')[0];

            const parts = cleanTime.split(':').map(Number);

            return {
                hour: parts[0] || 0,
                minute: parts[1] || 0,
            };
        };

        const checkOut = parseTime(attendance.check_out);

        const officeEnd = parseTime(attendance.office_end_time);

        const outMinutes =
            (checkOut.hour * 60) + checkOut.minute;

        const officeMinutes =
            (officeEnd.hour * 60) + officeEnd.minute;

        return outMinutes < officeMinutes;
    };

    const getStatusColor = (status) => {
        const colors = {
            present: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            absent: 'bg-red-50 text-red-700 border-red-200',
            late: 'bg-amber-50 text-amber-700 border-amber-200',
            half_day: 'bg-blue-50 text-blue-700 border-blue-200',
            not_checked: 'bg-gray-50 text-gray-500 border-gray-200',
            completed: 'bg-slate-100 text-slate-700 border-slate-300',
        };

        return colors[status] || 'bg-gray-50 text-gray-700 border-gray-200';
    };

    // const attendanceData = attendances?.data || attendances || [];
    // const todayDate = new Date().toISOString().split('T')[0];

    // const todayAttendances = Array.isArray(attendanceData)
    //     ? attendanceData.filter(att => att.date === todayDate || att.date === todayDate.split('T')[0])
    //     : [];
    const attendanceData = attendances?.data || attendances || [];

const selectedDate =
    filters.date ||
    data.date ||
    new Date().toISOString().split('T')[0];

const normalizeDate = (value) => {
    if (!value) return '';

    if (typeof value === 'string') {
        return value.split('T')[0];
    }

    return value;
};

const todayAttendances = Array.isArray(attendanceData)
    ? attendanceData.filter(att => normalizeDate(att.date) === normalizeDate(selectedDate))
    : [];


    const employeeStatus = {};

    employees.forEach(employee => {
        const attendance = todayAttendances.find(a =>
            a.employee_id === employee.id || a.employee?.id === employee.id
        );

        employeeStatus[employee.id] = {
            checkedIn: !!attendance,
            checkedOut: !!attendance?.check_out,
            status: getDisplayStatus(attendance),
            lateMinutes: attendance?.late_minutes || 0,
            lateFee: attendance?.late_fee || 0,
            attendance,
        };
    });

    const totalEmployees = employees.length;
    const activeToday = todayAttendances.length;
    const lateToday = todayAttendances.filter(item => getStatusValue(item) === 'late').length;
    const completedToday = todayAttendances.filter(item => item.check_out).length;

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <Head title="Attendance Registry" />

            <div className="mb-6 rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-red-600 mb-2">
                            HR Attendance
                        </p>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                            Attendance Registry
                        </h1>
                        <p className="text-sm text-slate-500 font-semibold mt-1">
                            Live employee punch-in, punch-out and late fee monitoring.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <StatCard label="Employees" value={totalEmployees} />
                        <StatCard label="Active Today" value={activeToday} />
                        <StatCard label="Late Today" value={lateToday} />
                        <StatCard label="Completed" value={completedToday} />
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm mb-8">
                <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end">
                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 flex items-center gap-2">
                            <Icons.Calendar />
                            Target Date
                        </label>

                        <input
                            type="date"
                            value={data.date}
                            onChange={e => setData('date', e.target.value)}
                            className="w-full border border-slate-300 rounded-2xl px-4 py-3 font-bold text-sm focus:border-red-600 focus:ring-0"
                            max={new Date().toISOString().split('T')[0]}
                        />
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 flex items-center gap-2">
                            <Icons.Users />
                            Employee
                        </label>

                        <select
                            value={data.employee_id}
                            onChange={e => setData('employee_id', e.target.value)}
                            className="w-full border border-slate-300 rounded-2xl px-4 py-3 font-bold text-sm focus:border-red-600 focus:ring-0"
                        >
                            <option value="">All Employees</option>

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
                            className="flex-1 bg-slate-900 text-white px-5 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-red-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {processing ? <Icons.Loading /> : <Icons.Search />}
                            Filter
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setData({
                                    date: new Date().toISOString().split('T')[0],
                                    employee_id: '',
                                });

                                setTimeout(() => {
                                    get(route('attendance.index'), {
                                        preserveState: true,
                                        preserveScroll: true,
                                    });
                                }, 100);
                            }}
                            className="bg-slate-100 text-slate-700 px-5 py-3 rounded-2xl hover:bg-slate-200 transition"
                        >
                            <Icons.Reset />
                        </button>
                    </div>
                </form>
            </div>

            <div className="mb-10">
                <div className="flex justify-between items-center mb-5">
                    <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 flex items-center gap-2">
                        <Icons.List />
                        Live Shift Roster
                    </h2>

                    <div className="text-[10px] font-black uppercase bg-white border border-slate-200 px-3 py-1.5 rounded-full text-slate-500">
                        {activeToday} Active • {totalEmployees} Total
                    </div>
                </div>

                {employees.length === 0 ? (
                    <EmptyState text="No employees registered in the system." />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                        {employees.map(employee => {
                            const status = employeeStatus[employee.id];
                            const isCheckingIn = checkingStates[`checkin-${employee.id}`];
                            const isCheckingOut = checkingStates[`checkout-${employee.id}`];
                            const isEarlyOut = checkingStates[`earlyout-${employee.id}`];

                            const isResuming =
                                checkingStates[`resume-${employee.id}`];

                            const workedDuration =
                                calculateWorkedDuration(status.attendance);

                            const earlyOutShift =
                                isEarlyOutShift(status.attendance);

                            return (
                                <div
                                    key={employee.id}
                                    className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition overflow-hidden"
                                >
                                    <div className={`h-1.5 ${status.checkedIn
                                            ? status.checkedOut
                                                ? 'bg-slate-300'
                                                : status.status === 'late'
                                                    ? 'bg-amber-500'
                                                    : 'bg-emerald-500'
                                            : 'bg-red-500'
                                        }`} />

                                    <div className="p-5">
                                        <div className="flex justify-between gap-3 mb-4">
                                            <div>
                                                <h3 className="font-black text-slate-900 uppercase text-sm leading-tight">
                                                    {employee.name}
                                                </h3>
                                                <p className="text-[10px] font-mono text-slate-400 font-bold mt-1">
                                                    ID: {employee.employee_id}
                                                </p>
                                            </div>

                                            <span className={`h-fit px-2.5 py-1 text-[9px] font-black uppercase rounded-xl border ${getStatusColor(status.status)}`}>
                                                {status.checkedIn ? status.status?.replace('_', ' ') : 'Not Checked'}
                                            </span>
                                        </div>

                                        <div className="space-y-2">
                                            {!status.checkedIn ? (
                                                <button
                                                    onClick={() => handleCheckIn(employee.id)}
                                                    disabled={isCheckingIn}
                                                    className="w-full bg-slate-900 text-white py-3 px-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-600 disabled:opacity-50 transition flex items-center justify-center gap-2"
                                                >
                                                    {isCheckingIn ? <Icons.Loading /> : <Icons.CheckIn />}
                                                    Punch In
                                                </button>
                                            ) : !status.checkedOut ? (
                                                <>
                                                    <button
                                                        onClick={() => handleCheckOut(employee.id)}
                                                        disabled={isCheckingOut}
                                                        className="w-full bg-red-600 text-white py-3 px-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-red-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
                                                    >
                                                        {isCheckingOut ? <Icons.Loading /> : <Icons.CheckOut />}
                                                        Punch Out
                                                    </button>

                                                    <button
                                                        onClick={() => handleEarlyOut(employee.id)}
                                                        disabled={isEarlyOut}
                                                        className="w-full bg-orange-50 text-orange-700 border border-orange-200 py-2.5 px-4 rounded-2xl font-black uppercase text-[9px] tracking-widest hover:bg-orange-100 disabled:opacity-50 transition flex items-center justify-center gap-2"
                                                    >
                                                        {isEarlyOut ? <Icons.Loading /> : <Icons.EarlyOut />}
                                                        Early Release
                                                    </button>
                                                </>
                                            ) : (
                                                <div className="space-y-2">

                                                    <div className="text-center py-3 text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 rounded-2xl border border-emerald-200">
                                                        Shift Logged
                                                    </div>

                                                    <button
                                                        onClick={() => handleResumeShift(employee.id)}
                                                        disabled={isResuming}
                                                        className="w-full bg-slate-100 text-slate-700 border border-slate-200 py-2.5 px-4 rounded-2xl font-black uppercase text-[9px] tracking-widest hover:bg-slate-200 disabled:opacity-50 transition flex items-center justify-center gap-2"
                                                    >
                                                        {isResuming
                                                            ? <Icons.Loading />
                                                            : <Icons.Clock />
                                                        }

                                                        Resume Shift
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {status.checkedIn && status.attendance && (
                                            <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                                                <div className="grid grid-cols-2 gap-3 text-[10px] font-black uppercase text-slate-400">
                                                    <div>
                                                        <span className="block mb-1">Arrival</span>
                                                        <span className="text-slate-900 font-mono">
                                                            {getCheckInValue(status.attendance)}
                                                        </span>
                                                    </div>

                                                    {workedDuration && (

                                                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">

                                                            <div className="flex justify-between text-[10px] font-black uppercase">

                                                                <span className="text-slate-500">
                                                                    Worked Time
                                                                </span>

                                                                <span className="text-slate-900">
                                                                    {workedDuration}
                                                                </span>
                                                            </div>

                                                            {earlyOutShift && (

                                                                <div className="mt-2 text-[10px] font-black uppercase text-orange-600">
                                                                    Early Out
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    <div className="text-right">
                                                        <span className="block mb-1">Departure</span>
                                                        <span className="text-slate-900 font-mono">
                                                            {getCheckOutValue(status.attendance)}
                                                        </span>
                                                    </div>
                                                </div>

                                                {Number(status.lateMinutes || 0) > 0 && (
                                                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3">
                                                        <div className="flex justify-between text-[10px] font-black uppercase">
                                                            <span className="text-amber-700">
                                                                Late {status.lateMinutes} min
                                                            </span>
                                                            <span className="text-red-600">
                                                                ৳{Number(status.lateFee || 0).toFixed(2)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-6 py-5 border-b border-slate-100 bg-slate-900 flex justify-between items-center">
                    <h2 className="text-white text-xs font-black uppercase tracking-widest flex items-center gap-2">
                        <Icons.List />
                        Attendance Master Log
                    </h2>

                    <div className="text-[10px] font-black uppercase text-red-400">
                        Total {attendances?.total || attendanceData.length} records
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-slate-50">
                            <tr>
                                <TableHead>Employee</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Arrival</TableHead>
                                <TableHead>Departure</TableHead>
                                <TableHead>Worked</TableHead>
                                <TableHead>Late Info</TableHead>
                                <TableHead align="right">Status</TableHead>
                            </tr>
                        </thead>

                        <tbody className="bg-white divide-y divide-slate-100">
                            {attendanceData.length > 0 ? (
                                attendanceData.map((attendance) => {
                                    // const rowStatus = getStatusValue(attendance);
                                    const rowStatus = getDisplayStatus(attendance);

                                    return (
                                        <tr key={attendance.id} className="hover:bg-slate-50 transition">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="h-10 w-10 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-black text-sm">
                                                        {attendance.employee?.name?.charAt(0) || 'N'}
                                                    </div>

                                                    <div className="ml-4">
                                                        <div className="text-sm font-black text-slate-900 uppercase">
                                                            {attendance.employee?.name || 'N/A'}
                                                        </div>
                                                        <div className="text-[10px] font-mono font-bold text-red-600">
                                                            #{attendance.employee?.employee_id || 'N/A'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-slate-500">
                                                {attendance.formatted_date || attendance.date}
                                            </td>

                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-black text-slate-900">
                                                {getCheckInValue(attendance)}
                                            </td>

                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-black text-slate-900">
                                                {getCheckOutValue(attendance)}
                                            </td>

                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-black text-slate-900">

                                                {calculateWorkedDuration(attendance) || '-'}

                                                {isEarlyOutShift(attendance) && (

                                                    <div className="text-[10px] text-orange-600 font-black uppercase mt-1">
                                                        Early Out
                                                    </div>
                                                )}
                                            </td>

                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col gap-1">
                                                    {Number(attendance.late_minutes || 0) > 0 && (
                                                        <>
                                                            <div className="text-[10px] text-amber-700 font-black uppercase">
                                                                Late: {attendance.late_minutes} min
                                                            </div>

                                                            <div className="text-[10px] text-red-600 font-black uppercase">
                                                                Fee: ৳{Number(attendance.late_fee || 0).toFixed(2)}
                                                            </div>
                                                        </>
                                                    )}

                                                    {Number(attendance.overtime_hours || 0) > 0 && (
                                                        <div className="text-[10px] text-emerald-600 font-black uppercase">
                                                            OT: {Number(attendance.overtime_hours).toFixed(2)}h
                                                        </div>
                                                    )}

                                                    {!(Number(attendance.late_minutes || 0) > 0) &&
                                                        !(Number(attendance.overtime_hours || 0) > 0) && (
                                                            <span className="text-slate-300 font-bold">-</span>
                                                        )}
                                                </div>
                                            </td>

                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <span className={`px-3 py-1.5 text-[9px] font-black uppercase rounded-xl border ${getStatusColor(rowStatus)}`}>
                                                    {rowStatus?.replace('_', ' ')}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="7" className="px-6 py-20 text-center">
                                        <EmptyState text="No attendance records found." compact />
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {attendances?.links && attendances.links.length > 3 && (
                    <div className="px-6 py-5 border-t border-slate-100 bg-slate-50 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div className="text-[10px] font-black uppercase text-slate-400">
                            Page {attendances.current_page} of {attendances.last_page}
                        </div>

                        <div className="flex flex-wrap gap-1">
                            {attendances.links.map((link, index) => (
                                <button
                                    key={index}
                                    onClick={() => link.url && get(link.url, { preserveState: true, preserveScroll: true })}
                                    disabled={!link.url || link.active}
                                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition ${link.active
                                            ? 'bg-red-600 text-white shadow-sm'
                                            : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-900'
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

function StatCard({ label, value }) {
    return (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 min-w-[120px]">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                {label}
            </p>
            <h3 className="text-xl font-black text-slate-900">
                {value}
            </h3>
        </div>
    );
}

function TableHead({ children, align = 'left' }) {
    return (
        <th className={`px-6 py-4 text-${align} text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100`}>
            {children}
        </th>
    );
}

function EmptyState({ text, compact = false }) {
    return (
        <div className={`bg-white rounded-3xl ${compact ? '' : 'border-2 border-dashed border-slate-200 p-12'} text-center`}>
            <div className="flex justify-center">
                <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            </div>

            <h3 className="text-sm font-black text-slate-900 uppercase mt-4">
                Registry Empty
            </h3>

            <p className="text-sm text-slate-500 mt-1">
                {text}
            </p>
        </div>
    );
}