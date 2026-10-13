import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Users,
  Building2,
  ShoppingCart,
  MapPin,
  Package,
  FileText,
  AlertTriangle,
  Settings,
  Truck,
  DollarSign,
  CalendarCheck,
  ArrowRight,
  X
} from 'lucide-react';

export default function CommandPalette({
  isOpen,
  onClose,
  onNavigate,
  onOpenCustomer360,
  onOpenOnboarding
}) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  const quickActions = [
    { id: 'cmd_schedule', title: 'My Daily Schedule & Planner', category: 'Workforce', icon: CalendarCheck, tab: 'schedule' },
    { id: 'cmd_team_schedules', title: 'Team Daily Schedules & Route Approvals', category: 'Supervision', icon: CalendarCheck, tab: 'team_schedules' },
    { id: 'cmd_dash', title: 'Go to Command Center', category: 'Navigation', icon: Building2, tab: 'command_center' },
    { id: 'cmd_workforce', title: 'Workforce & Live Radar', category: 'Navigation', icon: Users, tab: 'supervisor_dashboard' },
    { id: 'cmd_customers', title: 'Customer 360 & Directory', category: 'Customers', icon: Building2, tab: 'customers' },
    { id: 'cmd_sales', title: 'Sales Orders & POS Cockpit', category: 'Sales', icon: ShoppingCart, tab: 'sales' },
    { id: 'cmd_approvals', title: 'Order Approvals Queue', category: 'Sales', icon: ShoppingCart, tab: 'order_approvals' },
    { id: 'cmd_inventory', title: 'Inventory & Warehouse Stock', category: 'Inventory', icon: Package, tab: 'inventory' },
    { id: 'cmd_delivery', title: 'Deliveries & Fleet Tracking', category: 'Logistics', icon: Truck, tab: 'delivery' },
    { id: 'cmd_alerts', title: 'Alerts & Red Flag Center', category: 'Exceptions', icon: AlertTriangle, tab: 'alerts' },
    { id: 'cmd_reports', title: 'Operational Reports & Exports', category: 'Reports', icon: FileText, tab: 'reports' },
    { id: 'cmd_payments', title: 'Collections & Ledger', category: 'Finance', icon: DollarSign, tab: 'payments' },
    { id: 'cmd_onboard', title: 'Onboard New Company (Wizard)', category: 'Admin', icon: Settings, action: 'onboard' }
  ];

  const filtered = quickActions.filter(a =>
    a.title.toLowerCase().includes(query.toLowerCase()) ||
    a.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else onClose(false); // trigger open
      }
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % (filtered.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filtered.length) % (filtered.length || 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          handleSelect(filtered[selectedIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filtered, selectedIndex]);

  const handleSelect = (item) => {
    onClose();
    if (item.action === 'onboard') {
      if (onOpenOnboarding) onOpenOnboarding();
    } else if (item.tab) {
      onNavigate(item.tab);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Search Header */}
        <div className="relative flex items-center px-4 border-b border-zinc-100 dark:border-zinc-800">
          <Search size={20} className="text-zinc-400 mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command, customer, module or action... (Ctrl + K)"
            className="w-full py-4 bg-transparent text-zinc-900 dark:text-zinc-100 text-base outline-none placeholder:text-zinc-400"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-md"
            >
              <X size={16} />
            </button>
          )}
          <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-800 rounded border border-zinc-200 dark:border-zinc-700 ml-2">
            ESC to close
          </span>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 divide-y divide-zinc-50 dark:divide-zinc-800/50">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 dark:text-zinc-400 text-sm">
              No matching commands or entities found for "<span className="font-semibold text-zinc-700 dark:text-zinc-200">{query}</span>"
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((item, index) => {
                const Icon = item.icon;
                const isSelected = index === selectedIndex;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-left transition-all ${
                      isSelected
                        ? 'bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400'
                        : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isSelected ? 'bg-orange-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'}`}>
                        <Icon size={16} />
                      </div>
                      <div>
                        <div className="text-sm font-semibold">{item.title}</div>
                        <div className="text-xs text-zinc-400 dark:text-zinc-500">{item.category}</div>
                      </div>
                    </div>
                    <ArrowRight size={15} className={`transition ${isSelected ? 'opacity-100 translate-x-0.5' : 'opacity-0'}`} />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <span>Navigate with <kbd className="font-mono bg-white dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">↑</kbd> <kbd className="font-mono bg-white dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">↓</kbd></span>
            <span>Select with <kbd className="font-mono bg-white dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">↵</kbd></span>
          </div>
          <span className="font-medium text-orange-600 dark:text-orange-400">EdgeWForce OS</span>
        </div>
      </div>
    </div>
  );
}
