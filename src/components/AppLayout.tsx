import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AppHeader } from "@/components/AppHeader";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getImportConfigForPath } from "@/config/importacoes";
import { getImportReviewQueue, hasActiveImportReviewQueue } from "@/lib/importReviewQueue";

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
    if (!queue?.resumeAfterSave || !queue.createRoute || queue.createRoute === pathname) return;
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
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <AppHeader />
          <main className="flex-1 overflow-y-auto bg-background">
            <Breadcrumbs />
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
