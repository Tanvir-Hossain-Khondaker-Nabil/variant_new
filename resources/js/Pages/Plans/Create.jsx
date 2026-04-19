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

                                {data.plan_type == '2' && (
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
                                            required={data.plan_type == '2'}
                                        />
                                        {errors.price && (
                                            <p className="text-red-600 text-sm mt-2">{errors.price}</p>
                                        )}
                                    </div>
                                )}

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
