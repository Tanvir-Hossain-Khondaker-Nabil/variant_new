import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link, usePage } from "@inertiajs/react";
import {
  X,
  LayoutDashboard,
  LogOut,
  User,
  Settings,
  Home,
  ShoppingCart,
  Package,
  Users,
  BarChart3,
  CreditCard,
  Building,
  FileText,
  Calendar,
  DollarSign,
  Award,
  Shield,
  Bell,
  HelpCircle,
  Search,
  Menu,
  ArrowRightLeft,
  BadgeCent,
  BaggageClaim,
  BanknoteArrowUp,
  Barcode,
  Box,
  ShoppingBag,
  ShoppingBasket,
  UserPlus,
  WalletMinimal,
  Warehouse,
  Receipt,
  Trophy,
  TrendingUp,
  Gift,
  Star,
  BadgeDollarSign,
  Clock,
  Plane,
  BoxIcon,
  TagIcon,
  Store,
  AlertCircle,
  CheckCircle,
  Eye,
  LogIn,
  Globe,
  Headphones,
  Palette,
  Image as ImageIcon,
  FileImage,
  BellRing,
  ListChecks,
  MessageCircle 
} from "lucide-react";
import { useTranslation } from "../hooks/useTranslation";

/** ---------------------------
 * ✅ MENUS
 * --------------------------- */

// Overview base menu (outlet login নাই)
const outletOverviewMenuBase = [
  {
    title: "Dashboard",
    icon: "home",
    route: "home",
    active: "home",
    category: "Main",
    permission: "dashboard.view",
  },
  {
    title: "Outlet Management",
    icon: "store",
    route: "outlets.index",
    routeParams: null,
    active: "outlets.index",
    category: "Outlets",
    permission: "outlets.view",
  },
];

// Overview Investments (Owner/Admin)
const investmentsOverviewMenu = [
  { title: "Investors", icon: "users", route: "investors.index", active: "investors.index", category: "Investments", permission: "investors.view" },
  { title: "Add Investor", icon: "user-plus", route: "investors.create", active: "investors.create", category: "Investments", permission: "investors.create" },

  { title: "Investments", icon: "wallet-minimal", route: "investments.index", active: "investments.index", category: "Investments", permission: "investments.view" },
  { title: "Add Investment", icon: "wallet-minimal", route: "investments.create", active: "investments.create", category: "Investments", permission: "investments.create" },
  { title: "Investment Returns", icon: "dollar-sign", route: "investmentReturns.index", active: "investmentReturns.index", category: "Investments", permission: "investments.returns.view" },

  { title: "Borrowers", icon: "users", route: "borrowers.index", active: "borrowers.index", category: "Investments", permission: "borrowers.view" },
  { title: "Loans", icon: "badge-dollar-sign", route: "loans.index", active: "loans.index", category: "Investments", permission: "loans.view" },
  { title: "Loan Repayments", icon: "dollar-sign", route: "loanRepayments.index", active: "loanRepayments.index", category: "Investments", permission: "loans.repayments.view" },
];

// Overview Admin
const adminOverviewMenu = [
  { title: "Users", icon: "user", route: "userlist.view", active: "userlist.view", category: "Admin", permission: "users.view" },
  { title: "Roles", icon: "user", route: "roles.index", active: "roles.index", category: "Admin", permission: "roles.view" },
  { title: "Users Deposit", icon: "user", route: "deposits.index", active: "deposits.index", category: "Admin", permission: "users.view" },
  { title: "Subscriptions", icon: "barcode", route: "user_subscriptions.index", active: "user_subscriptions.index", category: "Admin", permission: "user_subscriptions.view" },
];


const outletsOverviewExtraMenu = [
  { title: "Outlet", icon: "store", route: "outlets.index", active: "outlets.index", category: "Outlets", permission: "outlets.view" },
];

