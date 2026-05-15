import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, usePage, router } from "@inertiajs/react";
import Image from "../components/Image";
import { toast } from "react-toastify";
import LanguageSwitcher from "../components/LanguageSwitcher";
import {
  Bell,
  Menu,
  Search,
  User,
  Shield,
  Store,
  ChevronDown,
  MapPin,
  DollarSign,
  LogOut,
  X,
} from "lucide-react";

const menuData = [
  { title: "Dashboard", route: "home", params: null, category: "Main", icon: HomeIcon },
  { title: "Add Sale (Inventory)", route: "sales.create", params: null, category: "Sales", icon: SaleIcon },
  { title: "Add Sale (POS)", route: "sales.add", params: null, category: "Sales", icon: SaleIcon },
  { title: "All Orders (Inventory)", route: "sales.index", params: null, category: "Sales", icon: OrdersIcon },
  { title: "All Orders (POS)", route: "salesPos.index", category: "Sales", icon: OrdersIcon },
  { title: "Products", route: "product.list", params: null, category: "Inventory", icon: BoxIcon },
  { title: "Add Products", route: "product.add", params: null, category: "Inventory", icon: BoxIcon },
  { title: "Outlet", route: "outlets.index", params: null, category: "Outlets", icon: StoreIcon },
  { title: "Header Settings", route: "headers.index", params: null, category: "Settings", icon: SettingsIcon },
];

/** Simple inline icons so header doesn't depend on big icon map */
function HomeIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1v-10.5Z" />
    </svg>
  );
}
function SaleIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" />
      <path d="M12 8v8" />
      <path d="M8 12h8" />
    </svg>
  );
}
function OrdersIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M7 3h10l2 4H5l2-4Z" />
      <path d="M5 7v14a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V7" />
      <path d="M9 11h6" />
      <path d="M9 15h6" />
    </svg>
  );
}
function BoxIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 8V21H3V8" />
      <path d="M23 8 12 2 1 8" />
      <path d="M12 22V12" />
    </svg>
  );
}
function StoreIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 9 5 3h14l2 6" />
      <path d="M3 9h18" />
      <path d="M5 22V9" />
      <path d="M19 22V9" />
      <path d="M9 22v-6h6v6" />
    </svg>
  );
}
function SettingsIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  );
}

const GRADIENT = "linear-gradient(180deg, #1e4d2b 0%, #35a952 100%)";
const PRIMARY = "#1e4d2b";

// HeaderMeta component for setting browser title and favicon
function HeaderMeta() {
  const { auth, headerSettings } = usePage().props;
  const [favicon, setFavicon] = useState('/images/default-favicon.ico');
  const [title, setTitle] = useState('Business Dashboard');

  useEffect(() => {
    if (headerSettings) {
      if (headerSettings.fav_icon) {
        setFavicon(headerSettings.fav_icon_url || `/storage/${headerSettings.fav_icon}`);
      }
      if (headerSettings.title) {
        setTitle(headerSettings.title);
      }
    } else if (auth?.user?.current_outlet?.name) {
      // Fallback to outlet name if no header settings
      setTitle(`${auth.user.current_outlet.name} Dashboard`);
    }
  }, [headerSettings, auth]);

  useEffect(() => {
    // Set document title
    document.title = `${title} - ${import.meta.env.VITE_APP_NAME || 'Business App'}`;
    
    // Set favicon
    const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
    link.type = 'image/x-icon';
    link.rel = 'shortcut icon';
    link.href = favicon;
    document.getElementsByTagName('head')[0].appendChild(link);
  }, [title, favicon]);

  return null; // This component doesn't render anything visible
}

