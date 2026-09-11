import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AppHeader } from "@/components/AppHeader";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getImportConfigForPath } from "@/config/importacoes";
import {
  getImportReviewQueue,
  hasActiveImportReviewQueue,
} from "@/lib/importReviewQueue";
import { ModulePermissionProvider } from "@/contexts/ModulePermissionContext";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const config = getImportConfigForPath(pathname);
    if (!config || pathname !== config.routes[0]) return;

    const queue = getImportReviewQueue(config.module);
    if (
      !queue?.resumeAfterSave ||
      !queue.createRoute ||
      queue.createRoute === pathname
    ) {
      return;
    }

    navigate(queue.createRoute, { replace: true });
  }, [navigate, pathname]);

  useEffect(() => {
    const warnAboutQueue = (event: BeforeUnloadEvent) => {
      if (!hasActiveImportReviewQueue()) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", warnAboutQueue);
    return () => window.removeEventListener("beforeunload", warnAboutQueue);
  }, []);

  return (
    <ModulePermissionProvider>
      <SidebarProvider>
        <div className="flex min-h-screen w-full flex-col bg-background">
          <AppHeader />
          <div className="flex min-h-0 w-full flex-1">
            <AppSidebar />
            <main className="min-w-0 flex-1 overflow-x-hidden bg-background">
              <Breadcrumbs />
              {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
    </ModulePermissionProvider>
  );
}
