import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Building2,
  Boxes,
  Truck,
  Receipt,
  CreditCard,
  ShoppingBag,
  Users,
  Clock,
  Settings,
  Search,
  Menu,
  X,
  Cpu,
  LogOut,
  Layers,
  ChevronRight,
  Shield
} from 'lucide-react';
import { UserSession } from './types';
import LoginView from './components/LoginView';
import WorkerPortal from './components/WorkerPortal';
import CompanyManager from './components/CompanyManager';
import MaterialManager from './components/MaterialManager';
import StockManager from './components/StockManager';
import DeliveryChallanManager from './components/DeliveryChallanManager';
import InvoiceManager from './components/InvoiceManager';
import PaymentManager from './components/PaymentManager';
import ExpenseManager from './components/ExpenseManager';
import ProductionManager from './components/ProductionManager';
import SalaryManager from './components/SalaryManager';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import SettingsManager from './components/SettingsManager';
import UserManager from './components/UserManager';
import NotificationPopover from './components/NotificationPopover';
import PwaInstallPrompt from './components/PwaInstallPrompt';

// Grouped Navigation structure with expandable sub-pages
interface NavSubItem {
  id: string;
  label: string;
  icon: any;
}

interface NavGroup {
  id: string;
  label: string;
  icon: any;
  adminOnly?: boolean;
  subItems?: NavSubItem[];
}

const navGroups: NavGroup[] = [
  {
    id: 'overview',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    id: 'inventory_group',
    label: 'Inventory & Clients',
    icon: Boxes,
    subItems: [
      { id: 'companies', label: 'Companies', icon: Building2 },
      { id: 'stock', label: 'Raw Stock & Ledgers', icon: Layers },
      { id: 'materials', label: 'Parts Catalog', icon: Cpu },
    ],
  },
  {
    id: 'billing_group',
    label: 'Billing & Dispatches',
    icon: Receipt,
    subItems: [
      { id: 'dcs', label: 'Delivery Challans (DC)', icon: Truck },
      { id: 'invoices', label: 'Tax Invoices', icon: Receipt },
      { id: 'payments', label: 'Payments & Ledgers', icon: CreditCard },
    ],
  },
  {
    id: 'operations_group',
    label: 'Staff & Operations',
    icon: Users,
    subItems: [
      { id: 'workers', label: 'Workers & Production', icon: Users },
      { id: 'attendance', label: 'Attendance (26-Day)', icon: Clock },
      { id: 'purchases', label: 'Purchases & Spares', icon: ShoppingBag },
    ],
  },
  {
    id: 'users',
    label: 'Users & Roles',
    icon: Shield,
    adminOnly: true,
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    adminOnly: true,
  },
];

