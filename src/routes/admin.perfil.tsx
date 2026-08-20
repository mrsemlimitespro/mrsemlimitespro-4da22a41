import { createFileRoute } from "@tanstack/react-router";
import { ChangePasswordTab } from "@/components/admin/change-password-tab";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/admin/perfil")({
  component: AdminPerfilPage,
});

function AdminPerfilPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="space-y-1">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Ultra Admin</div>
        <h1 className="flex items-center gap-3 text-3xl font-semibold tracking-tight md:text-4xl">
          <ShieldCheck className="size-7 text-primary" />
          <span className="gradient-text-warm">Segurança do Perfil</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Gerencie suas credenciais de acesso e configurações de segurança.
        </p>
      </header>

      <div className="pt-4">
        <ChangePasswordTab />
      </div>
    </div>
  );
}
