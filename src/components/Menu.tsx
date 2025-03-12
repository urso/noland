"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';

interface MenuItemProps {
  href: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  isCollapsed: boolean;
}

export function MenuItem({ href, icon: Icon, children, isCollapsed }: MenuItemProps) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Button
      variant={isActive ? 'secondary' : 'ghost'}
      className="w-full justify-start"
      asChild
    >
      <Link href={href}>
        {Icon && <Icon className="mr-2 h-4 w-4" />}
        {!isCollapsed && children}
      </Link>
    </Button>
  );
}

interface MenuProps {
  children: React.ReactNode;
  isCollapsed: boolean;
}

export function Menu({ children, isCollapsed }: MenuProps) {
  return (
    <nav className="flex-1 p-2">
      <div className="space-y-1">
        {children}
      </div>
    </nav>
  );
} 