export default function App() {
  const [session, setSession] = useState<UserSession | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // All dropdowns closed by default
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (groupId: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const handleSelectTab = (tabId: string) => {
    setActiveTab(tabId);
    const parentGroup = navGroups.find((g) => g.subItems?.some((sub) => sub.id === tabId));
    if (parentGroup) {
      setOpenGroups({ [parentGroup.id]: true });
    } else {
      setOpenGroups({});
    }
  };

  // Restore session from localStorage on startup
  useEffect(() => {
    const saved = localStorage.getItem('svt_session');
    if (saved) {
      try {
        setSession(JSON.parse(saved));
      } catch (e) {
        localStorage.removeItem('svt_session');
      }
    }
  }, []);

  // Ensure non-admin users cannot stay on admin-only tabs
  useEffect(() => {
    if (session && session.role !== 'ADMIN' && (activeTab === 'users' || activeTab === 'settings')) {
      setActiveTab('overview');
    }
  }, [session, activeTab]);

  // Ensure dropdown is open only if an active page inside it is open
  useEffect(() => {
    const parentGroup = navGroups.find((g) => g.subItems?.some((sub) => sub.id === activeTab));
    if (parentGroup) {
      setOpenGroups({ [parentGroup.id]: true });
    } else {
      setOpenGroups({});
    }
  }, [activeTab]);

  const handleLogout = () => {
    localStorage.removeItem('svt_session');
    setSession(null);
    setActiveTab('overview');
  };

  // If not logged in, show clean Login screen
  if (!session) {
    return <LoginView onLoginSuccess={(userSession) => setSession(userSession)} />;
  }

  // If logged in as WORKER, show dedicated mobile-first worker portal
  if (session.role === 'WORKER') {
    return <WorkerPortal session={session} onLogout={handleLogout} />;
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 flex selection:bg-slate-900 selection:text-white">
      {/* ──────────────────────────────────────────────────────────── */}
      {/* 1. DESKTOP ELEGANT SIDEBAR (Icon + Name, Crisp White & Slate) */}
      {/* ──────────────────────────────────────────────────────────── */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 flex-col justify-between py-5 px-3.5 bg-white border-r border-slate-200 z-40">
        <div className="flex flex-col h-full overflow-hidden">
          {/* Workshop Brand Header */}
          <div className="flex items-center gap-3 px-2 pb-5 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 flex items-center justify-center font-semibold shrink-0 shadow-2xs">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-sm text-slate-900 leading-tight">Shri Varshini</h2>
              <p className="text-[11px] text-slate-500 font-normal">CNC Machining & Billing</p>
            </div>
          </div>

          {/* Navigation Links with Icon and Name */}
          <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider px-3 pt-5 pb-2">
            Main Menu
          </div>
          <nav className="flex-1 overflow-y-auto space-y-1.5 pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {navGroups
              .filter((g) => !g.adminOnly || session.role === 'ADMIN')
              .map((group) => {
              const Icon = group.icon;
              const hasSub = !!group.subItems && group.subItems.length > 0;
              const isGroupActive = hasSub && group.subItems?.some((sub) => sub.id === activeTab);
              const isDirectActive = !hasSub && activeTab === group.id;
              const isOpen = openGroups[group.id];

              if (!hasSub) {
                return (
                  <button
                    key={group.id}
                    onClick={() => handleSelectTab(group.id)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all w-full text-left whitespace-nowrap ${
                      isDirectActive
                        ? 'bg-slate-100 border border-slate-200/80 text-slate-900 font-semibold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 transition-colors ${isDirectActive ? 'text-slate-900' : 'text-slate-400'}`} />
                    <span className="truncate">{group.label}</span>
                  </button>
                );
              }

              return (
                <div key={group.id} className="space-y-1">
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all w-full text-left whitespace-nowrap ${
                      isGroupActive
                        ? 'text-slate-900 bg-slate-50 border border-slate-200/80 shadow-2xs'
                        : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <Icon className={`w-4 h-4 shrink-0 transition-colors ${isGroupActive ? 'text-slate-900' : 'text-slate-400'}`} />
                      <span className="truncate">{group.label}</span>
                    </div>
                    <ChevronRight
                      className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-90 text-slate-700' : ''
                      }`}
                    />
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.18, ease: 'easeInOut' }}
                        className="overflow-hidden pl-3.5 pr-1 space-y-1"
                      >
                        <div className="border-l-2 border-slate-100 pl-2 space-y-1 py-0.5">
                          {group.subItems?.map((sub) => {
                            const SubIcon = sub.icon;
                            const isSubActive = activeTab === sub.id;
                            return (
                              <button
                                key={sub.id}
                                onClick={() => handleSelectTab(sub.id)}
                                className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all w-full text-left whitespace-nowrap ${
                                  isSubActive
                                    ? 'bg-slate-100 text-slate-900 font-semibold border border-slate-200/80 shadow-2xs'
                                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
                                }`}
                              >
                                <SubIcon
                                  className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                                    isSubActive ? 'text-slate-900' : 'text-slate-400'
                                  }`}
                                />
                                <span className="truncate">{sub.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </nav>

          {/* Bottom User Profile Card */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between px-1">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full border border-slate-200 bg-slate-100 text-slate-800 flex items-center justify-center font-semibold text-xs shrink-0">
                {session.fullName ? session.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'AD'}
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-slate-900 truncate">{session.fullName}</p>
                <p className="text-[10px] text-slate-500 font-normal">
                  {session.role === 'ADMIN' ? 'Administrator' : 'Company Staff'}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="w-8 h-8 rounded-xl border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-100 flex items-center justify-center transition-colors shrink-0 whitespace-nowrap"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 2. MOBILE RESPONSIVE HAMBURGER DRAWER                       */}
      {/* ──────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="lg:hidden fixed left-0 top-0 bottom-0 w-72 bg-white border-r border-slate-200 z-50 p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between pb-6 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl border border-slate-200 bg-slate-50 text-slate-800 flex items-center justify-center font-semibold">
                      <Cpu className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-sm text-slate-900">Shri Varshini</h2>
                      <p className="text-xs text-slate-500 font-normal">CNC Machining</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 whitespace-nowrap"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <nav className="flex flex-col gap-1.5 mt-6 overflow-y-auto max-h-[calc(100vh-220px)] pr-1">
                  {navGroups
                    .filter((g) => !g.adminOnly || session.role === 'ADMIN')
                    .map((group) => {
                    const Icon = group.icon;
                    const hasSub = !!group.subItems && group.subItems.length > 0;
                    const isGroupActive = hasSub && group.subItems?.some((sub) => sub.id === activeTab);
                    const isDirectActive = !hasSub && activeTab === group.id;
                    const isOpen = openGroups[group.id];

                    if (!hasSub) {
                      return (
                        <button
                          key={group.id}
                          onClick={() => {
                            handleSelectTab(group.id);
                            setMobileMenuOpen(false);
                          }}
                          className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                            isDirectActive
                              ? 'bg-slate-100 border border-slate-200 text-slate-900 font-semibold shadow-2xs'
                              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                          } whitespace-nowrap`}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{group.label}</span>
                        </button>
                      );
                    }

                    return (
                      <div key={group.id} className="space-y-1">
                        <button
                          type="button"
                          onClick={() => toggleGroup(group.id)}
                          className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors w-full ${
                            isGroupActive
                              ? 'text-slate-900 bg-slate-50 border border-slate-200/80 shadow-2xs'
                              : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                          } whitespace-nowrap`}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className="w-4 h-4" />
                            <span>{group.label}</span>
                          </div>
                          <ChevronRight
                            className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                              isOpen ? 'rotate-90 text-slate-700' : ''
                            }`}
                          />
                        </button>

                        {isOpen && (
                          <div className="border-l-2 border-slate-100 pl-3 ml-3 space-y-1 py-1">
                            {group.subItems?.map((sub) => {
                              const SubIcon = sub.icon;
                              const isSubActive = activeTab === sub.id;
                              return (
                                <button
                                  key={sub.id}
                                  onClick={() => {
                                    handleSelectTab(sub.id);
                                    setMobileMenuOpen(false);
                                  }}
                                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors w-full text-left ${
                                    isSubActive
                                      ? 'bg-slate-100 text-slate-900 font-semibold border border-slate-200'
                                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
                                  } whitespace-nowrap`}
                                >
                                  <SubIcon className="w-3.5 h-3.5" />
                                  <span>{sub.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </nav>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 text-slate-900 flex items-center justify-center font-medium text-xs">
                    {session.fullName ? session.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'AD'}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-900">{session.fullName}</p>
                    <p className="text-[11px] text-slate-500 font-normal">Role: {session.role}</p>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  title="Sign Out"
                  className="w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:text-rose-600 hover:bg-slate-50 whitespace-nowrap"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 3. MAIN DASHBOARD CONTENT AREA                               */}
      {/* ──────────────────────────────────────────────────────────── */}
      <main className="flex-1 lg:pl-64 min-h-screen flex flex-col bg-white">
        {/* Top Minimal Bar */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-100 px-6 lg:px-10 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden w-10 h-10 rounded-2xl border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-50 whitespace-nowrap"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <h1 className="text-base lg:text-lg font-semibold text-slate-900 leading-tight">
                Welcome, {session.fullName}
              </h1>
              <p className="text-xs text-slate-500 font-normal mt-0.5">
                Job Work Management & Billing Control
              </p>
            </div>
          </div>

          {/* Quick Header Actions & Search */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-xs w-64 focus-within:border-slate-400 focus-within:bg-white transition-all">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search DC, invoice, company..."
                className="bg-transparent border-none outline-none w-full placeholder:text-slate-400 font-normal"
              />
            </div>

            {/* Workable Notification Button */}
            <NotificationPopover session={session} onNavigateTab={handleSelectTab} />
          </div>
        </header>

        {/* Page Inner Container */}
        <div className="p-6 lg:p-10 max-w-7xl w-full mx-auto space-y-8">
          {/* ──────────────────────────────────────────────────────────── */}
          {/* TAB CONTENT SWITCHER                                         */}
          {/* ──────────────────────────────────────────────────────────── */}
          {activeTab === 'users' ? (
            <UserManager session={session} />
          ) : activeTab === 'companies' ? (
            <CompanyManager session={session} />
          ) : activeTab === 'stock' ? (
            <StockManager session={session} />
          ) : activeTab === 'materials' ? (
            <MaterialManager session={session} />
          ) : activeTab === 'dcs' ? (
            <DeliveryChallanManager session={session} />
          ) : activeTab === 'invoices' ? (
            <InvoiceManager session={session} />
          ) : activeTab === 'payments' ? (
            <PaymentManager session={session} />
          ) : activeTab === 'purchases' ? (
            <ExpenseManager session={session} />
          ) : activeTab === 'workers' ? (
            <ProductionManager session={session} />
          ) : activeTab === 'attendance' ? (
            <SalaryManager session={session} />
          ) : activeTab === 'settings' ? (
            <SettingsManager session={session} />
          ) : (
            <AnalyticsDashboard session={session} onNavigateTab={handleSelectTab} />
          )}
        </div>
      </main>

      {/* PWA Mobile Installation Prompt */}
      <PwaInstallPrompt />
    </div>
  );
}