export default function Header({ sidebarOpen, setSidebarOpen }) {
  const { auth, headerSettings, flash } = usePage().props;

  const [showOutletDropdown, setShowOutletDropdown] = useState(false);
  const [isShadowUser, setIsShadowUser] = useState(false);

  // Search states
  const [q, setQ] = useState("");
  const [searchOpenMobile, setSearchOpenMobile] = useState(false);
  const [searchOpenDesktop, setSearchOpenDesktop] = useState(false);
  const searchWrapRef = useRef(null);
  const searchInputRef = useRef(null);
  const mobileInputRef = useRef(null);

  useEffect(() => {
    if (auth?.user?.type) setIsShadowUser(auth.user.type === "shadow");
  }, [auth]);

  // Flash message (optional)
  useEffect(() => {
    if (flash?.error) toast.error(flash.error);
    if (flash?.success) toast.success(flash.success);
  }, [flash]);

  const handleToggleUserType = () => {
    router.post(
      route("user.toggle.type"),
      {},
      {
        preserveScroll: true,
        preserveState: true,
        onSuccess: () => setIsShadowUser((s) => !s),
      }
    );
  };

  // Outlet actions
  const handleOutletLogout = () => {
    if (confirm("Are you sure you want to logout from this outlet?")) {
      router.post(route("outlets.logout"));
    }
  };
  const handleOutletSwitch = (outletId) => {
    router.post(route("outlets.switch"), { outlet_id: outletId }, { preserveScroll: true });
  };

  // If not authenticated
  if (!auth?.user) {
    return (
      <nav className="h-16 bg-white/80 backdrop-blur-md flex items-center justify-between px-4 lg:px-8 border-b border-gray-100 sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <div className="skeleton h-8 w-32"></div>
        </div>
        <div className="skeleton h-10 w-10 rounded-full"></div>
      </nav>
    );
  }

  const currentOutlet = auth.user.current_outlet;
  const isLoggedIntoOutlet = auth.user.is_logged_into_outlet;
  const availableOutlets = auth.user.available_outlets || [];

  // Get sidebar name from header settings or fallback
  const sidebarName = headerSettings?.sitebar_name || 
                     (currentOutlet?.name ? `${currentOutlet.name} Dashboard` : 'Dashboard');

  // Menu search list (you can restrict when not logged in outlet)
  const searchableMenu = useMemo(() => {
    if (!isLoggedIntoOutlet) {
      // outlet only
      return menuData.filter((m) => m.route === "outlets.index" || m.route === "headers.index");
    }
    return menuData;
  }, [isLoggedIntoOutlet]);

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [];
    return searchableMenu
      .filter((m) => m.title.toLowerCase().includes(query) || (m.category || "").toLowerCase().includes(query))
      .slice(0, 10);
  }, [q, searchableMenu]);

  const openSearchDesktop = () => {
    setSearchOpenDesktop(true);
    setTimeout(() => searchInputRef.current?.focus(), 0);
  };

  const closeSearchAll = () => {
    setSearchOpenDesktop(false);
    setSearchOpenMobile(false);
  };

  // Click outside to close desktop dropdown
  useEffect(() => {
    const onDown = (e) => {
      if (!searchOpenDesktop) return;
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target)) {
        setSearchOpenDesktop(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [searchOpenDesktop]);

  // Esc close search sheets
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") closeSearchAll();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        // desktop -> open dropdown, mobile -> open sheet
        if (window.innerWidth < 768) {
          setSearchOpenMobile(true);
          setTimeout(() => mobileInputRef.current?.focus(), 50);
        } else {
          openSearchDesktop();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const goToMenu = (item) => {
    try {
      const href = item.params ? route(item.route, item.params) : route(item.route);
      closeSearchAll();
      setQ("");
      router.visit(href, { preserveScroll: true });
    } catch {
      toast.error("Route not found.");
    }
  };

  return (
    <>
      {/* HeaderMeta sets the browser title and favicon */}
      <HeaderMeta />
      
      <nav className="h-16 bg-white/80 backdrop-blur-md flex items-center justify-between px-4 lg:px-8 border-b border-gray-100 sticky top-0 z-40">
        {/* LEFT */}
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg text-slate-600 transition-colors"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>



          {/* Language */}
          <div className="flex items-center">
            <LanguageSwitcher />
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-3 lg:gap-6">
          {/* Desktop Search */}
          <div className="hidden md:block relative" ref={searchWrapRef}>
            <button
              onClick={openSearchDesktop}
              className="relative group w-56 lg:w-72"
              aria-label="Search menu"
            >
              <div className="bg-slate-50 border border-slate-100 rounded-xl py-2 pl-10 pr-4 text-xs w-full outline-none group-hover:ring-2 ring-[#35a952]/15 transition-all text-slate-500 text-left">
                Search menu… <span className="text-slate-400"> (Ctrl/⌘+K)</span>
              </div>
              <Search className="absolute left-3.5 top-2.5 text-slate-400 w-4 h-4" />
            </button>

            {searchOpenDesktop && (
              <div className="absolute top-12 left-0 w-full bg-white rounded-2xl border border-black/5 shadow-2xl overflow-hidden z-[70]">
                <div className="p-3 border-b">
                  <div className="relative">
                    <input
                      ref={searchInputRef}
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      className="h-11 w-full rounded-xl bg-slate-50 border border-slate-100 pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-green-200"
                      placeholder="Search menu items…"
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <button
                      onClick={() => {
                        setQ("");
                        setSearchOpenDesktop(false);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-gray-100"
                      aria-label="Close"
                    >
                      <X size={16} className="text-slate-500" />
                    </button>
                  </div>
                </div>

                <div className="max-h-[360px] overflow-auto p-2">
                  {!q.trim() && (
                    <div className="p-4 text-sm text-slate-500">
                      Type to search menu. <span className="text-slate-400">Example: "sales", "product", "outlet"</span>
                    </div>
                  )}

                  {q.trim() && results.length === 0 && (
                    <div className="p-4 text-sm text-slate-500">No results found.</div>
                  )}

                  {results.map((item, idx) => {
                    const Icon = item.icon || StoreIcon;
                    return (
                      <button
                        key={idx}
                        onClick={() => goToMenu(item)}
                        className="w-full text-left p-3 rounded-2xl hover:bg-slate-50 transition flex items-center gap-3"
                      >
                        <div
                          className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-sm"
                          style={{ background: GRADIENT }}
                        >
                          <Icon className="w-5 h-5" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-gray-900 truncate">{item.title}</div>
                          <div className="text-xs text-gray-500 truncate">{item.category || "Menu"}</div>
                        </div>

                        <div className="text-xs font-semibold text-[#1e4d2b]">Go</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Mobile Search button */}
          <button
            onClick={() => {
              setSearchOpenMobile(true);
              setTimeout(() => mobileInputRef.current?.focus(), 80);
            }}
            className="md:hidden p-2 text-slate-500 hover:text-[#1e4d2b] hover:bg-slate-50 rounded-xl transition-all"
            aria-label="Search menu"
          >
            <Search size={20} />
          </button>


          {/* Profile dropdown */}
          <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full ring-2 ring-white ring-offset-2 ring-offset-gray-100 overflow-hidden">
                <Image path={auth.user.profile} />
              </div>
            </div>

            <ul tabIndex={0} className="dropdown-content menu bg-base-100 rounded-box z-[80] w-56 p-2 mt-4 shadow-lg">
              <li className="pointer-events-none border-b border-gray-100 mb-2 py-3">
                <div className="space-x-3">
                  <div className="avatar">
                    <div className="w-8 h-8 rounded-full overflow-hidden">
                      <Image path={auth.user.profile} />
                    </div>
                  </div>
                  <div>
                    <h1 className="text-sm text-gray-900 font-medium">{auth.user.name}</h1>
                    <span className="text-xs font-normal text-gray-500 capitalize">{auth.user.role}</span>
                  </div>
                </div>
              </li>

              <li>
                <Link href={route("profile.view")}>
                  <User size={14} />
                  <span>Profile</span>
                </Link>
              </li>

              <li>
                <Link href={route("businessProfile.view")}>
                  <User size={14} />
                  <span>Business Profile</span>
                </Link>
              </li>

              <li>
                <Link href={route("security.view")}>
                  <Shield size={14} />
                  <span>Security</span>
                </Link>
              </li>

              <li>
                <Link href={route("deposits.index")}>
                  <DollarSign size={14} />
                  <span>Deposit</span>
                </Link>
              </li>
              
              <li>
                <Link href={route("headers.index")}>
                  <SettingsIcon className="w-4 h-4" />
                  <span>Header Settings</span>
                </Link>
              </li>

              <li>
                <Link href={route("notifications.index")}>
                  <Shield size={14} />
                  <span>Notification</span>
                </Link>
              </li>

              <li>
                <Link
                  href={route("logout")}
                  onClick={(e) => {
                    if (!confirm("Are you sure you want to logout?")) e.preventDefault();
                  }}
                >
                  <LogOut size={14} />
                  <span>Logout</span>
                </Link>
              </li>

              {/* <li className="mt-1">
                <button
                  onClick={handleToggleUserType}
                  className={`btn btn-sm ${isShadowUser ? "bg-[#1e4d2b] text-white" : "bg-amber-500 text-white"} gap-2`}
                  title={`Switch to ${isShadowUser ? "Shadow" : "General"} mode`}
                >
                  <Shield size={16} />
                  {isShadowUser ? "General Mode" : "Shadow Mode"}
                </button>
              </li> */}
            </ul>
          </div>
        </div>

        {/* =========================
            MOBILE SEARCH SHEET
           ========================= */}
        {searchOpenMobile && (
          <div className="fixed inset-0 z-[9999]">
            <div
              className="absolute inset-0 bg-black/50"
              onMouseDown={(e) => e.target === e.currentTarget && setSearchOpenMobile(false)}
            />
            <div className="absolute inset-x-0 top-0 bg-white rounded-b-3xl shadow-2xl border-b border-black/10 overflow-hidden">
              <div className="p-4">
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <input
                      ref={mobileInputRef}
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      className="h-12 w-full rounded-2xl bg-slate-50 border border-slate-100 pl-11 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-green-200"
                      placeholder="Search menu…"
                    />
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    {q && (
                      <button
                        onClick={() => setQ("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl hover:bg-gray-100"
                      >
                        <X size={18} className="text-slate-500" />
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => setSearchOpenMobile(false)}
                    className="h-12 px-4 rounded-2xl text-white font-semibold"
                    style={{ background: GRADIENT }}
                  >
                    Done
                  </button>
                </div>

                <div className="mt-4 max-h-[65vh] overflow-auto">
                  {!q.trim() && (
                    <div className="p-3 text-sm text-slate-500">
                      Search your menu items. <span className="text-slate-400">Try "sale", "product", "outlet".</span>
                    </div>
                  )}

                  {q.trim() && results.length === 0 && (
                    <div className="p-3 text-sm text-slate-500">No results found.</div>
                  )}

                  <div className="space-y-2">
                    {results.map((item, idx) => {
                      const Icon = item.icon || StoreIcon;
                      return (
                        <button
                          key={idx}
                          onClick={() => goToMenu(item)}
                          className="w-full text-left p-3 rounded-3xl border border-black/5 bg-white hover:bg-slate-50 transition flex items-center gap-3"
                        >
                          <div
                            className="w-12 h-12 rounded-3xl flex items-center justify-center text-white shadow-sm"
                            style={{ background: GRADIENT }}
                          >
                            <Icon className="w-6 h-6" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold text-gray-900 truncate">{item.title}</div>
                            <div className="text-xs text-gray-500 truncate">{item.category || "Menu"}</div>
                          </div>
                          <div className="text-xs font-semibold" style={{ color: PRIMARY }}>
                            Open
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="h-3" />
                </div>
              </div>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}