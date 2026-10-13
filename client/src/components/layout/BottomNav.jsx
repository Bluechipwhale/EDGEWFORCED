import React from 'react';
import {
  MapPin,
  Building2,
  Users,
  Truck,
  WalletCards,
  AlertTriangle,
  ShieldAlert,
  ClipboardCheck,
  LayoutDashboard,
  Clock
} from 'lucide-react';

export default function BottomNav({ user, currentTab, onSelectTab }) {
  const role = user?.role_code;
  const isAgent = role === 'FIELD_AGENT' || role === 'SALES_AGENT' || role === 'BRAND_AMBASSADOR' || role === 'PROMOTER';

  let items = [];

  if (isAgent) {
    // 5 primary items on mobile from the 8 approved Agent menu items
    items = [
      { id: 'manifest', label: 'Routes', icon: MapPin },
      { id: 'customers', label: 'Directory', icon: Users },
      { id: 'delivery', label: 'Fleet', icon: Truck },
      { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
      { id: 'safety', label: 'SOS', icon: ShieldAlert, danger: true }
    ];
  } else if (['HR', 'HR_MANAGER', 'CEO', 'CTO', 'MANAGER', 'SUPER_ADMIN', 'ADMIN'].includes(role) || ['CEO', 'CTO', 'HR'].includes(user?.rank?.code)) {
    items = [
      { id: 'command_center', label: 'Command', icon: LayoutDashboard },
      { id: 'supervisor_dashboard', label: 'Radar', icon: MapPin },
      { id: 'people', label: 'Staff', icon: Users },
      { id: 'safety', label: 'SOS Queue', icon: ShieldAlert }
    ];
  } else {
    items = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'attendance', label: 'Timesheet', icon: Clock },
      { id: 'tasks', label: 'Tasks', icon: ClipboardCheck },
      { id: 'profile', label: 'Profile', icon: Users }
    ];
  }

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 topbar-surface backdrop-blur-lg border-t border-zinc-200 dark:border-zinc-800 px-2 py-1.5 flex items-center justify-around">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = currentTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onSelectTab(item.id)}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-lg text-[10px] font-bold transition ${
              item.danger
                ? 'text-rose-500 hover:text-rose-600'
                : isActive
                ? 'text-orange-600 dark:text-orange-400'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <Icon size={18} className={isActive ? 'scale-110 transition-transform' : ''} />
            <span className="mt-0.5">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
