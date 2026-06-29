import { Sidebar, type SidebarLink } from "@/components/layout/Sidebar";

interface DashboardLayoutProps {
  title: string;
  description: string;
  sidebarTitle: string;
  links: SidebarLink[];
  children: React.ReactNode;
}

export function DashboardLayout({
  title,
  description,
  sidebarTitle,
  links,
  children,
}: DashboardLayoutProps) {
  return (
    <div className="container-app py-8 lg:py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          {title}
        </h1>
        <p className="mt-2 text-slate-600">{description}</p>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row">
        <Sidebar title={sidebarTitle} links={links} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
