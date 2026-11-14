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
  UserCheck
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { BrandLogo } from '@/app/crm/settings/brand-settings/BrandLogo';

interface SidebarProps {
  isCollapsed: boolean;
  toggleCollapse: () => void;
  onNavigate?: () => void;
  userRole?: string;
  userName?: string;
  userEmail?: string;
}

export function Sidebar({
  isCollapsed,
  toggleCollapse,
  onNavigate,
  userRole = 'Admin',
  userName = '',
  userEmail = '',
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const navItems = [
    {
      title: 'Dashboard',
      href: '/crm',
      icon: LayoutDashboard,
      exact: true,
    },
    {
      title: 'Leads Pipeline',
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
      href: '/crm/whatsapp',
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
      <div className="flex items-center justify-between h-16 px-4 border-b border-[#e8ecf2]">
        <Link
          href="/crm"
          onClick={onNavigate}
          className="flex items-center gap-2.5 overflow-hidden transition-opacity hover:opacity-90"
        >
          <BrandLogo size="md" />
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-base font-bold tracking-tight text-[#0f1d33] truncate">
                C<span className="text-[#c4a55a]">RM</span>
              </span>
              <span className="text-[10px] uppercase font-semibold text-[#8a99ad] tracking-wider">
                Enterprise Hub
              </span>
            </div>
          )}
        </Link>

        {/* Collapse toggle button for desktop */}
        <button
          onClick={toggleCollapse}
          className="hidden md:flex items-center justify-center w-7 h-7 rounded-lg text-[#5a6a82] hover:text-[#0f1d33] hover:bg-[#f3f5f8] transition-colors"
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
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              title={isCollapsed ? item.title : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-[#0f1d33] text-white shadow-sm'
                  : 'text-[#5a6a82] hover:bg-[#f3f5f8] hover:text-[#0f1d33]'
              }`}
            >
              <Icon
                className={`w-5 h-5 shrink-0 ${
                  isActive ? 'text-[#c4a55a]' : 'text-[#7a8b9e]'
                }`}
              />
              {!isCollapsed && <span className="truncate">{item.title}</span>}
            </Link>
          );
        })}
      </div>

      {/* Footer Profile & Logout */}
      <div className="p-3 border-t border-[#e8ecf2] bg-[#fafbfc]">
        {isCollapsed ? (
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#eef2f7] text-[#0f1d33] font-bold text-xs shrink-0" title={userName || userEmail || 'User'}>
              {userName ? userName.charAt(0).toUpperCase() : (userEmail?.charAt(0).toUpperCase() || 'U')}
            </div>
            <button
              onClick={handleLogout}
              title="Log out"
              className="p-1.5 text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200/80 rounded-md transition-colors shrink-0 shadow-2xs"
            >
              <LogOut className="w-4 h-4 text-red-600" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 p-2 rounded-lg bg-white border border-[#e8ecf2]">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#eef2f7] text-[#0f1d33] font-bold text-xs shrink-0">
                {userName ? userName.charAt(0).toUpperCase() : (userEmail?.charAt(0).toUpperCase() || 'U')}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-[#0f1d33] truncate">
                  {userName || userEmail?.split('@')[0] || 'User'}
                </span>
                <span className="text-[10px] text-[#8a99ad] truncate capitalize">
                  {userRole}
                </span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              title="Log out"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors shrink-0 shadow-2xs"
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
