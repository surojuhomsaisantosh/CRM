'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users2,
  FolderKanban,
  Inbox,
  BarChart3,
  Sliders,
  ShieldCheck,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Building2,
  UserCheck,
  Loader2
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface SidebarProps {
  isCollapsed: boolean;
  toggleCollapse: () => void;
  onNavigate?: () => void;
  userRole?: string;
  userName?: string;
  userEmail?: string;
  onNavigationStart?: (href: string) => void;
}

export function Sidebar({
  isCollapsed,
  toggleCollapse,
  onNavigate,
  userRole = 'Admin',
  userName = '',
  userEmail = '',
  onNavigationStart,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [pendingHref, setPendingHref] = React.useState<string | null>(null);

  React.useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  const navItems = [
    {
      title: 'Dashboard',
      href: '/crm',
      icon: LayoutDashboard,
      exact: true,
    },
    {
      title: 'Leads',
      href: '/crm/leads',
      icon: Users2,
    },
    {
      title: 'Projects',
      href: '/crm/projects',
      icon: FolderKanban,
    },
    {
      title: 'Inbox',
      href: '/crm/inbox',
      icon: Inbox,
    },
    {
      title: 'Reports & Analytics',
      href: '/crm/reports',
      icon: BarChart3,
    },
    {
      title: 'Modules & Access',
      href: '/crm/modules',
      icon: Sliders,
    },
    {
      title: 'User Management',
      href: '/crm/users',
      icon: ShieldCheck,
    },
    {
      title: 'Settings',
      href: '/crm/settings',
      icon: Settings,
    },
  ];

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success('Logged out successfully');
      router.push('/crm/login');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Error signing out');
    }
  };

  const companyName = process.env.NEXT_PUBLIC_COMPANY_NAME || 'Universal';

  return (
    <aside
      className={`relative flex flex-col h-full bg-white border-r border-[#e8ecf2] shadow-sm select-none transition-all duration-300 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div
        className={`flex items-center ${
          isCollapsed ? 'justify-between px-2.5' : 'justify-between px-4'
        } h-16 border-b border-[#e8ecf2]`}
      >
        <Link
          href="/crm"
          onClick={onNavigate}
          className="flex items-center shrink-0 transition-opacity hover:opacity-90"
        >
          <span
            className={`${
              isCollapsed ? 'text-sm' : 'text-xl'
            } font-black tracking-tight text-black whitespace-nowrap shrink-0`}
          >
            CRM
          </span>
        </Link>

        {/* Collapse toggle button for desktop */}
        <button
          onClick={toggleCollapse}
          className="hidden md:flex items-center justify-center w-6 h-6 rounded-lg text-[#5a6a82] hover:text-[#0f1d33] hover:bg-[#f3f5f8] transition-colors shrink-0"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname?.startsWith(`${item.href}/`);
          const isPending = pendingHref === item.href && !isActive;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              onClick={() => {
                if (pathname !== item.href) {
                  setPendingHref(item.href);
                  if (onNavigationStart) onNavigationStart(item.href);
                }
                if (onNavigate) onNavigate();
              }}
              title={isCollapsed ? item.title : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-[#0f1d33] text-white shadow-sm'
                  : isPending
                  ? 'bg-[#0f1d33]/85 text-white shadow-xs ring-1 ring-[#c4a55a]/40'
                  : 'text-[#5a6a82] hover:bg-[#f3f5f8] hover:text-[#0f1d33]'
              }`}
            >
              {isPending ? (
                <Loader2 className="w-5 h-5 shrink-0 animate-spin text-[#c4a55a]" />
              ) : (
                <Icon
                  className={`w-5 h-5 shrink-0 ${
                    isActive ? 'text-[#c4a55a]' : 'text-[#7a8b9e]'
                  }`}
                />
              )}
              {!isCollapsed && (
                <div className="flex items-center justify-between flex-1 min-w-0">
                  <span className="truncate">{item.title}</span>
                  {isPending && (
                    <span className="text-[10px] font-bold tracking-wider text-[#c4a55a] animate-pulse">
                      LOADING...
                    </span>
                  )}
                </div>
              )}
            </Link>
          );
        })}
      </div>

      {/* Footer Profile & Logout */}
      <div className="p-3 border-t border-[#e8ecf2] bg-[#fafbfc]">
        {isCollapsed ? (
          <div className="flex flex-col items-center gap-2">
            <div
              className="flex items-center justify-center w-9 h-9 rounded-full bg-[#0f1d33] text-white font-bold text-xs shrink-0 shadow-xs"
              title={`${userName || userEmail || 'User'} (${userRole})`}
            >
              {userName ? userName.charAt(0).toUpperCase() : (userEmail?.charAt(0).toUpperCase() || 'U')}
            </div>
            <button
              onClick={handleLogout}
              title="Log out"
              className="p-2 text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200/80 rounded-lg transition-colors shrink-0 shadow-2xs cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-red-600" />
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {/* User Profile Card */}
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white border border-[#e8ecf2] shadow-2xs">
              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-[#0f1d33] text-white font-bold text-xs shrink-0 shadow-xs">
                {userName ? userName.charAt(0).toUpperCase() : (userEmail?.charAt(0).toUpperCase() || 'U')}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span
                  className="text-xs font-bold text-[#0f1d33] truncate"
                  title={userName || userEmail || 'User'}
                >
                  {userName || userEmail?.split('@')[0] || 'User'}
                </span>
                <span className="text-[10px] font-semibold text-[#5a6a82] tracking-wide truncate capitalize">
                  {userRole}
                </span>
              </div>
            </div>

            {/* Logout Button on Separate Line */}
            <button
              onClick={handleLogout}
              title="Log out"
              className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200/80 rounded-xl transition-all shadow-2xs hover:shadow-xs active:scale-[0.99] cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-red-600" />
              <span>Log out</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;