// Outlet login menu (full app menu)
const outletLoggedInMenu = [
  // Main
  { title: "Dashboard", icon: "home", route: "home", active: "home", category: "Main", permission: "dashboard.view" },

  // Sales
  { title: "Add Sale (Inventory)", icon: "baggage-claim", route: "sales.create", active: "sales.create", category: "Sales", permission: "sales.create" },
  { title: "Add Sale (POS)", icon: "baggage-claim", route: "sales.add", active: "sales.add", category: "Sales", permission: "sales.create" },
  { title: "All Orders (Inventory)", icon: "badge-cent", route: "sales.index", active: "sales.index", category: "Sales", permission: "sales.view" },
  { title: "All Orders (POS)", icon: "badge-cent", route: "salesPos.index", active: "salesPos.index", category: "Sales", permission: "sales.view" },
  { title: "All Sales Return", icon: "badge-cent", route: "salesReturn.list", active: "salesReturn.list", category: "Sales", permission: "salesReturn.list" },

  // Purchase
  { title: "Add Purchase", icon: "arrow-right-left", route: "purchase.create", active: "purchase.create", category: "Purchase", permission: "purchase.create" },
  { title: "Purchase", icon: "receipt", route: "purchase.list", active: "purchase.list", category: "Purchase", permission: "purchase.view" },
  { title: "Local Purchase", icon: "receipt", route: "purchase.list_index", active: "purchase.list_index", category: "Purchase", permission: "purchase.list_index" },
  // Purchase Return
  { title: "Purchase Return", icon: "receipt", route: "purchase-returns.list", active: "purchase-returns.list", category: "Purchase", permission: "purchase_return.view" },
  { title: "Add Purchase Return", icon: "arrow-right-left", route: "purchase-returns.create", active: "purchase-returns.create", category: "Purchase", permission: "purchase_return.create" },

  // Inventory
  { title: "Damages List", icon: "alert-circle", route: "damages.index", active: "damages.index", category: "Inventory", permission: "damages.index" },
  { title: "Warehouse", icon: "warehouse", route: "warehouse.list", active: "warehouse.list", category: "Inventory", permission: "warehouse.view" },
  { title: "Supplier", icon: "shopping-basket", route: "supplier.view", active: "supplier.view", category: "Inventory", permission: "supplier.view" },
  { title: "Attribute", icon: "shopping-basket", route: "attributes.index", active: "attributes.index", category: "Inventory", permission: "attributes.view" },
  { title: "Products", icon: "shopping-basket", route: "product.list", active: "product.list", category: "Inventory", permission: "product.view" },
  { title: "Add Products", icon: "shopping-bag", route: "product.add", active: "product.add", category: "Inventory", permission: "product.create" },
  { title: "Categories", icon: "box", route: "category.view", active: "category.view", category: "Inventory", permission: "category.view" },
  { title: "Brands", icon: "box", route: "brands.index", active: "brands.index", category: "Inventory", permission: "brands.view" },
  { title: "Product Ledger", icon: "list-checks", route: "product-ledger.index", active: "product-ledger.index", category: "Inventory", permission: "product_ledger.view" },


  // Finance
  { title: "Expense Category", icon: "banknote-arrow-up", route: "expenses.category", active: "expenses.category", category: "Finance", permission: "expense.category_view" },
  { title: "Expense", icon: "wallet-minimal", route: "expenses.list", active: "expenses.list", category: "Finance", permission: "expense.view" },
  { title: "Accounts", icon: "dollar-sign", route: "accounts.index", active: "accounts.index", category: "Finance", permission: "accounts.view" },
  { title: "Ledgers", icon: "box", route: "ledgers.index", active: "ledgers.index", category: "Finance", permission: "ledger.view" },

  // Subscriptions
  { title: "Plan", icon: "barcode", route: "plans.index", active: "plans.index", category: "Subscriptions", permission: "plans.view" },
  // { title: "Plan Modules", icon: "barcode", route: "modules.index", active: "modules.index", category: "Subscriptions", permission: "modules.view" },
  { title: "Subscriptions", icon: "barcode", route: "subscriptions.index", active: "subscriptions.index", category: "Subscriptions", permission: "subscriptions.view" },

  // Partners
  // { title: "Dealerships", icon: "box", route: "dealerships.index", active: "dealerships.index", category: "Partners", permission: "dealerships.view" },


  // Reports all
  { title: "All Sales Reports ", icon: "badge-cent", route: "reports.sales", active: "reports.sales", category: "Reports", permission: "sales.view" },
  { title: "All Purchase Reports", icon: "badge-cent", route: "reports.purchase", active: "reports.purchase", category: "Reports", permission: "purchase.view" },
  
  { title: "All SalesItems Reports", icon: "badge-cent", route: "reports.sales.items", active: "reports.sales.items", category: "Reports", permission: "sales.view" },
  { title: "All PurchaseItems Reports", icon: "arrow-right-left", route: "reports.purchase.items", active: "reports.purchase.items", category: "Reports", permission: "purchase.items_view" },
  
  { title: "All SalesReturn Reports", icon: "badge-cent", route: "reports.sales-return", active: "reports.sales-return", category: "Reports", permission: "sales.view" },
  { title: "All PurchaseReturn Reports", icon: "badge-cent", route: "reports.purchase-return", active: "reports.purchase-return", category: "Reports", permission: "purchase_return.view" },

  { title: "All Damages Reports", icon: "alert-circle", route: "damages.index", active: "damages.index", category: "Reports", permission: "damages.index" },
  { title: "All Customer Reports", icon: "alert-circle", route: "reports.customer", active: "reports.customer", category: "Reports", permission: "customer.view" },
  { title: "All Supplier Reports", icon: "alert-circle", route: "reports.supplier", active: "reports.supplier", category: "Reports", permission: "supplier.view" },
  { title: "All Transaction Reports", icon: "dollar-sign", route: "reports.transaction", active: "reports.transaction", category: "Reports", permission: "payments.view" },
  { title: "All Account Reports", icon: "dollar-sign", route: "reports.account", active: "reports.account", category: "Reports", permission: "accounts.view" },
  { title: "All Product Reports", icon: "dollar-sign", route: "reports.product", active: "reports.product", category: "Reports", permission: "product.view" },
  { title: "All Expense Reports", icon: "dollar-sign", route: "reports.expense", active: "reports.expense", category: "Reports", permission: "expense.view" },



  // CRM
  { title: "Customer", icon: "user-plus", route: "customer.index", active: "customer.index", category: "CRM", permission: "customer.view" },
  { title: "Companies", icon: "user-plus", route: "companies.index", active: "companies.index", category: "CRM", permission: "companies.view" },

  // HR
  { title: "Employees", icon: "users", route: "employees.index", active: "employees.index", category: "HR", permission: "employees.view" },
  { title: "Attendance", icon: "calendar", route: "attendance.index", active: "attendance.index", category: "HR", permission: "attendance.view" },
  { title: "Salary", icon: "credit-card", route: "salary.index", active: "salary.index", category: "HR", permission: "salary.view" },
  { title: "Allowances", icon: "trending-up", route: "allowances.index", active: "allowances.index", category: "HR", permission: "allowances.view" },
  { title: "Ranks", icon: "star", route: "ranks.index", active: "ranks.index", category: "HR", permission: "ranks.view" },
  { title: "Bonus", icon: "gift", route: "bonus.index", active: "bonus.index", category: "HR", permission: "bonus.view" },
  { title: "SMS", icon: "message-circle", route: "sms-templates.index", active: "sms-templates.index", category: "HR", permission: "sms_templates.view" },

  // Admin (super admin will see even inside outlet)
  { title: "Users", icon: "user", route: "userlist.view", active: "userlist.view", category: "Admin", permission: "users.view" },
  { title: "Roles", icon: "user", route: "roles.index", active: "roles.index", category: "Admin", permission: "roles.view" },


  // Accounts
  { title: "Users Deposit", icon: "user", route: "deposits.index", active: "deposits.index", category: "Accounts", permission: "deposits.view" },
  { title: "Subscriptions Payments", icon: "dollar-sign", route: "subscriptions.payments", active: "subscriptions.payments", category: "Accounts", permission: "subscriptions.payments_view" },
  { title: "System Setting", icon: "user", route: 'system.index', active: "system.index", category: "System", permission: "system.index" },

  // Outlets (super admin will see even inside outlet)
  { title: "Outlet", icon: "store", route: "outlets.index", active: "outlets.index", category: "Outlets", permission: "outlets.view" },
];


