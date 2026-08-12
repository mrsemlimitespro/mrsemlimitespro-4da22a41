import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, ShieldCheck, Lock, KeyRound, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const GATE_KEY = "mr_admin_gate";

export function adminGatePassed(): boolean {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(GATE_KEY) === "1";
}

export function clearAdminGate() {
  if (typeof window !== "undefined") window.sessionStorage.removeItem(GATE_KEY);
}

export function AdminPasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (!open) return;
    let active = true;
    (async () => {
      const { data } = await (supabase as any).rpc("admin_password_configured");
      if (active) setNeedsSetup(data === false);
    })();
    return () => {
      active = false;
    };
  }, [open]);

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { data, error } = await (supabase as any).rpc("verify_admin_password", {
        _password: password,
      });
      if (error) throw error;
      if (!data) {
        const { data: configured } = await (supabase as any).rpc("admin_password_configured");
        if (configured === false) {
          setNeedsSetup(true);
          toast.message("Cadastre a senha inicial do administrador.");
          return;
        }
        toast.error("Senha incorreta ou senha ainda não configurada.");
        return;
      }
      window.sessionStorage.setItem(GATE_KEY, "1");
      toast.success("Painel desbloqueado");
      onOpenChange(false);
      setPassword("");
      navigate({ to: "/admin" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao verificar senha");
    } finally {
      setBusy(false);
    }
  }

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 4) {
      toast.error("Senha muito curta (mínimo 4 caracteres).");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await (supabase as any).rpc("set_admin_password", {
        _new_password: newPassword,
        _current_password: null,
      });
      if (error) throw error;
      window.sessionStorage.setItem(GATE_KEY, "1");
      toast.success("Senha definida. Painel liberado.");
      onOpenChange(false);
      setNewPassword("");
      setConfirmPassword("");
      setNeedsSetup(false);
      navigate({ to: "/admin" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao definir senha";
      if (msg.toLowerCase().includes("senha atual")) {
        toast.error("Já existe uma senha configurada. Use a senha para entrar.");
        setNeedsSetup(false);
      } else {
        toast.error(msg);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-2 flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl gradient-primary">
              <ShieldCheck className="size-5 text-white" strokeWidth={2.2} />
            </span>
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Área restrita
              </div>
              <DialogTitle className="text-xl font-semibold tracking-tight">
                Painel <span className="gradient-text-warm">Administrativo</span>
              </DialogTitle>
            </div>
          </div>
          <DialogDescription>
            {needsSetup
              ? "Nenhuma senha foi definida ainda. Cadastre a senha do administrador para desbloquear o painel."
              : "Informe a senha de administrador para acessar o painel de controle."}
          </DialogDescription>
        </DialogHeader>

        {needsSetup ? (
          <form onSubmit={handleSetup} className="space-y-4">
            <div>
              <Label htmlFor="new-pass">Nova senha</Label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="new-pass"
                  type={showNewPassword ? "text" : "password"}
                  className="pl-9 pr-10"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  minLength={4}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label htmlFor="confirm-pass">Confirmar senha</Label>
              <Input
                id="confirm-pass"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
                minLength={4}
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setNeedsSetup(false)}>
                Voltar
              </Button>
              <Button type="submit" className="flex-1 gradient-primary" disabled={busy}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : "Definir senha e entrar"}
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <Label htmlFor="admin-pass">Senha</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="admin-pass"
                  type={showPassword ? "text" : "password"}
                  className="pl-9 pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  autoFocus
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full gradient-primary" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : "Desbloquear painel"}
            </Button>
            <button
              type="button"
              onClick={() => setNeedsSetup(true)}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
            >
              Primeira vez? <span className="underline">Definir senha inicial</span>
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
