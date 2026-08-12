import { Outlet, createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

import { AppSidebar } from "@/components/app-sidebar";
import { InnerPillMenu } from "@/components/inner-pill-menu";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { TopBar } from "@/components/top-bar";
import { FirePromosButton } from "@/components/fire-promos-button";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { WatermarkFooter } from "@/components/watermark-footer";
import { PageBackButton } from "@/components/page-back-button";
import { NetworkStatusWatcher } from "@/components/network-status-watcher";
import { PushBootstrapper } from "@/components/push-bootstrapper";
import { WhatsappZapButton } from "@/components/whatsapp-zap-button";
import { InstagramFollowButton } from "@/components/instagram-follow-button";
import { ImpersonationBanner } from "@/components/impersonation-banner";
import { MustChangePasswordGuard } from "@/components/must-change-password-guard";

// Decorativo: canvas de partículas só monta em telas médias+ (evita CPU/bateria no mobile).
const SoftParticles = lazy(() =>
  import("@/components/soft-particles").then((m) => ({ default: m.SoftParticles })),
);

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  return (
    <div className="relative min-h-screen w-full">
      {/* Partículas só em telas >= md para preservar performance em mobile */}
      <div className="pointer-events-none absolute inset-0 z-0 hidden md:block">
        <Suspense fallback={null}>
          <SoftParticles />
        </Suspense>
      </div>
      <AppSidebar />
      <ImpersonationBanner />
      <MustChangePasswordGuard />
      <div
        className="relative z-10 flex min-h-screen flex-col pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] pt-[calc(0.5rem+env(safe-area-inset-top))] md:pl-[calc(5rem+env(safe-area-inset-left))] md:pt-[calc(1rem+env(safe-area-inset-top))]"
      >

        <TopBar />
        <main
          className="flex-1 px-3 pt-4 md:px-8 md:pt-6"
          style={{
            paddingBottom:
              "calc(5.5rem + env(safe-area-inset-bottom))" /* espaço p/ bottom nav 56px + safe area */,
          }}
        >
          <div className="mb-3 md:mb-4">
            <PageBackButton />
          </div>
          <div key={typeof window !== "undefined" ? window.location.pathname : "ssr"} className="content-in">
            <Outlet />
          </div>

        </main>
        <NetworkStatusWatcher />
        <PushBootstrapper />
      </div>
      <FirePromosButton />
      <WhatsappZapButton />
      <InstagramFollowButton />
      <InnerPillMenu />
      <MobileBottomNav />
      <PwaInstallPrompt />
      <WatermarkFooter />
    </div>
  );
}