const superAdminMenu = [
    // Main
  { title: "Dashboard", icon: "home", route: "home", active: "home", category: "Main", permission: "dashboard.view" },

    // Subscriptions
  { title: "Plan", icon: "barcode", route: "plans.index", active: "plans.index", category: "Subscriptions", permission: "plans.view" },
  // { title: "Plan Modules", icon: "barcode", route: "modules.index", active: "modules.index", category: "Subscriptions", permission: "modules.view" },
  { title: "Subscriptions", icon: "barcode", route: "subscriptions.index", active: "subscriptions.index", category: "Subscriptions", permission: "subscriptions.view" },


    // Admin (super admin will see even inside outlet)
  { title: "Users", icon: "user", route: "userlist.view", active: "userlist.view", category: "Admin", permission: "users.view" },
  { title: "Roles", icon: "user", route: "roles.index", active: "roles.index", category: "Admin", permission: "roles.view" },


    // Accounts
  { title: "Users Deposit", icon: "user", route: "deposits.index", active: "deposits.index", category: "Accounts", permission: "deposits.view" },
  { title: "Subscriptions Payments", icon: "dollar-sign", route: "subscriptions.payments", active: "subscriptions.payments", category: "Accounts", permission: "subscriptions.payments_view" },


  // System
  { title: "System Setting", icon: "user", route: 'system.index', active: "system.index", category: "System", permission: "system.index" },

]

