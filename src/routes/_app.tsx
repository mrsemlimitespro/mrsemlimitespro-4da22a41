import { Outlet, createFileRoute } from "@tanstack/react-router";
import { AppSidebar } from "@/components/app-sidebar";
import { BrandWatermark, BrandDecorations } from "@/components/brand";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { NetworkStatusWatcher } from "@/components/network-status-watcher";
import { PushBootstrapper } from "@/components/push-bootstrapper";
import { MustChangePasswordGuard } from "@/components/must-change-password-guard";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  return (
    <div className="relative min-h-screen w-full bg-background overflow-x-hidden">
      {/* Brand visuals */}
      <BrandWatermark />
      <BrandDecorations />

      <AppSidebar />
      <MustChangePasswordGuard />
      
      <div className="relative z-10 flex min-h-screen flex-col md:pl-[84px]">
        <main className="flex-1 p-4 md:p-8">
          <div key={typeof window !== "undefined" ? window.location.pathname : "ssr"} className="content-in">
            <Outlet />
          </div>
        </main>
        
        <NetworkStatusWatcher />
        <PushBootstrapper />
      </div>
      
      <PwaInstallPrompt />
    </div>
  );
}
