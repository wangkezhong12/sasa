'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { MessageSquare, Settings, LayoutGrid, Plug } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const navItems = [
  { href: '/chat', label: '对话', icon: MessageSquare },
  { href: '/saas', label: 'SaaS 管理', icon: Plug },
  { href: '/workspace', label: '工作空间', icon: LayoutGrid },
  { href: '/settings', label: '设置', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-60 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 items-center px-4 font-semibold text-lg">
        Sasa
      </div>
      <Separator />
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground',
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <Separator />
      <div className="p-3 text-xs text-muted-foreground">
        Sasa AI Agent v0.1
      </div>
    </aside>
  );
}