const iconComponents = {
  dashboard: LayoutDashboard,
  user: User,
  settings: Settings,
  home: Home,
  "shopping-cart": ShoppingCart,
  package: Package,
  users: Users,
  "bar-chart": BarChart3,
  "credit-card": CreditCard,
  building: Building,
  "file-text": FileText,
  calendar: Calendar,
  "dollar-sign": DollarSign,
  award: Award,
  shield: Shield,
  bell: Bell,
  "help-circle": HelpCircle,
  "arrow-right-left": ArrowRightLeft,
  "badge-cent": BadgeCent,
  "baggage-claim": BaggageClaim,
  "banknote-arrow-up": BanknoteArrowUp,
  barcode: Barcode,
  box: Box,
  "shopping-bag": ShoppingBag,
  "shopping-basket": ShoppingBasket,
  "user-plus": UserPlus,
  "wallet-minimal": WalletMinimal,
  warehouse: Warehouse,
  receipt: Receipt,
  trophy: Trophy,
  "trending-up": TrendingUp,
  gift: Gift,
  star: Star,
  "badge-dollar-sign": BadgeDollarSign,
  clock: Clock,
  plane: Plane,
  "box-icon": BoxIcon,
  "tag-icon": TagIcon,
  store: Store,
  "alert-circle": AlertCircle,
  "check-circle": CheckCircle,
  eye: Eye,
  "log-in": LogIn,
  globe: Globe,
  headphones: Headphones,
  palette: Palette,
  image: ImageIcon,
  "file-image": FileImage,
  "bell-ring": BellRing,
  "list-checks": ListChecks,
  "message-circle": MessageCircle,
};

