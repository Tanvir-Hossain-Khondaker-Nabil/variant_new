import { Head, Link } from '@inertiajs/react';
import { 
    Printer, 
    ArrowLeft, 
    User, 
    Briefcase, 
    Building2, 
    Calendar, 
    DollarSign, 
    CreditCard, 
    ShieldCheck, 
    CheckCircle2,
    Clock,
    Wallet
} from 'lucide-react';

export default function Payslip({ salary, business }) {
    // যদি salary null হয়
    if (!salary) {
        return (
            <div className="bg-white p-8 rounded-2xl border-2 border-gray-900 shadow-2xl max-w-4xl mx-auto text-center mt-10">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <XCircle className="text-red-600" size={32} />
                </div>
                <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight mb-2">Payslip Not Found</h1>
                <p className="text-gray-500 font-bold uppercase text-xs tracking-widest mb-6">The requested registry entry does not exist.</p>
                <Link 
                    href="/salary" 
                    className="btn bg-gray-900 text-white border-none rounded-xl px-8 font-black uppercase text-xs tracking-widest"
                >
                    Back to Salary List
                </Link>
            </div>
        );
    }

    const { employee, ...salaryData } = salary;

    // যদি employee relation না থাকে
    if (!employee) {
        return (
            <div className="bg-white p-8 rounded-2xl border-2 border-gray-900 shadow-2xl max-w-4xl mx-auto text-center mt-10">
                <h1 className="text-2xl font-black text-red-600 uppercase tracking-tight mb-4">Employee Data Missing</h1>
                <p className="text-gray-500 font-bold uppercase text-xs tracking-widest">Incomplete registry record detected.</p>
            </div>
        );
    }

    const earnings = [
        { label: 'Basic Salary', amount: salary.basic_salary || 0 },
        { label: 'House Rent', amount: salary.house_rent || 0 },
        { label: 'Medical Allowance', amount: salary.medical_allowance || 0 },
        { label: 'Transport Allowance', amount: salary.transport_allowance || 0 },
        { label: 'Other Allowance', amount: salary.other_allowance || 0 },
        { label: 'Total Allowance', amount: salary.total_allowance || 0 },
    ];

    const bonuses = [
        { label: 'Eid Bonus', amount: salary.eid_bonus || 0 },
        { label: 'Festival Bonus', amount: salary.festival_bonus || 0 },
        { label: 'Performance Bonus', amount: salary.performance_bonus || 0 },
        { label: 'Other Bonus', amount: salary.other_bonus || 0 },
        { label: 'Total Bonus', amount: salary.total_bonus || 0 },
    ];

    const otherEarnings = [
        { label: 'Commission', amount: salary.commission || 0 },
        { label: 'Overtime', amount: salary.overtime_amount || 0 },
    ];

   const deductions = [
    { label: 'Late Deduction', amount: salary.late_deduction || 0 },
    { label: 'Salary Advance', amount: salary.advance_deduction || 0 },
    { label: 'Absent Deduction', amount: salary.absent_deduction || 0 },
    { label: 'Tax Deduction', amount: salary.tax_deduction || 0 },
    { label: 'Provident Fund', amount: salary.provident_fund || 0 },
    { label: 'Other Deductions', amount: salary.other_deductions || 0 },
    { label: 'Total Deductions', amount: salary.total_deductions || 0 },
];

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-BD', {
            style: 'currency',
            currency: 'BDT',
            minimumFractionDigits: 2
        }).format(amount || 0);
    };

    const printPayslip = () => {
        window.print();
    };

    const hasBonus = salary.total_bonus > 0;
    const hasOtherEarnings = salary.commission > 0 || salary.overtime_amount > 0;

    return (
        <>
            <Head title={`Payslip - ${employee.name}`} />
            
            <div className="bg-[#fcfcfc] min-h-screen p-4 md:p-10">
                <div className="bg-white rounded-3xl border-2 border-gray-900 shadow-2xl max-w-4xl mx-auto overflow-hidden">
                    
                    {/* Industrial Header Toolbar */}
                    <div className="bg-gray-900 p-6 flex flex-col md:flex-row justify-between items-center gap-4 no-print border-b-4 border-red-600">
                        <Link href="/salary" className="text-white hover:text-red-500 flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-colors">
                            <ArrowLeft size={16}/> Back to Archive
                        </Link>
                        <button
                            onClick={printPayslip}
                            className="btn bg-red-600 hover:bg-red-700 text-white border-none rounded-xl px-8 font-black uppercase text-xs tracking-widest shadow-lg transition-all"
                        >
                            <Printer size={16} className="mr-2" /> Print Payslip
                        </button>
                    </div>

                    <div className="p-8 md:p-12">
                        {/* Company Branding */}
                        <div className="flex flex-col items-center text-center mb-10 pb-10 border-b border-gray-100">
                            <div className="w-20 h-20 bg-gray-900 rounded-2xl flex items-center justify-center mb-4 shadow-xl border-b-4 border-red-600">
                                <span className="text-white font-black text-2xl">MC</span>
                            </div>
                            <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Motorcycle Enterprise Ltd.</h1>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.3em] mt-1 italic">Industrial Human Resources Division</p>
                        </div>

                        {/* Employee & Salary Info Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12">
                            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-red-600 mb-4 flex items-center gap-2">
                                    <User size={14}/> Personnel Identity
                                </h3>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between border-b border-gray-200 pb-2">
                                        <span className="text-gray-400 font-bold uppercase text-[10px]">Name</span>
                                        <span className="font-black text-gray-900 uppercase">{employee.name}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-gray-200 pb-2">
                                        <span className="text-gray-400 font-bold uppercase text-[10px]">Staff ID</span>
                                        <span className="font-mono font-black text-gray-900">{employee.employee_id}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-gray-200 pb-2">
                                        <span className="text-gray-400 font-bold uppercase text-[10px]">Rank</span>
                                        <span className="font-bold text-gray-700">{employee.rank?.name || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400 font-bold uppercase text-[10px]">Unit</span>
                                        <span className="font-bold text-gray-700">{employee.department || 'Operations'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-red-600 mb-4 flex items-center gap-2">
                                    <Calendar size={14}/> Statement cycle
                                </h3>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between border-b border-gray-200 pb-2">
                                        <span className="text-gray-400 font-bold uppercase text-[10px]">Pay Period</span>
                                        <span className="font-black text-gray-900">{salary.month}/{salary.year}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-gray-200 pb-2">
                                        <span className="text-gray-400 font-bold uppercase text-[10px]">Payment Date</span>
                                        <span className="font-bold text-gray-700">{salary.payment_date ? new Date(salary.payment_date).toLocaleDateString() : 'PENDING'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400 font-bold uppercase text-[10px]">Registry Status</span>
                                        <span className={`px-3 py-0.5 rounded-lg text-[10px] font-black uppercase ${
                                            salary.status === 'paid' ? 'bg-green-100 text-green-700' :
                                            salary.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                                            'bg-amber-100 text-amber-700'
                                        }`}>
                                            {salary.status || 'UNPAID'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Breakdown Tables */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
                            {/* Left Side: Earnings & Bonuses */}
                            <div className="space-y-8">
                                <div>
                                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-900 mb-4 border-l-4 border-gray-900 pl-3">Standard Earnings</h3>
                                    <div className="space-y-3">
                                        {earnings.map((item, index) => (
                                            (item.amount > 0 || item.label.includes('Total')) && (
                                                <div key={index} className={`flex justify-between text-sm ${item.label.includes('Total') ? 'pt-2 border-t-2 border-gray-900 mt-2' : ''}`}>
                                                    <span className={`${item.label.includes('Total') ? 'font-black uppercase' : 'text-gray-500 font-bold'}`}>{item.label}</span>
                                                    <span className={`font-mono ${item.label.includes('Total') ? 'font-black text-gray-900' : 'text-gray-700'}`}>{formatCurrency(item.amount)}</span>
                                                </div>
                                            )
                                        ))}
                                    </div>
                                </div>

                                {hasBonus && (
                                    <div>
                                        <h3 className="text-xs font-black uppercase tracking-widest text-green-700 mb-4 border-l-4 border-green-600 pl-3">Incentive Bonuses</h3>
                                        <div className="space-y-3">
                                            {bonuses.map((item, index) => (
                                                (item.amount > 0 || item.label.includes('Total')) && (
                                                    <div key={index} className={`flex justify-between text-sm ${item.label.includes('Total') ? 'pt-2 border-t-2 border-green-600 mt-2' : ''}`}>
                                                        <span className={`${item.label.includes('Total') ? 'font-black uppercase text-green-700' : 'text-gray-500 font-bold'}`}>{item.label}</span>
                                                        <span className="font-mono font-bold text-gray-700">{formatCurrency(item.amount)}</span>
                                                    </div>
                                                )
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Right Side: Deductions & Others */}
                            <div className="space-y-8">
                                <div>
                                    <h3 className="text-xs font-black uppercase tracking-widest text-red-600 mb-4 border-l-4 border-red-600 pl-3">Registry Deductions</h3>
                                    <div className="space-y-3">
                                        {deductions.map((item, index) => (
                                            (item.amount > 0 || item.label.includes('Total')) && (
                                                <div key={index} className={`flex justify-between text-sm ${item.label.includes('Total') ? 'pt-2 border-t-2 border-red-600 mt-2' : ''}`}>
                                                    <span className={`${item.label.includes('Total') ? 'font-black uppercase text-red-600' : 'text-gray-500 font-bold'}`}>{item.label}</span>
                                                    <span className="font-mono font-bold text-gray-700">{formatCurrency(item.amount)}</span>
                                                </div>
                                            )
                                        ))}
                                    </div>
                                </div>

                                {hasOtherEarnings && (
                                    <div>
                                        <h3 className="text-xs font-black uppercase tracking-widest text-blue-700 mb-4 border-l-4 border-blue-600 pl-3">Additional Earnings</h3>
                                        <div className="space-y-3 text-sm">
                                            {otherEarnings.map((item, index) => (
                                                item.amount > 0 && (
                                                    <div key={index} className="flex justify-between">
                                                        <span className="text-gray-500 font-bold">{item.label}</span>
                                                        <span className="font-mono font-bold text-gray-700">{formatCurrency(item.amount)}</span>
                                                    </div>
                                                )
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Final Net Payout Section */}
                        <div className="bg-gray-900 rounded-[2rem] p-10 text-white shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
                                <DollarSign size={150}/>
                            </div>
                            
                            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 items-center gap-8">
                                <div>
                                    <p className="text-[10px] font-black text-red-500 uppercase tracking-[0.4em] mb-2">Net Disbursement</p>
                                    <p className="text-5xl font-black font-mono tracking-tighter">
                                        {formatCurrency(salary.final_salary || salary.net_salary || 0)}
                                    </p>
                                    <div className="flex items-center gap-2 mt-6">
                                        <CheckCircle2 size={16} className="text-green-400"/>
                                        <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">
                                            Amount in Words: {convertToWords(salary.final_salary || salary.net_salary || 0)} Taka Only
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-4 bg-white/5 p-6 rounded-2xl backdrop-blur-sm border border-white/10">
                                    <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-gray-400">
                                        <span>Gross Volume</span>
                                        <span className="text-white">{formatCurrency(salary.gross_salary || 0)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-red-400">
                                        <span>System Deductions</span>
                                        <span className="text-red-400">-{formatCurrency(salary.total_deductions || 0)}</span>
                                    </div>
                                    {Number(salary.advance_deduction || 0) > 0 && (
    <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-red-300">
        <span>Salary Advance</span>
        <span>-{formatCurrency(salary.advance_deduction || 0)}</span>
    </div>
)}

{Number(salary.late_fee_deduction || 0) > 0 && (
    <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-red-300">
        <span>Late Fee</span>
        <span>-{formatCurrency(salary.late_fee_deduction || 0)}</span>
    </div>
)}
                                    <div className="h-px bg-white/20"></div>
                                    <div className="flex items-center gap-2 text-xs font-black uppercase text-green-400">
                                        <ShieldCheck size={14}/> Verified Ledger Entry
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer Details */}
                        <div className="mt-12 text-center">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                Official Document • Motorcycle Enterprise Terminal System
                            </p>
                            <p className="text-[9px] text-gray-300 mt-2 italic">
                                This is a cryptographically verifiable computer-generated payslip and does not require a manual signature.
                            </p>
                            <p className="text-[9px] font-mono text-gray-300 mt-1">Generated: {new Date().toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; font-size: 11px !important; }
                    .bg-[#fcfcfc] { background: white !important; padding: 0 !important; }
                    .rounded-3xl, .rounded-[2rem] { border-radius: 0 !important; border: 1px solid #000 !important; }
                    .shadow-2xl, .shadow-xl, .shadow-md { box-shadow: none !important; }
                    .bg-gray-900 { background: #000 !important; color: white !important; -webkit-print-color-adjust: exact; }
                    .text-white { color: white !important; }
                    .bg-red-600 { background: #000 !important; border: 1px solid #000 !important; }
                    .text-red-600, .text-red-500, .text-red-400 { color: #000 !important; font-weight: bold !important; }
                    .bg-gray-50 { background: transparent !important; border: 1px solid #eee !important; }
                }
            `}</style>
        </>
    );
}

// টাকা কথায় কনভার্ট করার ফাংশন
function convertToWords(amount) {
    if (amount === 0) return 'Zero';
    
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    const num = Math.floor(amount);
    
    if (num < 10) return ones[num];
    if (num < 20) return teens[num - 10];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + ones[num % 10] : '');
    
    return 'Amount in Taka';
}