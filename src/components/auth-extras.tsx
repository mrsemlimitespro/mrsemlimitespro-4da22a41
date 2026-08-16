import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { inputCls } from "@/routes/login";

export function PasswordInput({
  value,
  onChange,
  autoComplete = "current-password",
  minLength = 6,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  minLength?: number;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        required
        type={show ? "text" : "password"}
        minLength={minLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={inputCls + " pr-10"}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Ocultar senha" : "Mostrar senha"}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

export function SocialSignIn({ mode = "signin" }: { mode?: "signin" | "signup" }) {
  const [busy, setBusy] = useState<"google" | "apple" | null>(null);

  async function go(provider: "google" | "apple") {
    setBusy(provider);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error(result.error.message ?? "Falha no login social");
        setBusy(null);
        return;
      }
      if (result.redirected) return;
      window.location.href = "/";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha no login social");
      setBusy(null);
    }
  }

  const label = mode === "signup" ? "Cadastrar com" : "Entrar com";

  return (
    <div className="space-y-2">
      <div className="relative my-2 flex items-center gap-3">
        <div className="h-px flex-1 bg-border/60" />
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">ou</span>
        <div className="h-px flex-1 bg-border/60" />
      </div>
      <button
        type="button"
        disabled={busy !== null}
        onClick={() => go("google")}
        className="flex w-full items-center justify-center gap-2.5 rounded-full border border-border/70 bg-surface/60 px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-surface disabled:opacity-60"
      >
        <GoogleIcon /> {label} Google
      </button>
      <button
        type="button"
        disabled={busy !== null}
        onClick={() => go("apple")}
        className="flex w-full items-center justify-center gap-2.5 rounded-full border border-border/70 bg-black/70 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-black disabled:opacity-60"
      >
        <AppleIcon /> {label} Apple
      </button>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.9 3.4 14.7 2.4 12 2.4 6.7 2.4 2.5 6.6 2.5 12S6.7 21.6 12 21.6c6.9 0 9.5-4.8 9.5-8.4 0-.6-.1-1-.1-1.4H12z"
      />
    </svg>
  );
}
function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden>
      <path d="M16.4 12.6c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.5-.2-2.8.8-3.6.8-.8 0-1.9-.8-3.1-.8-1.6 0-3.1.9-3.9 2.4-1.7 2.9-.4 7.2 1.2 9.5.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.8 3.1-.8s1.9.8 3.1.7c1.3 0 2.1-1.1 2.9-2.3.9-1.3 1.3-2.6 1.3-2.7-.1 0-2.5-.9-2.5-3.8zM14 4.9c.7-.8 1.1-1.9 1-3-1 .1-2.1.7-2.8 1.5-.6.7-1.2 1.8-1 2.9 1.1.1 2.2-.6 2.8-1.4z" />
    </svg>
  );
}
