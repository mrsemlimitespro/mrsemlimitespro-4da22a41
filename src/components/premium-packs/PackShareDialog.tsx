/**
 * PackShareDialog — Share Center simplificado para o MR Sem Limites.
 *
 * Adaptação: removidas as dependências de `share-center/logs.functions` e
 * `useCanShare` (o Share Center completo do origem não existe aqui).
 * Mantém:
 *  - Link permanente + link temporário assinado (mintTempShareToken)
 *  - Canais sociais (WhatsApp, Telegram, Facebook, X, Email, Copy)
 *  - QR Code
 */
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { mintTempShareToken } from "@/lib/premium-packs/share-tokens.functions";
import { useServerFn } from "@tanstack/react-start";
import {
  Copy,
  Check,
  Link as LinkIcon,
  QrCode,
  Mail,
  Send,
  MessageCircle,
  Clock,
  Infinity as InfinityIcon,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pack: {
    id: string;
    slug: string;
    nome: string;
    descricao_curta: string | null;
    capa_url: string | null;
    is_shareable: boolean;
  };
  baseUrl: string;
};

type Expiry = "1h" | "24h" | "7d" | "30d";

const EXPIRY_MS: Record<Expiry, number> = {
  "1h": 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

const EXPIRY_LABEL: Record<Expiry, string> = {
  "1h": "1 hora",
  "24h": "24 horas",
  "7d": "7 dias",
  "30d": "30 dias",
};

type ShareChannel = "whatsapp" | "telegram" | "facebook" | "x" | "email" | "copy-link";

export function PackShareDialog({ open, onOpenChange, pack, baseUrl }: Props) {
  const [expiry, setExpiry] = useState<Expiry>("24h");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [tempUrl, setTempUrl] = useState<string>("");
  const [tempMinting, setTempMinting] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const mint = useServerFn(mintTempShareToken);

  const permanentUrl = baseUrl;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setTempMinting(true);
    setTempUrl("");
    mint({ data: { slug: pack.slug, ttlMs: EXPIRY_MS[expiry] } })
      .then((res) => {
        if (cancelled) return;
        const u = new URL(baseUrl);
        u.searchParams.set("share", "tmp");
        u.searchParams.set("t", res.token);
        u.searchParams.set("exp", String(res.exp));
        setTempUrl(u.toString());
      })
      .catch(() => {
        if (!cancelled) setTempUrl("");
      })
      .finally(() => {
        if (!cancelled) setTempMinting(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, expiry, baseUrl, pack.slug, mint]);

  useEffect(() => {
    if (!open) return;
    QRCode.toDataURL(permanentUrl, { width: 320, margin: 1 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [open, permanentUrl]);

  function copy(url: string, key: string) {
    return navigator.clipboard.writeText(url).then(
      () => {
        toast.success("Link copiado");
        setCopiedKey(key);
        setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 2200);
      },
      () => toast.error("Falha ao copiar"),
    );
  }

  function openInNew(href: string) {
    if (typeof window === "undefined") return;
    window.open(href, "_blank", "noopener,noreferrer");
  }

  function shareSocial(channel: ShareChannel, url: string) {
    const title = pack.nome;
    const desc = pack.descricao_curta ?? "Confira este pack premium";
    const enc = encodeURIComponent;
    const map: Record<string, string> = {
      whatsapp: `https://wa.me/?text=${enc(`${title} — ${desc}\n${url}`)}`,
      telegram: `https://t.me/share/url?url=${enc(url)}&text=${enc(`${title} — ${desc}`)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`,
      x: `https://twitter.com/intent/tweet?text=${enc(`${title} — ${desc}`)}&url=${enc(url)}`,
      email: `mailto:?subject=${enc(title)}&body=${enc(`${desc}\n\n${url}`)}`,
    };
    const href = map[channel];
    if (href) openInNew(href);
  }

  const blocked = !pack.is_shareable;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-ai-300/20 bg-gradient-to-br from-black via-black to-ai-500/[0.06] text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5 text-ai-200" />
            Compartilhar Pack
          </DialogTitle>
          <DialogDescription className="text-white/55">{pack.nome}</DialogDescription>
        </DialogHeader>

        {blocked && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-100">
            <ShieldAlert className="mt-0.5 h-4 w-4 flex-none" />
            <div>Este pack está marcado como não compartilhável.</div>
          </div>
        )}

        <Tabs defaultValue="links" className="mt-2">
          <TabsList className="w-full justify-start border border-white/10 bg-white/[0.03]">
            <TabsTrigger value="links">Links</TabsTrigger>
            <TabsTrigger value="canais">Canais</TabsTrigger>
            <TabsTrigger value="qr">QR Code</TabsTrigger>
          </TabsList>

          <TabsContent value="links" className="mt-4 space-y-4">
            <Section
              icon={InfinityIcon}
              title="Link Permanente"
              description="Disponível enquanto o pack permanecer público."
            >
              <UrlRow
                url={permanentUrl}
                copied={copiedKey === "perm-copy"}
                disabled={blocked}
                onCopy={() => copy(permanentUrl, "perm-copy")}
              />
            </Section>

            <Section
              icon={Clock}
              title="Link Temporário"
              description="Expira automaticamente após o tempo escolhido."
            >
              <div className="mb-3 flex flex-wrap gap-2">
                {(Object.keys(EXPIRY_LABEL) as Expiry[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setExpiry(k)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs transition-colors",
                      expiry === k
                        ? "border-ai-300/60 bg-ai-500/15 text-ai-50"
                        : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10",
                    )}
                  >
                    {EXPIRY_LABEL[k]}
                  </button>
                ))}
              </div>
              <UrlRow
                url={tempMinting ? "Gerando link assinado…" : tempUrl}
                copied={copiedKey === "temp-copy"}
                disabled={blocked || tempMinting || !tempUrl}
                onCopy={() => tempUrl && copy(tempUrl, "temp-copy")}
              />
              <p className="mt-2 text-[11px] text-white/50">Expira em {EXPIRY_LABEL[expiry]}.</p>
            </Section>
          </TabsContent>

          <TabsContent value="canais" className="mt-4">
            <p className="mb-3 text-xs text-white/60">Compartilhe usando o link permanente.</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <ChannelBtn
                label="WhatsApp"
                icon={MessageCircle}
                tone="text-emerald-300"
                onClick={() => shareSocial("whatsapp", permanentUrl)}
                disabled={blocked}
              />
              <ChannelBtn
                label="Telegram"
                icon={Send}
                tone="text-sky-300"
                onClick={() => shareSocial("telegram", permanentUrl)}
                disabled={blocked}
              />
              <ChannelBtn
                label="Facebook"
                icon={FacebookIcon}
                tone="text-blue-300"
                onClick={() => shareSocial("facebook", permanentUrl)}
                disabled={blocked}
              />
              <ChannelBtn
                label="X"
                icon={XIcon}
                tone="text-white"
                onClick={() => shareSocial("x", permanentUrl)}
                disabled={blocked}
              />
              <ChannelBtn
                label="Email"
                icon={Mail}
                tone="text-amber-200"
                onClick={() => shareSocial("email", permanentUrl)}
                disabled={blocked}
              />
              <ChannelBtn
                label="Copiar Link"
                icon={Copy}
                tone="text-ai-200"
                onClick={() => copy(permanentUrl, "perm-copy")}
                disabled={blocked}
              />
            </div>
          </TabsContent>

          <TabsContent value="qr" className="mt-4">
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
              <div className="rounded-2xl border border-white/10 bg-white p-3">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="QR Code do pack"
                    width={200}
                    height={200}
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="h-[200px] w-[200px] animate-pulse bg-white/70" />
                )}
              </div>
              <p className="text-xs text-white/60">Aponte a câmera para abrir o pack.</p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/10 bg-white/5 text-white/90 hover:bg-white/10"
                  onClick={() => qrDataUrl && openInNew(qrDataUrl)}
                  disabled={blocked || !qrDataUrl}
                >
                  <QrCode className="mr-2 h-4 w-4" /> Abrir QR
                </Button>
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-ai-500 to-ai-400 hover:opacity-90"
                  onClick={() => copy(permanentUrl, "perm-copy")}
                  disabled={blocked}
                >
                  <Copy className="mr-2 h-4 w-4" /> Copiar Link
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <Separator className="my-2 bg-white/10" />
        <p className="text-[11px] text-white/40">
          Links temporários são assinados no servidor e expiram automaticamente.
        </p>
      </DialogContent>
    </Dialog>
  );
}

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Clock;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 flex items-start gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-ai-500/15 text-ai-200">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <Label className="text-sm font-medium text-white">{title}</Label>
          <p className="text-[11px] text-white/55">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function UrlRow({
  url,
  copied,
  disabled,
  onCopy,
}: {
  url: string;
  copied: boolean;
  disabled: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Input
        readOnly
        value={url}
        className="h-9 border-white/10 bg-black/40 text-xs text-white/80"
        onFocus={(e) => e.currentTarget.select()}
      />
      <Button
        size="sm"
        onClick={onCopy}
        disabled={disabled}
        className="bg-gradient-to-r from-ai-500 to-ai-400 hover:opacity-90 text-black"
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        <span className="ml-2 hidden sm:inline">{copied ? "Copiado" : "Copiar"}</span>
      </Button>
    </div>
  );
}

type IconCmp = React.ComponentType<{ className?: string }>;

function ChannelBtn({
  label,
  icon: Icon,
  tone,
  onClick,
  disabled,
}: {
  label: string;
  icon: IconCmp;
  tone: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white/90 transition-all",
        "hover:border-white/20 hover:bg-white/10 hover:text-white",
        "disabled:cursor-not-allowed disabled:opacity-50",
      )}
    >
      <Icon className={cn("h-4 w-4", tone)} />
      {label}
    </button>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.5-1.5H17V4.5c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.3H7.7v3h2.6V21h3.2z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.6 3H21l-7.5 8.6L22 21h-6.8l-5.3-6.9L3.6 21H.2l8-9.2L0 3h6.9l4.8 6.4L17.6 3zm-2.4 16.2h1.9L6.9 4.7H4.9l10.3 14.5z" />
    </svg>
  );
}
