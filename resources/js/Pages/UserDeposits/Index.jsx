// resources/js/Pages/UserDeposits/Index.jsx
import React, { useState } from "react";
import { 
  Frown, Plus, Trash2, Eye, Search, Edit, Check, X, Calendar, 
  User, Mail, Phone, MapPin, DollarSign, CheckCircle, AlertCircle, 
  CreditCard, History, Package, Shield, RefreshCw, Landmark, Wallet, 
  Smartphone, Building, Users, TrendingUp, TrendingDown, FileText, 
  ArrowUpRight, Info, ChevronRight, Clock, Banknote, Receipt, 
  Download, Upload, Filter, MoreVertical, BarChart3, Store, UserCheck 
} from "lucide-react";
import { Link, router, useForm, usePage } from "@inertiajs/react";

// Simple PageHeader component
function PageHeader({ title, subtitle, children }) {
  return (
    <div className="mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex-1">
          <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight mb-1">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-gray-500 font-medium">{subtitle}</p>
          )}
        </div>
        {children && (
          <div className="flex-shrink-0">
            {children}
          </div>
        )}
      </div>
      <div className="h-px bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200"></div>
    </div>
  );
}

// Simple translation hook
function useTranslation() {
  const { props } = usePage();
  const locale = props.locale || 'en';
  
  const t = (key, fallback = '') => {
    const translations = {
      // Page titles
      'user_deposit.title': 'User Deposits Management',
      'user_deposit.subtitle': 'Manage all user deposit requests from here',
      
      // Filters
      'user_deposit.search_placeholder': 'Search by user name, transaction ID...',
      'user_deposit.all_status': 'All Status',
      'user_deposit.all_payment_methods': 'All Payment Methods',
      'user_deposit.clear': 'Clear',
      'user_deposit.add_deposit': 'Add Deposit',
      
      // Status - matching your model constants
      'user_deposit.pending': 'Pending',
      'user_deposit.completed': 'Completed',
      'user_deposit.failed': 'Failed',
      
      // Payment methods
      'user_deposit.cash': 'Cash',
      'user_deposit.bank_transfer': 'Bank Transfer',
      'user_deposit.mobile_banking': 'Mobile Banking',
      'user_deposit.credit_card': 'Credit Card',
      'user_deposit.check': 'Check',
      
      // Stats
      'user_deposit.total_deposits': 'Total Deposits',
      'user_deposit.total_amount': 'Total Amount',
      
      // Table headers
      'user_deposit.user_info': 'User Info',
      'user_deposit.transaction_details': 'Transaction Details',
      'user_deposit.payment_info': 'Payment Info',
      'user_deposit.status': 'Status',
      'user_deposit.actions': 'Actions',
      'user_deposit.amount': 'Amount',
      'user_deposit.transaction_id': 'Transaction ID',
      'user_deposit.note': 'Note',
      'user_deposit.created_by': 'Created by',
      'user_deposit.na': 'N/A',
      
      // Modal
      'user_deposit.edit_deposit': 'Edit Deposit',
      'user_deposit.new_deposit': 'New Deposit Request',
      'user_deposit.update_deposit_info': 'Update deposit information',
      'user_deposit.create_new_deposit': 'Create a new deposit request',
      'user_deposit.deposit_information': 'Deposit Information',
      'user_deposit.select_user': 'Select User',
      'user_deposit.choose_user': 'Choose a user',
      'user_deposit.enter_transaction_id': 'Enter transaction ID or reference number',
      'user_deposit.enter_note': 'Enter any additional notes...',
      'user_deposit.optional': 'Optional',
      
      // Buttons
      'user_deposit.cancel': 'Cancel',
      'user_deposit.processing': 'Processing...',
      'user_deposit.update_deposit': 'Update Deposit',
      'user_deposit.create_deposit': 'Create Deposit',
      'user_deposit.edit': 'Edit',
      'user_deposit.delete': 'Delete',
      'user_deposit.approve': 'Approve',
      'user_deposit.reject': 'Reject',
      'user_deposit.approve_confirmation': 'Are you sure you want to approve this deposit?',
      'user_deposit.reject_confirmation': 'Are you sure you want to reject this deposit?',
      'user_deposit.delete_confirmation': 'Are you sure you want to delete this deposit?',
      
      // Empty state
      'user_deposit.no_deposits_matching': 'No deposits matching ":search"',
      'user_deposit.no_deposits_found': 'No deposits found',
      'user_deposit.add_first_deposit': 'Add Your First Deposit',
    };
    
    return translations[key] || fallback;
  };
  
  return { t, locale };
}

