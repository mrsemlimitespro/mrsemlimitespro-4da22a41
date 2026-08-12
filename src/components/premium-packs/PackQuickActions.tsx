// PackQuickActions — menu de ações rápidas por card (Packs Premium).
// Adaptação MR Sem Limites: sem shortcut de admin edit (a área admin ainda
// não existe nesta fase) e sem dependência de `useIsAdminMaster`.
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import {
  MoreVertical,
  ExternalLink,
  Share2,
  Link2,
  QrCode,
  BarChart3,
  Download as DownloadIcon,
  Eye,
  Files,
  Clock,
  TrendingUp,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PremiumPack } from "@/lib/premium-packs/types";
import { formatBytes, formatRelative } from "@/lib/premium-packs/format";
import { cn } from "@/lib/utils";

function fmt(n: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR").format(n ?? 0);
}

export function buildPackPublicUrl(pack: PremiumPack): string {
  const token = (pack as PremiumPack & { public_token?: string | null }).public_token;
  const path = token ? `/p/${pack.slug}-${token}` : `/packs/${pack.slug}`;
  if (typeof window !== "undefined") return `${window.location.origin}${path}`;
  return path;
}

export function PackQuickActions({
  pack,
  onOpen,
}: {
  pack: PremiumPack;
  onOpen: (p: PremiumPack) => void;
}) {
  const [qrOpen, setQrOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const publicUrl = buildPackPublicUrl(pack);

  useEffect(() => {
    if (!qrOpen) return;
    let cancelled = false;
    QRCode.toDataURL(publicUrl, {
      width: 512,
      margin: 1,
      color: { dark: "#0a0a0a", light: "#ffffff" },
      errorCorrectionLevel: "M",
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) toast.error("Falha ao gerar QR Code");
      });
    return () => {
      cancelled = true;
    };
  }, [qrOpen, publicUrl]);

  const copyPublic = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success("Link público copiado", { description: publicUrl });
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  const share = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: pack.nome, url: publicUrl });
      } else {
        await copyPublic();
      }
    } catch {
      /* user cancelled */
    }
  };

  const downloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `qr-${pack.slug}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            aria-label="Mais ações"
            className="grid h-7 w-7 place-items-center rounded-full border border-white/15 bg-black/60 text-white/80 backdrop-blur transition hover:border-ai-300/40 hover:text-ai-50"
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          onClick={(e) => e.stopPropagation()}
          className="w-56 border-ai-300/20 bg-black/90 text-white backdrop-blur"
        >
          <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.24em] text-ai-200/80">
            Pack · {pack.categoria || "Premium"}
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-white/10" />
          <DropdownMenuItem onClick={() => onOpen(pack)} className="gap-2 focus:bg-ai-500/15">
            <ExternalLink className="h-4 w-4" /> Abrir Pack
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => share()} className="gap-2 focus:bg-ai-500/15">
            <Share2 className="h-4 w-4" /> Compartilhar
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => copyPublic()} className="gap-2 focus:bg-ai-500/15">
            <Link2 className="h-4 w-4" /> Copiar Link Público
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setQrOpen(true)} className="gap-2 focus:bg-ai-500/15">
            <QrCode className="h-4 w-4" /> Gerar QR Code
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setStatsOpen(true)} className="gap-2 focus:bg-ai-500/15">
            <BarChart3 className="h-4 w-4" /> Estatísticas
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="border-ai-300/20 bg-gradient-to-br from-black via-black to-ai-500/[0.06] text-white sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <QrCode className="h-4 w-4 text-ai-200" /> QR Code do Pack
            </DialogTitle>
            <DialogDescription className="text-xs text-white/55">
              Use este QR Code em Kiwify, Hotmart, Eduzz, Mercado Pago, materiais impressos e
              divulgação.
            </DialogDescription>
          </DialogHeader>
          <div className="grid place-items-center py-2">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR Code ${pack.nome}`}
                className="h-64 w-64 rounded-xl border border-ai-300/25 bg-white p-2 shadow-[0_0_40px_-12px_var(--ai-500)]"
              />
            ) : (
              <div className="h-64 w-64 animate-pulse rounded-xl border border-white/10 bg-white/[0.04]" />
            )}
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] font-mono break-all text-white/80">
            {publicUrl}
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <button
              type="button"
              onClick={copyPublic}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white/85 transition hover:border-ai-300/50 hover:text-ai-50"
            >
              <Link2 className="h-3.5 w-3.5" /> Copiar link
            </button>
            <button
              type="button"
              onClick={downloadQr}
              disabled={!qrDataUrl}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-ai-300/40 bg-gradient-to-r from-ai-500/25 to-ai-400/10 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-ai-50 transition hover:border-ai-300/70 disabled:opacity-50"
            >
              <DownloadIcon className="h-3.5 w-3.5" /> Baixar PNG
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={statsOpen} onOpenChange={setStatsOpen}>
        <DialogContent className="border-ai-300/20 bg-gradient-to-br from-black via-black to-ai-500/[0.06] text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-ai-200" /> Estatísticas
            </DialogTitle>
            <DialogDescription className="text-xs text-white/55">{pack.nome}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <StatBox icon={DownloadIcon} label="Downloads" value={fmt(pack.downloads)} />
            <StatBox icon={Eye} label="Visualizações" value={fmt(pack.views)} />
            <StatBox icon={TrendingUp} label="Popularidade" value={fmt(pack.popularidade)} />
            <StatBox icon={Files} label="Arquivos" value={fmt(pack.qtd_arquivos)} />
            <StatBox icon={Files} label="Espaço" value={formatBytes(pack.espaco_bytes)} />
            <StatBox
              icon={Clock}
              label="Atualizado"
              value={formatRelative(pack.ultima_atualizacao)}
            />
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] text-white/65">
            <div className="font-bold uppercase tracking-[0.2em] text-ai-200/80">
              Link público fixo
            </div>
            <div className="mt-1 font-mono break-all text-white/85">{publicUrl}</div>
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={copyPublic}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-ai-300/40 bg-gradient-to-r from-ai-500/20 to-ai-400/10 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-ai-50 transition hover:border-ai-300/70"
            >
              <Link2 className="h-3.5 w-3.5" /> Copiar Link Público
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function StatBox({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className={cn("rounded-xl border border-ai-300/15 bg-black/40 px-3 py-2.5")}>
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-ai-500/30 to-ai-400/15 text-ai-100 shadow-[0_0_18px_-8px_var(--ai-500)]">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <div className="truncate text-[9px] font-bold uppercase tracking-[0.22em] text-white/45">
            {label}
          </div>
          <div className="truncate text-sm font-semibold text-white">{value}</div>
        </div>
      </div>
    </div>
  );
}
