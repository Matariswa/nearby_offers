"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export interface SidebarLink {
  label: string;
  href: string;
  icon?: string;
}

interface SidebarProps {
  title: string;
  links: SidebarLink[];
}

export function Sidebar({ title, links }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-full shrink-0 lg:w-64">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="mb-4 px-3 text-xs font-semibold tracking-wider text-slate-400 uppercase">
          {title}
        </p>
        <nav className="space-y-1">
          {links.map((link) => {
            const isActive =
              pathname === link.href ||
              (link.href !== "/" && pathname.startsWith(link.href));

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                )}
              >
                {link.icon && (
                  <span className="text-base" aria-hidden="true">
                    {link.icon}
                  </span>
                )}
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