// Main component
export default function UserDeposits({ deposits, filters }) {
  const { auth } = usePage().props;
  const userRole = auth?.user?.role;
  const { t, locale } = useTranslation();
  const [model, setModel] = useState(false);
  const [selectedDeposit, setSelectedDeposit] = useState(null);

  // Handle filters
  const [localFilters, setLocalFilters] = useState({
    search: filters?.search || "",
    status: filters?.status || "",
    payment_method: filters?.payment_method || "",
  });

  // Status options for deposits - matching your model constants
  const STATUS_OPTIONS = [
    { value: 'pending', label: t('user_deposit.pending', 'Pending'), color: 'bg-yellow-100 text-yellow-800' },
    { value: 'approved', label: t('user_deposit.approved', 'Approved'), color: 'bg-green-100 text-green-800' },
    { value: 'failed', label: t('user_deposit.failed', 'Failed'), color: 'bg-red-100 text-red-800' },
  ];

  // Payment method options
  const PAYMENT_METHODS = [
    { value: 'cash', label: t('user_deposit.cash', 'Cash'), icon: Wallet },
    { value: 'bank_transfer', label: t('user_deposit.bank_transfer', 'Bank Transfer'), icon: Banknote },
    { value: 'mobile_banking', label: t('user_deposit.mobile_banking', 'Mobile Banking'), icon: Smartphone },
    { value: 'credit_card', label: t('user_deposit.credit_card', 'Credit Card'), icon: CreditCard },
    { value: 'check', label: t('user_deposit.check', 'Check'), icon: FileText },
  ];

  // Handle filter changes
  const handleFilter = (field, value) => {
    const newFilters = { ...localFilters, [field]: value };
    setLocalFilters(newFilters);
    
    router.get(route("deposits.index"), 
      { 
        search: newFilters.search, 
        status: newFilters.status,
        payment_method: newFilters.payment_method 
      },
      {
        preserveScroll: true,
        preserveState: true,
        replace: true,
      }
    );
  };

  const clearFilters = () => {
    setLocalFilters({ search: "", status: "", payment_method: "" });
    router.get(route("deposits.index"), {}, { replace: true });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      router.get(route("deposits.index"), 
        { 
          search: localFilters.search, 
          status: localFilters.status,
          payment_method: localFilters.payment_method 
        },
        { preserveScroll: true, preserveState: true, replace: true }
      );
    }
  };

  // Deposit form for create/edit - matching your model fillable fields
  const depositForm = useForm({
    id: "",
    amount: "",
    payment_method: "cash",
    transaction_id: "",
    note: "",
  });

  // Get status badge
  const getStatusBadge = (status) => {
    const option = STATUS_OPTIONS.find(opt => opt.value === status) || STATUS_OPTIONS[0];
    return (
      <span className={`badge border-none font-bold text-xs px-3 py-1.5 ${option.color}`}>
        {option.label}
      </span>
    );
  };

  // Get payment method icon and badge
  const getPaymentMethodBadge = (method) => {
    const paymentMethod = PAYMENT_METHODS.find(m => m.value === method) || PAYMENT_METHODS[0];
    const Icon = paymentMethod.icon;
    return (
      <div className="flex items-center gap-2">
        <Icon size={14} className="text-gray-600" />
        <span className="text-sm font-bold text-gray-700">{paymentMethod.label}</span>
      </div>
    );
  };

  // Format currency
  const formatCurrency = (amount) => {
    const num = parseFloat(amount) || 0;
    if (locale === 'bn') {
      return new Intl.NumberFormat('bn-BD', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(num);
    } else {
      return new Intl.NumberFormat('en-BD', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(num);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return t('user_deposit.na', 'N/A');
    try {
      const date = new Date(dateString);
      if (locale === 'bn') {
        return date.toLocaleDateString('bn-BD', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      } else {
        return date.toLocaleDateString('en-US', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    } catch (e) {
      return dateString;
    }
  };

  // Handle create deposit
  const handleCreateDeposit = () => {
    depositForm.reset();
    setModel(true);
  };

  // Handle edit deposit
  const handleEditDeposit = (deposit) => {
    depositForm.setData({
      id: deposit.id,
      amount: deposit.amount,
      payment_method: deposit.payment_method,
      transaction_id: deposit.transaction_id,
      note: deposit.note,
    });
    setSelectedDeposit(deposit);
    setModel(true);
  };

  // Handle form submit
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (depositForm.data.id) {
      // Update existing deposit
      depositForm.put(route("deposits.update", depositForm.data.id), {
        onSuccess: () => {
          depositForm.reset();
          setModel(false);
          setSelectedDeposit(null);
        },
        onError: (errors) => {
          console.error("Update error:", errors);
        }
      });
    } else {
      // Create new deposit - note: created_by and outlet_id are set in controller
      depositForm.post(route("deposits.store"), {
        onSuccess: () => {
          depositForm.reset();
          setModel(false);
        },
        onError: (errors) => {
          console.error("Create error:", errors);
        }
      });
    }
  };

  // Close modal
  const closeModal = () => {
    depositForm.reset();
    setSelectedDeposit(null);
    setModel(false);
  };

  // Check if route exists
  const checkRouteExists = (routeName, params) => {
    try {
      const routePath = route(routeName, params);
      return routePath;
    } catch (error) {
      console.error(`Route ${routeName} does not exist:`, error);
      return null;
    }
  };

    const handleApproveDeposit = (deposit) => {
        console.log('hello');
        router.post(
            route('deposits.approve', deposit.id),
            { onSuccess: () => router.reload({ only: ['deposits'] }) }
        );
    };


  // Reject deposit
//   const handleRejectDeposit = (deposit) => {
//     const routePath = checkRouteExists("deposits.reject", deposit.id);
    
//     if (!routePath) {
//       alert('Route does not exist. Please check your routes.');
//       console.error('Route deposits.reject not found');
//       return;
//     }

//     if (confirm(t('user_deposit.reject_confirmation', 'Are you sure you want to reject this deposit?'))) {
//       router.post(routePath, { 
//         status: 'failed'
//       }, {
//         preserveScroll: true,
//         preserveState: true,
//         onSuccess: () => {
//           router.reload({ 
//             only: ['deposits'],
//             preserveScroll: true
//           });
//         },
//         onError: (errors) => {
//           console.error('Rejection error:', errors);
//           alert('Failed to reject deposit: ' + (errors.message || 'Unknown error'));
//         }
//       });
//     }
//   };

  // Delete deposit
  const handleDeleteDeposit = (deposit) => {
    if (confirm(t('user_deposit.delete_confirmation', 'Are you sure you want to delete this deposit?'))) {
      router.delete(route("deposits.destroy", deposit.id), {
        preserveScroll: true,
        preserveState: true,
        onSuccess: () => {
          router.reload({ 
            only: ['deposits'],
            preserveScroll: true
          });
        },
        onError: (errors) => {
          console.error('Delete error:', errors);
          alert('Failed to delete deposit');
        }
      });
    }
  };

  // Get total stats
  const getStats = () => {
    const total = deposits?.length || 0;
    const totalAmount = deposits?.reduce((sum, deposit) => sum + parseFloat(deposit.amount || 0), 0) || 0;
    const pendingCount = deposits?.filter(d => d.status == 'pending').length || 0;
    const completedCount = deposits?.filter(d => d.status == 'approved').length || 0;
    
    return { total, totalAmount, pendingCount, completedCount };
  };

  const stats = getStats();

  // Safe error check function
  const getError = (field) => {
    return depositForm.errors?.[field] || null;
  };

  return (
    <div className={`bg-white rounded-box p-5 ${locale === 'bn' ? 'bangla-font' : ''}`}>
      {/* Page Header */}
      <PageHeader
        title={t('user_deposit.title', 'User Deposits Management')}
        subtitle={t('user_deposit.subtitle', 'Manage all user deposit requests from here')}
      >
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="search"
              value={localFilters.search}
              onChange={(e) => handleFilter('search', e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={t('user_deposit.search_placeholder', 'Search by user name, transaction ID...')}
              className="h-8 pl-8 pr-3 text-xs font-semibold border border-gray-300 rounded-md focus:outline-none focus:border-gray-500"
            />
          </div>

          {/* Status Filter */}
          <select
            value={localFilters.status}
            onChange={(e) => handleFilter('status', e.target.value)}
            className="h-8 px-3 text-xs font-semibold border border-gray-300 rounded-md focus:outline-none focus:border-gray-500"
          >
            <option value="">{t('user_deposit.all_status', 'All Status')}</option>
            {STATUS_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Payment Method Filter */}
          <select
            value={localFilters.payment_method}
            onChange={(e) => handleFilter('payment_method', e.target.value)}
            className="h-8 px-3 text-xs font-semibold border border-gray-300 rounded-md focus:outline-none focus:border-gray-500"
          >
            <option value="">{t('user_deposit.all_payment_methods', 'All Payment Methods')}</option>
            {PAYMENT_METHODS.map(method => (
              <option key={method.value} value={method.value}>
                {method.label}
              </option>
            ))}
          </select>

          {/* Clear Filter */}
          {(localFilters.search || localFilters.status || localFilters.payment_method) && (
            <button
              onClick={clearFilters}
              className="h-8 px-3 text-xs font-semibold text-gray-600 hover:text-black"
            >
              {t('user_deposit.clear', 'Clear')}
            </button>
          )}

          {/* Add New Button */}
          <button
            onClick={handleCreateDeposit}
            className="h-8 px-3 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest bg-[#1e4d2b] text-white rounded-md hover:bg-black"
          >
            <Plus size={14} />
            {t('user_deposit.add_deposit', 'Add Deposit')}
          </button>
        </div>
      </PageHeader>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#1e4d2b] text-white rounded-xl p-4">
          <p className="text-xs uppercase tracking-widest font-bold text-gray-300 mb-2">
            {t('user_deposit.total_deposits', 'Total Deposits')}
          </p>
          <div className="flex items-center justify-between">
            <p className="text-2xl font-black">{stats.total}</p>
            <DollarSign size={20} className="text-gray-400" />
          </div>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-xs uppercase tracking-widest font-bold text-blue-700 mb-2">
            {t('user_deposit.total_amount', 'Total Amount')}
          </p>
          <div className="flex items-center justify-between">
            <p className="text-2xl font-black text-blue-700">
              ৳{formatCurrency(stats.totalAmount)}
            </p>
            <TrendingUp size={20} className="text-blue-500" />
          </div>
        </div>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <p className="text-xs uppercase tracking-widest font-bold text-yellow-700 mb-2">
            {t('user_deposit.pending', 'Pending')}
          </p>
          <div className="flex items-center justify-between">
            <p className="text-2xl font-black text-yellow-700">
              {stats.pendingCount}
            </p>
            <Clock size={20} className="text-yellow-500" />
          </div>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-xs uppercase tracking-widest font-bold text-green-700 mb-2">
            {t('user_deposit.completed', 'Completed')}
          </p>
          <div className="flex items-center justify-between">
            <p className="text-2xl font-black text-green-700">
              {stats.completedCount}
            </p>
            <CheckCircle size={20} className="text-green-500" />
          </div>
        </div>
      </div>

      {/* Deposits Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-100">
        {deposits && deposits.length > 0 ? (
          <table className="table w-full">
            <thead className="bg-[#1e4d2b] text-white uppercase text-[10px] tracking-widest">
              <tr>
                <th className="py-4">#</th>
                <th>{t('user_deposit.user_info', 'User Info')}</th>
                <th>{t('user_deposit.transaction_details', 'Transaction Details')}</th>
                <th>{t('user_deposit.payment_info', 'Payment Info')}</th>
                <th>{t('user_deposit.status', 'Status')}</th>
                <th className="text-right">{t('user_deposit.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="font-bold text-sm text-gray-700">
              {deposits.map((deposit, index) => (
                <tr key={deposit.id} className="hover:bg-gray-50 border-b border-gray-50 transition-colors">
                  <td className="text-gray-400 font-mono text-xs">{index + 1}</td>
                  
                  <td>
                    <div className="flex flex-col gap-1">
                      <p className="font-black text-gray-900 uppercase tracking-tighter leading-none mb-1">
                        {deposit.user?.name || t('user_deposit.na', 'N/A')}
                      </p>
                      <span className="text-[10px] flex items-center gap-1 text-gray-400 font-black uppercase tracking-widest">
                        <User size={10} /> {deposit.user?.id || 'N/A'}
                      </span>
                      {deposit.outlet && (
                        <span className="text-[10px] flex items-center gap-1 text-blue-500 font-black uppercase tracking-widest mt-1">
                          <Store size={10} /> {deposit.outlet.name}
                        </span>
                      )}
                    </div>
                  </td>
                  
                  <td>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">{t('user_deposit.amount', 'Amount')}:</span>
                        <span className="font-mono text-sm font-black text-gray-900">
                          ৳{formatCurrency(deposit.amount)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">{t('user_deposit.transaction_id', 'Transaction ID')}:</span>
                        <span className="font-mono text-xs font-bold text-gray-700">
                          {deposit.transaction_id || t('user_deposit.na', 'N/A')}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        <Calendar size={10} className="inline mr-1" />
                        {formatDate(deposit.created_at)}
                      </div>
                    </div>
                  </td>
                  
                  <td>
                    <div className="flex flex-col gap-2">
                      {getPaymentMethodBadge(deposit.payment_method)}
                      {deposit.note && (
                        <div className="text-xs text-gray-600 mt-1">
                          <span className="font-bold">{t('user_deposit.note', 'Note')}:</span> 
                          <span className="ml-1 line-clamp-2">{deposit.note}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  
                  <td>
                    <div className="flex flex-col gap-2">
                      {getStatusBadge(deposit.status)}
                      <div className="text-xs text-gray-500">
                        {deposit.user && (
                          <span className="flex items-center gap-1">
                            <UserCheck size={10} />
                            {t('user_deposit.created_by', 'Created by')}: {deposit.user.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  
                  <td className="text-right">
                    <div className="flex justify-end gap-1">
                      {/* Edit button - only for same outlet */}
                      {auth.user.outlet_id === deposit.outlet_id && deposit.status === 'pending' && (
                        <button
                          onClick={() => handleEditDeposit(deposit)}
                          className="btn btn-ghost btn-square btn-xs hover:bg-amber-600 hover:text-white text-amber-600"
                          title={t('user_deposit.edit', 'Edit')}
                        >
                          <Edit size={16} />
                        </button>
                      )}

                      {/* Delete button - only for same outlet and pending */}
                      {auth.user.outlet_id === deposit.outlet_id && deposit.status === 'pending' && (
                        <button
                          onClick={() => handleDeleteDeposit(deposit)}
                          className="btn btn-ghost btn-square btn-xs hover:bg-red-600 hover:text-white text-red-600"
                          title={t('user_deposit.delete', 'Delete')}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}

                      {/* Approve button - only for pending deposits */}
                      {deposit.status == 'pending' &&  userRole == 'superadmin' && (
                        <button
                          onClick={() => handleApproveDeposit(deposit)}
                          className="btn btn-ghost btn-square btn-xs hover:bg-green-600 hover:text-white text-green-600"
                          title={t('user_deposit.approve', 'Approve')}
                        >
                          <CheckCircle size={16} />
                        </button>
                       )} 


                      <button
                        onClick={() => setSelectedDeposit(deposit)}
                        className="btn btn-ghost btn-square btn-xs hover:bg-blue-600 hover:text-white text-blue-600"
                        title="View Details"
                      >
                        <Eye size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="py-20 text-center text-gray-400 flex flex-col items-center gap-3">
            <Frown size={40} className="text-gray-200" />
            <span className="font-black uppercase tracking-widest text-xs">
              {localFilters.search
                ? t('user_deposit.no_deposits_matching', 'No deposits matching ":search"', { search: localFilters.search })
                : t('user_deposit.no_deposits_found', 'No deposits found')
              }
            </span>
            <button
              onClick={handleCreateDeposit}
              className="h-8 px-3 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest bg-[#1e4d2b] text-white rounded-md hover:bg-black mt-2"
            >
              <Plus size={14} />
              {t('user_deposit.add_first_deposit', 'Add Your First Deposit')}
            </button>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <dialog className={`modal ${model ? 'modal-open' : ''}`}>
        <div className="modal-box max-w-2xl p-0 overflow-hidden">
          {/* Modal Header */}
          <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#1e4d2b] text-white rounded-lg">
                  <DollarSign size={20} className="text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-black text-gray-900">
                    {depositForm.data.id 
                      ? t('user_deposit.edit_deposit', 'Edit Deposit') 
                      : t('user_deposit.new_deposit', 'New Deposit Request')
                    }
                  </h1>
                  <p className="text-sm text-gray-500">
                    {depositForm.data.id
                      ? t('user_deposit.update_deposit_info', 'Update deposit information')
                      : t('user_deposit.create_new_deposit', 'Create a new deposit request')
                    }
                  </p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="btn btn-ghost btn-circle btn-sm hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
            <form onSubmit={handleSubmit}>
              {/* Deposit Information Section */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-1.5 bg-blue-100 rounded">
                    <Receipt size={14} className="text-blue-600" />
                  </div>
                  <h3 className="font-bold text-gray-900">
                    {t('user_deposit.deposit_information', 'Deposit Information')}
                  </h3>
                  <div className="flex-1 h-px bg-gray-200"></div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Amount */}
                  <div className="form-control">
                    <label className="label py-0 mb-2">
                      <span className="label-text font-bold text-gray-700 text-sm">
                        {t('user_deposit.amount', 'Amount')} <span className="text-red-500">*</span>
                      </span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-bold">৳</span>
                      <input
                        type="number"
                        
                        min="0.01"
                        value={depositForm.data.amount}
                        onChange={(e) => depositForm.setData("amount", e.target.value)}
                        className="input input-bordered w-full pl-4 py-3 border-gray-300 focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                        placeholder="0.00"
                        required
                      />
                    </div>
                    {getError('amount') && (
                      <div className="text-red-600 text-xs mt-2 flex items-center gap-2 bg-red-50 p-2 rounded">
                        <AlertCircle size={12} />
                        {getError('amount')}
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment Method */}
                <div className="form-control mt-5">
                  <label className="label py-0 mb-2">
                    <span className="label-text font-bold text-gray-700 text-sm">
                      {t('user_deposit.payment_method', 'Payment Method')} <span className="text-red-500">*</span>
                    </span>
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {PAYMENT_METHODS.map(method => {
                      const Icon = method.icon;
                      const isSelected = depositForm.data.payment_method === method.value;
                      return (
                        <label
                          key={method.value}
                          className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            isSelected
                              ? 'border-[#1e4d2b] bg-green-50'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="payment_method"
                            value={method.value}
                            checked={isSelected}
                            onChange={(e) => depositForm.setData("payment_method", e.target.value)}
                            className="hidden"
                          />
                          <Icon size={24} className={isSelected ? 'text-[#1e4d2b]' : 'text-gray-500'} />
                          <span className={`mt-2 text-xs font-bold ${isSelected ? 'text-[#1e4d2b]' : 'text-gray-700'}`}>
                            {method.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  {getError('payment_method') && (
                    <div className="text-red-600 text-xs mt-2 flex items-center gap-2 bg-red-50 p-2 rounded">
                      <AlertCircle size={12} />
                      {getError('payment_method')}
                    </div>
                  )}
                </div>

                {/* Transaction ID */}
                <div className="form-control mt-5">
                  <label className="label py-0 mb-2">
                    <span className="label-text font-bold text-gray-700 text-sm">
                      {t('user_deposit.transaction_id', 'Transaction ID/Reference')} <span className="text-red-500">*</span>
                    </span>
                  </label>
                  <div className="relative">
                    <CreditCard size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={depositForm.data.transaction_id}
                      onChange={(e) => depositForm.setData("transaction_id", e.target.value)}
                      className="input input-bordered w-full pl-4 py-3 border-gray-300 focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                      placeholder={t('user_deposit.enter_transaction_id', 'Enter transaction ID or reference number')}
                      required
                    />
                  </div>
                  {getError('transaction_id') && (
                    <div className="text-red-600 text-xs mt-2 flex items-center gap-2 bg-red-50 p-2 rounded">
                      <AlertCircle size={12} />
                      {getError('transaction_id')}
                    </div>
                  )}
                </div>

                {/* Note */}
                <div className="form-control mt-5">
                  <label className="label py-0 mb-2">
                    <span className="label-text font-bold text-gray-700 text-sm">
                      {t('user_deposit.note', 'Note')} ({t('user_deposit.optional', 'Optional')})
                    </span>
                  </label>
                  <textarea
                    value={depositForm.data.note}
                    onChange={(e) => depositForm.setData("note", e.target.value)}
                    className="textarea textarea-bordered w-full py-3 border-gray-300 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 min-h-[80px]"
                    rows="3"
                    placeholder={t('user_deposit.enter_note', 'Enter any additional notes...')}
                  />
                </div>

                {/* Status (only for edit) */}
                {depositForm.data.id && (
                  <div className="form-control mt-5">
                    <label className="label py-0 mb-2">
                      <span className="label-text font-bold text-gray-700 text-sm">
                        {t('user_deposit.status', 'Status')}
                      </span>
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {STATUS_OPTIONS.map(status => {
                        const isSelected = depositForm.data.status === status.value;
                        return (
                          <label
                            key={status.value}
                            className={`flex items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                              isSelected
                                ? `${status.color.replace('100', '200').replace('800', '900')} border-current`
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            <input
                              type="radio"
                              name="status"
                              value={status.value}
                              checked={isSelected}
                              onChange={(e) => depositForm.setData("status", e.target.value)}
                              className="hidden"
                            />
                            <span className={`text-sm font-bold ${isSelected ? 'text-current' : 'text-gray-700'}`}>
                              {status.label}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="sticky bottom-0 bg-white border-t border-gray-200 -mx-6 px-6 py-4 mt-8">
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="btn btn-ghost flex-1 hover:bg-gray-100"
                    disabled={depositForm.processing}
                  >
                    {t('user_deposit.cancel', 'Cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={depositForm.processing}
                    className="btn bg-[#1e4d2b] text-white flex-1 hover:bg-gray-800"
                  >
                    {depositForm.processing ? (
                      <>
                        <span className="loading loading-spinner loading-sm"></span>
                        {t('user_deposit.processing', 'Processing...')}
                      </>
                    ) : depositForm.data.id ? (
                      <>
                        <CheckCircle size={18} />
                        {t('user_deposit.update_deposit', 'Update Deposit')}
                      </>
                    ) : (
                      <>
                        <Plus size={18} />
                        {t('user_deposit.create_deposit', 'Create Deposit')}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </dialog>

      {/* Details View Modal */}
      <dialog className={`modal ${selectedDeposit && !model ? 'modal-open' : ''}`}>
        <div className="modal-box max-w-3xl p-0 overflow-hidden">
          {selectedDeposit && (
            <>
              {/* Modal Header */}
              <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600 text-white rounded-lg">
                      <Eye size={20} className="text-white" />
                    </div>
                    <div>
                      <h1 className="text-xl font-black text-gray-900">
                        Deposit Details
                      </h1>
                      <p className="text-sm text-gray-500">
                        Transaction ID: {selectedDeposit.transaction_id || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedDeposit(null)}
                    className="btn btn-ghost btn-circle btn-sm hover:bg-gray-100"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-6">
                    {/* User Information */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <User size={16} /> User Information
                      </h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Name:</span>
                          <span className="font-bold">{selectedDeposit.user?.name || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">User ID:</span>
                          <span className="font-mono">{selectedDeposit.user?.id || 'N/A'}</span>
                        </div>
                        {selectedDeposit.user?.email && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Email:</span>
                            <span className="font-medium">{selectedDeposit.user.email}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Transaction Details */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <Receipt size={16} /> Transaction Details
                      </h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Amount:</span>
                          <span className="font-mono font-black text-lg">৳{formatCurrency(selectedDeposit.amount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Transaction ID:</span>
                          <span className="font-mono font-bold">{selectedDeposit.transaction_id || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Payment Method:</span>
                          {getPaymentMethodBadge(selectedDeposit.payment_method)}
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Status:</span>
                          {getStatusBadge(selectedDeposit.status)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-6">
                    {/* Outlet Information */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <Store size={16} /> Outlet Information
                      </h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Outlet:</span>
                          <span className="font-bold">{selectedDeposit.outlet?.name || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Created By:</span>
                          <span className="font-medium">{selectedDeposit.user?.name || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Created At:</span>
                          <span className="font-medium">{formatDate(selectedDeposit.created_at)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Updated At:</span>
                          <span className="font-medium">{formatDate(selectedDeposit.updated_at)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Notes */}
                    {selectedDeposit.note && (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                          <FileText size={16} /> Notes
                        </h3>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                          {selectedDeposit.note}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedDeposit(null)}
                      className="btn btn-ghost hover:bg-gray-100"
                    >
                      Close
                    </button>
                    {selectedDeposit.status === 'pending' &&  userRole == 'superadmin' && (
                      <>
                        <button
                          onClick={() => {
                            setSelectedDeposit(null);
                            handleApproveDeposit(selectedDeposit);
                          }}
                          className="btn bg-green-600 text-white hover:bg-green-700"
                        >
                          <CheckCircle size={18} />
                          {t('user_deposit.approve', 'Approve')}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedDeposit(null);
                            handleRejectDeposit(selectedDeposit);
                          }}
                          className="btn bg-red-600 text-white hover:bg-red-700"
                        >
                          <X size={18} />
                          {t('user_deposit.reject', 'Reject')}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </dialog>
    </div>
  );
}