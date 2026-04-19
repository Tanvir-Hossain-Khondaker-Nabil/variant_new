import { useForm, router } from "@inertiajs/react";
import {
    ArrowLeft,
    Save,
    Tag,
    DollarSign,
    Calendar,
    FileText,
    CheckCircle,
    Plus,
    Trash2,
    Star,
    Grid,
    ChevronDown,
    LayoutGrid,
    List
} from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";
import { useState, useEffect } from "react";

export default function Create({ modules }) {
    const { t, locale } = useTranslation();
    const { data, setData, post, processing, errors, reset } = useForm({
        name: "",
        price: "",
        plan_type: "",
        validity: "",
        description: "",
        modules: [],
        product_range: 0,
        outlet_range: 2,
    });

    const [selectedModuleId, setSelectedModuleId] = useState("");
    const [allModules, setAllModules] = useState([]);
    const [activeTab, setActiveTab] = useState("dropdown"); 

    const gradient = "linear-gradient(rgb(15, 45, 26) 0%, rgb(30, 77, 43) 100%)";

    // Update all modules with selected status
    useEffect(() => {
        const updatedModules = modules.map(module => ({
            ...module,
            isSelected: data.modules.includes(module.id)
        }));
        setAllModules(updatedModules);
    }, [data.modules, modules]);

    const handleSubmit = (e) => {
        e.preventDefault();

        post(route("plans.store"), {
            data: data,
            onSuccess: () => reset(),
        });
    };

    // Handle module selection via card click (toggle)
    const handleCardModuleSelect = (moduleId) => {
        const updatedModules = data.modules.includes(moduleId)
            ? data.modules.filter(id => id !== moduleId)
            : [...data.modules, moduleId];

        setData("modules", updatedModules);
    };

    // Handle module selection via dropdown and add button
    const handleAddModule = () => {
        if (selectedModuleId && !data.modules.includes(selectedModuleId)) {
            const updatedModules = [...data.modules, selectedModuleId];
            setData("modules", updatedModules);
            setSelectedModuleId(""); // Reset dropdown after adding
        }
    };

    // Remove module from selected list
    const removeModule = (moduleId) => {
        const updatedModules = data.modules.filter(id => id !== moduleId);
        setData("modules", updatedModules);
    };

    return (
        <div className={`min-h-screen bg-slate-50 p-4 sm:p-8 ${locale === 'bn' ? 'bangla-font' : ''}`}>
            <div className="max-w-5xl mx-auto">
               

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Information Card */}
                    <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-200">
                        <div className="px-6 py-4 text-white" style={{ background: gradient }}>
                            <div className="flex items-center gap-3">
                                <Tag className="text-white" size={22} />
                                <h2 className="text-xl font-bold">
                                    {t('plan.basic_information', 'Basic Information')}
                                </h2>
                            </div>
                        </div>

                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                    <Tag size={16} className="text-emerald-700" />
                                    {t('plan.plan_name', 'Plan Name')} *
                                </label>
                                <input
                                    type="text"
                                    value={data.name}
                                    onChange={(e) => setData("name", e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-4 focus:ring-emerald-200/60 focus:border-emerald-700 transition-all bg-white"
                                    placeholder={t('plan.enter_plan_name', 'Enter plan name')}
                                />
                                {errors.name && (
                                    <p className="text-red-600 text-sm mt-2">{errors.name}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    {t('plan.plan_type', 'Plan Type')} *
                                </label>
                                <select
                                    value={data.plan_type}
                                    onChange={(e) => setData("plan_type", e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-4 focus:ring-emerald-200/60 focus:border-emerald-700 transition-all bg-white"
                                >
                                    <option value="">{t('plan.select_plan_type', 'Select Plan Type')}</option>
                                    <option value="1">{t('plan.free', 'Free')}</option>
                                    <option value="2">{t('plan.premium', 'Premium')}</option>
                                </select>
                                {errors.plan_type && (
                                    <p className="text-red-600 text-sm mt-2">{errors.plan_type}</p>
                                )}
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-200 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                {/* PRICE */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                        <DollarSign size={16} className="text-emerald-700" />
                                        {t('plan.price', 'Price')} ({t('plan.currency', '৳')}) *
                                    </label>
                                    <input
                                        type="number"
                                        value={data.price}
                                        onChange={(e) => setData("price", e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-4 focus:ring-emerald-200/60 focus:border-emerald-700 transition-all bg-white"
                                        placeholder={t('plan.enter_price', '0.00')}
                                        
                                        min="0"
                                    />
                                    {errors.price && (
                                        <p className="text-red-600 text-sm mt-2">{errors.price}</p>
                                    )}
                                </div>

                                {/* Outlet RANGE */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        {t('plan.outlet_range', 'Outlet Range')} *
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={data.outlet_range}
                                        onChange={(e) => setData("outlet_range", e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-4 focus:ring-emerald-200/60 focus:border-emerald-700 transition-all bg-white"
                                        placeholder={t('plan.enter_outlet_range', 'Enter outlet range...')}
                                    />
                                    {errors.outlet_range && (
                                        <p className="text-red-600 text-sm mt-2">{errors.outlet_range}</p>
                                    )}
                                </div>

                                {/* PRODUCT RANGE */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        {t('plan.product_range', 'Product Range')} *
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={data.product_range}
                                        onChange={(e) => setData("product_range", e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-4 focus:ring-emerald-200/60 focus:border-emerald-700 transition-all bg-white"
                                        placeholder={t('plan.enter_product_range', 'Enter product range...')}
                                    />
                                    {errors.product_range && (
                                        <p className="text-red-600 text-sm mt-2">{errors.product_range}</p>
                                    )}
                                </div>

                                {/* VALIDITY */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                        <Calendar size={16} className="text-emerald-700" />
                                        {t('plan.validity', 'Validity')} ({t('plan.validity_days', 'Days')}) *
                                    </label>
                                    <input
                                        type="number"
                                        value={data.validity}
                                        onChange={(e) => setData("validity", e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-4 focus:ring-emerald-200/60 focus:border-emerald-700 transition-all bg-white"
                                        placeholder={t('plan.enter_validity', '30')}
                                        min="1"
                                    />
                                    {errors.validity && (
                                        <p className="text-red-600 text-sm mt-2">{errors.validity}</p>
                                    )}
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                    <FileText size={16} className="text-gray-600" />
                                    {t('plan.description', 'Description')}
                                </label>
                                <textarea
                                    value={data.description}
                                    onChange={(e) => setData("description", e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-4 focus:ring-emerald-200/60 focus:border-emerald-700 transition-all bg-white resize-none"
                                    rows={3}
                                    placeholder={t('plan.enter_description', 'Describe the plan features and benefits...')}
                                />
                                {errors.description && (
                                    <p className="text-red-600 text-sm mt-2">⚠️ {errors.description}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Modules Card */}
                    <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-200">
                        <div className="px-6 py-4 text-white" style={{ background: gradient }}>
                            <div className="flex items-center justify-between gap-4 flex-col sm:flex-row">
                                <div className="flex items-center gap-3">
                                    <Grid className="text-white" size={22} />
                                    <h2 className="text-xl font-bold">
                                        {t('plan.select_modules', 'Select Modules')}
                                    </h2>
                                </div>
                                <div className="text-white/90 font-semibold">
                                    {t('plan.selected_count', 'Selected')}: {data.modules.length} {t('plan.of', 'of')} {modules.length}
                                </div>
                            </div>
                        </div>

                        <div className="p-6">
                            {/* Selection Method Tabs */}
                            <div className="flex gap-2 mb-8">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab("dropdown")}
                                    className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex-1 ring-1
                                        ${activeTab === "dropdown"
                                            ? 'text-white shadow-sm ring-emerald-900/10'
                                            : 'bg-gray-50 text-gray-700 hover:bg-gray-100 ring-gray-200'
                                        }`}
                                    style={activeTab === "dropdown" ? { background: gradient } : undefined}
                                >
                                    <List size={18} />
                                    {t('plan.dropdown_method', 'Dropdown Method')}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setActiveTab("cards")}
                                    className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex-1 ring-1
                                        ${activeTab === "cards"
                                            ? 'text-white shadow-sm ring-emerald-900/10'
                                            : 'bg-gray-50 text-gray-700 hover:bg-gray-100 ring-gray-200'
                                        }`}
                                    style={activeTab === "cards" ? { background: gradient } : undefined}
                                >
                                    <LayoutGrid size={18} />
                                    {t('plan.card_method', 'Card Method')}
                                </button>
                            </div>

                            {/* Dropdown Method */}
                            {activeTab === "dropdown" && (
                                <div className="mb-8">
                                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                        <ChevronDown size={18} className="text-emerald-700" />
                                        {t('plan.add_with_dropdown', 'Add Modules via Dropdown')}
                                    </h3>

                                    <div className="flex flex-col md:flex-row gap-4">
                                        <div className="flex-1 relative">
                                            <select
                                                value={selectedModuleId}
                                                onChange={(e) => setSelectedModuleId(e.target.value)}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-4 focus:ring-emerald-200/60 focus:border-emerald-700 transition-all bg-white appearance-none"
                                            >
                                                <option value="">{t('plan.select_module', 'Select a module to add...')}</option>
                                                {allModules.map((module) => (
                                                    <option
                                                        key={module.id}
                                                        value={module.id}
                                                        style={module.isSelected ? {
                                                            backgroundColor: '#ecfdf5',
                                                            color: '#065f46',
                                                            fontWeight: '600'
                                                        } : {}}
                                                    >
                                                        {module.name} {module.isSelected ? "✓" : ""}
                                                    </option>
                                                ))}
                                            </select>
                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-600">
                                                <ChevronDown size={18} />
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={handleAddModule}
                                            disabled={!selectedModuleId || data.modules.includes(selectedModuleId)}
                                            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-200
                                                ${selectedModuleId && !data.modules.includes(selectedModuleId)
                                                    ? 'text-white shadow-sm hover:shadow-md'
                                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                }`}
                                            style={(selectedModuleId && !data.modules.includes(selectedModuleId)) ? { background: gradient } : undefined}
                                        >
                                            <Plus size={18} />
                                            {t('plan.add_module', 'Add Module')}
                                        </button>
                                    </div>

                                    <div className="mt-4 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                                        <div className="flex items-center gap-2 mb-2">
                                            <CheckCircle size={16} className="text-emerald-700" />
                                            <span className="text-sm font-semibold text-emerald-900">
                                                {t('plan.selected_modules_in_dropdown', 'Modules with ✓ are already selected')}
                                            </span>
                                        </div>
                                        <p className="text-sm text-emerald-900/80">
                                            {t('plan.dropdown_selected_instruction', 'You can only add modules that are not already selected (no ✓ symbol). To remove a selected module, use the "Selected Modules" section below.')}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Card Method */}
                            {activeTab === "cards" && (
                                <div className="mb-8">
                                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                        <LayoutGrid size={18} className="text-emerald-700" />
                                        {t('plan.select_from_cards', 'Select Modules from Cards')}
                                    </h3>

                                    {allModules.length === 0 ? (
                                        <div className="text-center py-10 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300">
                                            <Grid size={48} className="text-gray-300 mx-auto mb-3" />
                                            <p className="text-gray-500">{t('plan.no_modules_available', 'No modules available')}</p>
                                            <p className="text-sm text-gray-400 mt-1">{t('plan.contact_admin', 'Contact administrator to add modules')}</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {allModules.map((module) => (
                                                    <div
                                                        key={module.id}
                                                        className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer
                                                            ${module.isSelected
                                                                ? 'bg-emerald-50 border-emerald-300 shadow-sm'
                                                                : 'bg-white border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/30'
                                                            }`}
                                                        onClick={() => handleCardModuleSelect(module.id)}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div
                                                                className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm"
                                                                style={module.isSelected ? { background: gradient } : { background: "#e5e7eb", color: "#374151" }}
                                                            >
                                                                <Grid size={18} className={module.isSelected ? "text-white" : "text-gray-700"} />
                                                            </div>

                                                            <div className="flex-1 min-w-0">
                                                                <h3 className="font-bold text-gray-900 truncate">
                                                                    {module.name} {module.isSelected && "✓"}
                                                                </h3>
                                                                {module.description && (
                                                                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{module.description}</p>
                                                                )}
                                                            </div>

                                                            <div className={`w-6 h-6 rounded-full border flex items-center justify-center
                                                                ${module.isSelected ? 'border-emerald-600 bg-emerald-600' : 'border-gray-300 bg-white'}`}
                                                            >
                                                                {module.isSelected ? (
                                                                    <CheckCircle size={14} className="text-white" />
                                                                ) : (
                                                                    <Plus size={12} className="text-gray-500" />
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-gray-200">
                                                <p className="text-sm text-gray-700">
                                                    {t('plan.card_selected_instruction', 'Green cards with checkmarks (✓) are already selected. Click on them to deselect.')}
                                                </p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Selected Modules Display (Always visible) */}
                            <div className="mb-8">
                                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <CheckCircle size={18} className="text-emerald-700" />
                                    {t('plan.selected_modules', 'Selected Modules')} ({data.modules.length})
                                </h3>

                                {data.modules.length == 0 ? (
                                    <div className="text-center py-8 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300">
                                        <Grid size={32} className="text-gray-300 mx-auto mb-2" />
                                        <p className="text-gray-600">{t('plan.no_modules_selected', 'No modules selected yet')}</p>
                                        <p className="text-sm text-gray-400 mt-1">
                                            {activeTab === "dropdown"
                                                ? t('plan.use_dropdown_to_add', 'Use the dropdown above to add modules')
                                                : t('plan.use_cards_to_add', 'Use the cards above to add modules')
                                            }
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {data.modules.map((moduleId) => {
                                            const module = modules.find(m => m.id === moduleId);
                                            return module ? (
                                                <div key={module.id} className="flex items-center justify-between p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-white border border-emerald-200 flex items-center justify-center">
                                                            <Grid size={18} className="text-emerald-700" />
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-gray-900">{module.name} ✓</h4>
                                                            {module.description && (
                                                                <p className="text-sm text-gray-600">{module.description}</p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => removeModule(module.id)}
                                                        className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-all duration-200 hover:scale-105"
                                                        title={t('plan.remove_module', 'Remove module')}
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            ) : null;
                                        })}
                                    </div>
                                )}
                            </div>

                            {errors.modules && (
                                <p className="text-red-600 text-sm mt-4">⚠️ {errors.modules}</p>
                            )}

                            {/* Modules Guidelines */}
                            <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-200">
                                <h4 className="font-bold text-emerald-900 mb-2 flex items-center gap-2">
                                    <CheckCircle size={18} className="text-emerald-700" />
                                    {t('plan.modules_guidelines', 'Modules Guidelines')}
                                </h4>
                                <ul className="text-sm text-emerald-900/80 space-y-1">
                                    <li>• {t('plan.guideline_tab', 'Switch between tabs to use different selection methods')}</li>
                                    <li>• {t('plan.guideline_dropdown_tab', 'Dropdown Tab: Only unselected modules can be added')}</li>
                                    <li>• {t('plan.guideline_cards_tab', 'Cards Tab: Click to toggle selection (green = selected)')}</li>
                                    <li>• {t('plan.guideline_remove', 'Remove selected modules using trash icon below')}</li>
                                    <li>• {t('plan.guideline_multiple', 'You can select multiple modules for each plan')}</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="flex justify-end">
                        <button
                            disabled={processing}
                            className={`group flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-white transition-all duration-200
                                ${processing ? 'bg-gray-400 cursor-not-allowed' : 'shadow-sm hover:shadow-md hover:scale-[1.01] active:scale-[0.99]'}`}
                            style={!processing ? { background: gradient } : undefined}
                        >
                            <Save size={20} className={processing ? 'animate-pulse' : 'group-hover:animate-bounce'} />
                            {processing ? t('plan.creating_plan', 'Creating Plan...') : t('plan.create_plan', 'Create Plan')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