export default function Sidebar({ status, setStatus }) {
  const { auth, currentRoute, headerSettings } = usePage().props;
  const { t, locale } = useTranslation();
  const sidebarRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState("");

  const permissions = auth?.user?.permissions || [];

  // ✅ Super Admin detect (fallbacks)
  const isSuperAdmin =
    !!auth?.user?.is_super_admin ||
    auth?.user?.role_id === 1 ||
    auth?.user?.role?.name === "Super Admin" ||
    (Array.isArray(auth?.user?.roles) && auth.user.roles.includes("Super Admin"));

  const isLoggedIntoOutlet = !!auth?.user?.is_logged_into_outlet;
  const isOutletUser = !!auth?.user?.outlet_id;

  // ✅ superadmin: ignore permission checks
  const can = (perm) => {
    if (isSuperAdmin) return true;
    if (!perm) return true;
    return permissions.includes(perm);
  };

  const getIconComponent = (iconName) => {
    const IconComponent = iconComponents[iconName] || LayoutDashboard;
    return <IconComponent size={18} />;
  };

  const getTranslatedTitle = (englishTitle) => {
    const translationMap = {
      // Main
      Dashboard: t("auth.dashboard", "Dashboard"),
      "Outlet Management": t("auth.outlet_management", "Outlet Management"),

      // Sales
      "Add Sale (Inventory)": t("auth.add_sale_inventory", "Add Sale (Inventory)"),
      "Add Sale (POS)": t("auth.add_sale_pos", "Add Sale (POS)"),
      "All Orders (Inventory)": t("auth.all_orders_inventory", "All Orders (Inventory)"),
      "All Orders (POS)": t("auth.all_orders_pos", "All Orders (POS)"),
      "All Sales Items": t("auth.all_sales_items", "All Sales Items"),
      "All Sales Return": t("auth.all_sales_return", "All Sales Return"),

      // Purchase
      Purchase: t("auth.purchase", "Purchase"),
      "Local Purchase": t("auth.local_purchase", "Local Purchase"),
      "Add Purchase": t("auth.add_purchase", "Add Purchase"),
      "All Purchase Items": t("auth.all_purchase_items", "All Purchase Items"),
      "Purchase Return": t("auth.purchase_return", "Purchase Return"),
      "Add Purchase Return": t("auth.add_purchase_return", "Add Purchase Return"),

      // Inventory
      "Damages List": t("auth.damages_list", "Damages List"),
      Warehouse: t("auth.warehouse", "Warehouse"),
      Supplier: t("auth.supplier", "Supplier"),
      Attribute: t("auth.attribute", "Attribute"),
      Products: t("auth.products", "Products"),
      "Add Products": t("auth.add_products", "Add Products"),
      Categories: t("auth.categories", "Categories"),
      Brands: t("auth.brands", "Brands"),
      "Product Ledger": t("auth.product_ledger", "Product Ledger"),

      // Investments
      Investors: t("auth.investors", "Investors"),
      "Add Investor": t("auth.add_investor", "Add Investor"),
      Investments: t("auth.investments", "Investments"),
      "Add Investment": t("auth.add_investment", "Add Investment"),
      "Investment Returns": t("auth.investment_returns", "Investment Returns"),

      // Finance
      "Expense Category": t("auth.expense_category", "Expense Category"),
      Expense: t("auth.expense", "Expense"),
      Transactions: t("auth.transactions", "Transactions"),
      Accounts: t("auth.accounts", "Accounts"),
      Ledgers: t("auth.ledgers", "Ledgers"),

      // Subscriptions
      Plan: t("auth.plan", "Plan"),
      "Plan Modules": t("auth.plan_modules", "Plan Modules"),
      Subscriptions: t("auth.subscriptions", "Subscriptions"),
      "Subscriptions Payments": t("auth.subscriptions_payments", "Subscriptions Payments"),

      // Partners
      Dealerships: t("auth.dealerships", "Dealerships"),

      // CRM
      Customer: t("auth.customer", "Customer"),
      Companies: t("auth.companies", "Companies"),

      // Admin
      Users: t("auth.users", "Users"),
      Roles: t("auth.roles", "Roles"),

      // HR
      Employees: t("auth.employees", "Employees"),
      Attendance: t("auth.attendance", "Attendance"),
      Salary: t("auth.salary", "Salary"),
      Allowances: t("auth.allowances", "Allowances"),
      Ranks: t("auth.ranks", "Ranks"),
      Bonus: t("auth.bonus", "Bonus"),
      SMS: t("auth.sms", "SMS"),

      // Outlets
      Outlet: t("auth.outlet", "Outlet"),

      // Categories
      Main: t("auth.category_main", "Main"),
      Sales: t("auth.category_sales", "Sales"),
      Purchase: t("auth.category_purchase", "Purchase"),
      Inventory: t("auth.category_inventory", "Inventory"),
      Investments: t("auth.category_investments", "Investments"),
      Finance: t("auth.category_finance", "Finance"),
      Subscriptions: t("auth.category_subscriptions", "Subscriptions"),
      Partners: t("auth.category_partners", "Partners"),
      CRM: t("auth.category_crm", "CRM"),
      Reports: t("auth.category_reports", "Reports"),
      Admin: t("auth.category_admin", "Admin"),
      Accounts: t("auth.category_accounts", "Accounts"),
      System: t("auth.category_system", "System"),

      HR: t("auth.category_hr", "HR"),
      Outlets: t("auth.category_outlets", "Outlets"),
    };

    return translationMap[englishTitle] || englishTitle;
  };

  const getRouteUrl = (item) => {
    try {
      return item.routeParams ? route(item.route, item.routeParams) : route(item.route);
    } catch (e) {
      console.error(`Route error for ${item.route}:`, e);
      return "#";
    }
  };

  const filterMenuItems = (items) => {
    if (!searchQuery) return items;
    const q = searchQuery.toLowerCase();

    return items.filter((item) => {
      const title = getTranslatedTitle(item.title).toLowerCase();
      const matchesTitle = title.includes(q);

      const matchesChildren = item.children
        ? item.children.some((child) =>
          getTranslatedTitle(child.title).toLowerCase().includes(q)
        )
        : false;

      return matchesTitle || matchesChildren;
    });
  };

  // ✅ grouping + all hide logic (superadmin bypass)
  const groupMenuByCategory = (menuItems) => {
    const categories = {};

    menuItems.forEach((item) => {
      if (!isSuperAdmin && !can(item.permission)) return;

      if (!isSuperAdmin && isLoggedIntoOutlet && (item.category === "Admin" || item.category === "Outlets")) return;

      if (!isSuperAdmin && isOutletUser && isLoggedIntoOutlet && item.category === "Investments") return;

      const category = item.category || "General";
      categories[category] ||= [];
      categories[category].push(item);
    });

    return categories;
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (status && sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        setStatus(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [status, setStatus]);

  /**
   *  Super Admin: outlet logout থাকলেও Admin/Outlets/Investments সব দেখবে
   * তাই superadmin হলে Overview mode এও full menu দেখাবো (same as outletLoggedInMenu)
   */
  const menuToShow = useMemo(() => {
    if (isSuperAdmin) return superAdminMenu;

    if (isLoggedIntoOutlet) return outletLoggedInMenu;

    // Overview mode
    const base = [...outletOverviewMenuBase];

    // owner/admin (outlet_id নেই) => extra menus
    if (!isOutletUser) {
      base.push(...investmentsOverviewMenu);
      base.push(...adminOverviewMenu);
      base.push(...outletsOverviewExtraMenu);
    }

    return base;
  }, [isSuperAdmin, isLoggedIntoOutlet, isOutletUser]);

  const menuCategories = useMemo(() => {
    const grouped = groupMenuByCategory(menuToShow);

    const out = {};
    Object.entries(grouped).forEach(([cat, items]) => {
      const filtered = filterMenuItems(items);
      if (filtered.length) out[cat] = filtered;
    });
    return out;
  }, [menuToShow, searchQuery, locale, permissions, isSuperAdmin, isLoggedIntoOutlet, isOutletUser]); 

  const getFaviconUrl = () => {
    if (headerSettings?.fav_icon) {
      if (headerSettings.fav_icon.startsWith("http")) return headerSettings.fav_icon;
      if (headerSettings.fav_icon.startsWith("storage/")) return `/${headerSettings.fav_icon}`;
      return `/storage/${headerSettings.fav_icon}`;
    }
    return "https://i.ibb.co.com/QFP2f7SW/output-onlinepngtools-14.png";
  };

  const getSidebarName = () => {
    if (headerSettings?.sitebar_name) return headerSettings.sitebar_name;
    if (auth?.user?.current_outlet?.name) return `${auth.user.current_outlet.name} Dashboard`;
    return "Business Dashboard";
  };

  return (
    <>
      {status && (
        <div
          className="fixed inset-0 bg-black/50 lg:hidden z-40 transition-opacity duration-300"
          onClick={() => setStatus(false)}
        />
      )}

      <aside
        ref={sidebarRef}
        id="sidebar"
        className={`w-72 fixed h-full z-50 transition-all duration-300 ${status ? "translate-x-0 shadow-2xl" : "-translate-x-full"
          } lg:translate-x-0 lg:shadow-xl`}
        style={{ background: "linear-gradient(180deg, #0f2d1a 0%, #1e4d2b 100%)" }}
      >
        <div className="p-6 h-full flex flex-col">
          {/* Header */}
          <div className="flex flex-col items-center justify-center mb-8">
            <div className="flex items-center gap-3">
              <div className="p-1 rounded-xl">
                <img
                  src={getFaviconUrl()}
                  className="h-[70px]"
                  alt="Logo"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src =
                      "https://i.ibb.co.com/QFP2f7SW/output-onlinepngtools-14.png";
                  }}
                />
              </div>
            </div>

            <button
              onClick={() => setStatus(false)}
              className="lg:hidden text-white hover:bg-white/10 p-2 rounded-lg transition-colors absolute top-4 right-4"
            >
              <X size={20} />
            </button>
          </div>

          {/* Outlet warning (non-super-admin only) */}
          {!isSuperAdmin && !isLoggedIntoOutlet && (
            <div className="mb-6 bg-gradient-to-r from-amber-500/20 to-amber-600/10 backdrop-blur-sm border border-amber-500/20 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                  <Store size={20} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-sm">
                    {locale === "bn" ? "আউটলেট ওভারভিউ" : "Outlet Overview"}
                  </p>
                  <p className="text-white/70 text-xs">
                    {locale === "bn"
                      ? "সম্পূর্ণ ফিচার এক্সেস করতে আউটলেটে লগইন করুন"
                      : "Login to an outlet to access all features"}
                  </p>
                </div>
              </div>
              <div className="mt-3">
                <Link
                  href={route("outlets.index")}
                  className="inline-flex items-center justify-center w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-sm font-semibold py-2 px-4 rounded-lg transition-all duration-200"
                >
                  <Store size={16} className="mr-2" />
                  {locale === "bn" ? "আউটলেট ম্যানেজ করুন" : "Manage Outlets"}
                </Link>
              </div>
            </div>
          )}

          {/* Search (outlet login mode only) */}
          {isLoggedIntoOutlet && (
            <div className="mb-6 relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white w-4 h-4" />
                <input
                  type="text"
                  placeholder={locale === "bn" ? "মেনু সার্চ করুন..." : "Search menu..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="no-scrollbar flex-1 overflow-y-auto space-y-6 text-sm font-medium pr-2">
            {Object.entries(menuCategories).map(([category, items]) => (
              <div key={category} className="space-y-2">
                <p className="text-[10px] uppercase text-white font-bold px-3 mb-1 tracking-widest">
                  {getTranslatedTitle(category)}
                </p>

                <div className="space-y-1">
                  {items.map((item, index) => {
                    const isActive =
                      currentRoute === item.active ||
                      (item.children ? item.children.some((c) => currentRoute === c.active) : false);

                    const translatedTitle = getTranslatedTitle(item.title);

                    return (
                      <div key={`${category}-${index}`} className="relative group">
                        <div
                          className={`relative rounded-xl transition-all duration-200 ${isActive
                              ? "bg-gradient-to-r from-white/20 to-white/10 backdrop-blur-sm border border-white/10"
                              : "hover:bg-white/5"
                            }`}
                        >
                          <Link
                            href={item.route ? getRouteUrl(item) : "#"}
                            className="flex items-center gap-3 px-4 py-3 group"
                            onClick={() => setStatus(false)}
                          >
                            <span className={isActive ? "text-white" : "text-white/70 group-hover:text-white"}>
                              {getIconComponent(item.icon || "dashboard")}
                            </span>

                            <span
                              className={`font-medium ${locale === "bn" ? "text-sm leading-relaxed" : ""
                                } ${isActive ? "text-white" : "text-white/90 group-hover:text-white"}`}
                            >
                              {translatedTitle}
                            </span>

                            {item.route === "headers.index" && headerSettings && (
                              <span className="ml-auto text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full">
                                ✓
                              </span>
                            )}
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}


            {/* Overview message (non-super-admin only) */}
            {!isSuperAdmin && !isLoggedIntoOutlet && (
              <div className="text-center py-8">
                <Store className="w-12 h-12 text-white/20 mx-auto mb-3" />
                <p className="text-white text-sm font-medium mb-2">
                  {locale === "bn" ? "শুধুমাত্র আউটলেট ওভারভিউ" : "Outlet Overview Only"}
                </p>
                <p className="text-white/60 text-xs">
                  {locale === "bn"
                    ? "সম্পূর্ণ মেনু দেখতে আউটলেটে লগইন করুন"
                    : "Login to an outlet to see full menu"}
                </p>
              </div>
            )}
          </nav>

          {/* Current Outlet Info */}
          {isLoggedIntoOutlet && auth?.user?.current_outlet && (
            <div className="relative group">
              <div className="mt-3 mb-2 px-3 py-2 bg-gradient-to-r from-white/5 to-white/3 rounded-xl border border-white/10 hover:border-white/20 transition-all duration-200">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-green-500/80 to-emerald-600/80 flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
                    <Store size={12} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-xs truncate">{auth.user.current_outlet.name}</p>
                    <p className="text-white/50 text-[10px] truncate">{auth.user.current_outlet.code}</p>
                  </div>
                </div>
              </div>

              <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <Link
                  href={route("outlets.logout")}
                  method="post"
                  as="button"
                  className="w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-lg border border-white/10"
                  title={locale === "bn" ? "আউটলেট লগআউট" : "Logout from Outlet"}
                >
                  <LogOut size={10} className="text-white" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Toggle */}
      <button
        onClick={() => setStatus(true)}
        className="fixed bottom-4 right-4 lg:hidden z-40 bg-gradient-to-r from-[#1e4d2b] to-[#35a952] text-white p-3 rounded-full shadow-2xl hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200"
      >
        <Menu size={24} />
      </button>
    </>
  );
}