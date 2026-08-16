import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, FileArchive, Loader2, Save, Upload, X } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/admin/configuracoes")({
  component: ConfiguracoesPage,
});

type Settings = {
  id: string;
  site_name: string;
  logo_url: string | null;
  favicon_url: string | null;
  welcome_text: string | null;
  footer_text: string | null;
  notification_message: string | null;
  notification_active: boolean;
  primary_color: string;
  accent_color: string;
  extension_url: string | null;
  extension_filename: string | null;
};

function ConfiguracoesPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("admin_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as Settings | null;
    },
  });

  const [values, setValues] = useState<Partial<Settings>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data) setValues(data);
  }, [data]);

  async function save() {
    if (!data?.id) return;
    setBusy(true);
    try {
      const { error } = await (supabase as any)
        .from("admin_settings")
        .update({
          site_name: values.site_name ?? "MR Lova",
          logo_url: values.logo_url || null,
          favicon_url: values.favicon_url || null,
          welcome_text: values.welcome_text || null,
          footer_text: values.footer_text || null,
          notification_message: values.notification_message || null,
          notification_active: !!values.notification_active,
          extension_url: values.extension_url || null,
          extension_filename: values.extension_filename || null,
          link_comunidade: (values as any).link_comunidade || null,
          email_link_portal: (values as any).email_link_portal || null,
          email_link_suporte: (values as any).email_link_suporte || null,
          email_link_manual: (values as any).email_link_manual || null,
          email_link_download: (values as any).email_link_download || null,
          email_remetente_nome: (values as any).email_remetente_nome || null,
          email_enabled: !!(values as any).email_enabled,
          email_from: (values as any).email_from || null,
          painel_revendedor_valor: (values as any).painel_revendedor_valor ?? 29.90,
          kiwify_checkout_url_revendedor: (values as any).kiwify_checkout_url_revendedor || null,
          kiwify_produto_revendedor_ref: (values as any).kiwify_produto_revendedor_ref || null,
        })
        .eq("id", data.id);
      if (error) throw error;
      toast.success("Configurações salvas");
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao salvar");
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) {
    return <Loader2 className="mx-auto mt-20 size-6 animate-spin text-muted-foreground" />;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Sistema</div>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          <span className="gradient-text-warm">Configurações Gerais</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Nome, logo, favicon, textos e mensagem global do sistema.
        </p>
      </header>

      <section className="glass space-y-5 rounded-2xl p-6">
        <div>
          <Label htmlFor="site-name">Nome do sistema</Label>
          <Input
            id="site-name"
            value={values.site_name ?? ""}
            onChange={(e) => setValues((v) => ({ ...v, site_name: e.target.value }))}
            placeholder="MR Lova"
          />
        </div>

        <UploadField
          label="Logo do sistema"
          value={values.logo_url ?? ""}
          onChange={(v) => setValues((s) => ({ ...s, logo_url: v }))}
        />

        <UploadField
          label="Favicon"
          value={values.favicon_url ?? ""}
          onChange={(v) => setValues((s) => ({ ...s, favicon_url: v }))}
        />

        <div>
          <Label htmlFor="welcome">Texto de boas-vindas</Label>
          <Textarea
            id="welcome"
            value={values.welcome_text ?? ""}
            onChange={(e) => setValues((v) => ({ ...v, welcome_text: e.target.value }))}
            rows={2}
          />
        </div>

        <div>
          <Label htmlFor="footer">Rodapé</Label>
          <Input
            id="footer"
            value={values.footer_text ?? ""}
            onChange={(e) => setValues((v) => ({ ...v, footer_text: e.target.value }))}
          />
        </div>
      </section>

      <ExtensionUploadSection
        url={values.extension_url ?? ""}
        filename={values.extension_filename ?? ""}
        onChange={(u, f) => setValues((v) => ({ ...v, extension_url: u, extension_filename: f }))}
      />

      <section className="glass space-y-4 rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Notificação global</div>
            <div className="text-xs text-muted-foreground">
              Mensagem exibida no topo do app quando ativa.
            </div>
          </div>
          <Switch
            checked={!!values.notification_active}
            onCheckedChange={(c) => setValues((v) => ({ ...v, notification_active: c }))}
          />
        </div>
        <Textarea
          value={values.notification_message ?? ""}
          onChange={(e) => setValues((v) => ({ ...v, notification_message: e.target.value }))}
          rows={2}
          placeholder="Mensagem que aparecerá para os usuários…"
        />
      </section>

      <section className="glass space-y-4 rounded-2xl p-6">
        <div>
          <div className="text-sm font-semibold">Comunidade & Portal</div>
          <div className="text-xs text-muted-foreground">
            Links enviados por email após a compra e usados no rodapé de mensagens.
          </div>
        </div>
        <div>
          <Label>Link da comunidade (grupo)</Label>
          <Input
            value={(values as any).link_comunidade ?? ""}
            onChange={(e) => setValues((v) => ({ ...(v as any), link_comunidade: e.target.value }))}
            placeholder="https://chat.whatsapp.com/... ou https://t.me/..."
          />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>Link do painel</Label>
            <Input
              value={(values as any).email_link_portal ?? ""}
              onChange={(e) => setValues((v) => ({ ...(v as any), email_link_portal: e.target.value }))}
              placeholder="https://mrsemlimites.lovable.app/revendedor"
            />
          </div>
          <div>
            <Label>Link de suporte</Label>
            <Input
              value={(values as any).email_link_suporte ?? ""}
              onChange={(e) => setValues((v) => ({ ...(v as any), email_link_suporte: e.target.value }))}
              placeholder="https://wa.me/..."
            />
          </div>
          <div>
            <Label>Link do manual</Label>
            <Input
              value={(values as any).email_link_manual ?? ""}
              onChange={(e) => setValues((v) => ({ ...(v as any), email_link_manual: e.target.value }))}
            />
          </div>
          <div>
            <Label>Link de download</Label>
            <Input
              value={(values as any).email_link_download ?? ""}
              onChange={(e) => setValues((v) => ({ ...(v as any), email_link_download: e.target.value }))}
            />
          </div>
          <div>
            <Label>Nome do remetente</Label>
            <Input
              value={(values as any).email_remetente_nome ?? ""}
              onChange={(e) => setValues((v) => ({ ...(v as any), email_remetente_nome: e.target.value }))}
              placeholder="MR Sem Limites"
            />
          </div>
          <div className="md:col-span-2">
            <Label>Remetente (EMAIL_FROM)</Label>
            <Input
              value={(values as any).email_from ?? ""}
              onChange={(e) => setValues((v) => ({ ...(v as any), email_from: e.target.value }))}
              placeholder='MR Sem Limites <no-reply@seudominio.com>'
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Preencha somente após verificar o domínio no Resend. Enquanto vazio, o sistema usa o remetente padrão.
            </p>
          </div>
          <div className="md:col-span-2 flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3">
            <div>
              <Label className="text-sm">Envio de e-mails ativo</Label>
              <p className="text-[11px] text-muted-foreground">
                Enquanto desligado, nenhum e-mail real é enviado — apenas logs são registrados. Ative depois de configurar o domínio no Resend.
              </p>
            </div>
            <Switch
              checked={!!(values as any).email_enabled}
              onCheckedChange={(v) => setValues((s) => ({ ...(s as any), email_enabled: v }))}
            />
          </div>
          <div>
            <Label>Valor do Painel Revendedor (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={(values as any).painel_revendedor_valor ?? 29.9}
              onChange={(e) =>
                setValues((v) => ({ ...(v as any), painel_revendedor_valor: Number(e.target.value) }))
              }
            />
          </div>
          <div className="md:col-span-2">
            <Label>URL do checkout Kiwify (Painel Revendedor)</Label>
            <Input
              value={(values as any).kiwify_checkout_url_revendedor ?? ""}
              onChange={(e) =>
                setValues((v) => ({ ...(v as any), kiwify_checkout_url_revendedor: e.target.value }))
              }
              placeholder="https://pay.kiwify.com.br/xxxxxxx"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Botão "Seja Revendedor" abre esta URL. Após aprovação, o webhook Kiwify libera o painel automaticamente.
            </p>
          </div>
          <div className="md:col-span-2">
            <Label>ID do produto Kiwify (Painel Revendedor)</Label>
            <Input
              value={(values as any).kiwify_produto_revendedor_ref ?? ""}
              onChange={(e) =>
                setValues((v) => ({ ...(v as any), kiwify_produto_revendedor_ref: e.target.value }))
              }
              placeholder="Ex.: 8a1b2c3d-...."
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Identificador do produto na Kiwify. O webhook só provisiona revendedor quando o produto pago corresponde a este ID.
            </p>
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <Button className="gradient-primary" onClick={save} disabled={busy}>
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              <Save className="size-4" /> Salvar
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function UploadField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  async function handleFile(file: File) {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `config/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("admin-media")
        .upload(path, file, { upsert: false });
      if (error) throw error;
      const { data: signed, error: sErr } = await supabase.storage
        .from("admin-media")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (sErr) throw sErr;
      onChange(signed?.signedUrl ?? "");
      toast.success("Enviado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha no upload");
    } finally {
      setUploading(false);
    }
  }
  return (
    <div>
      <Label>{label}</Label>
      <div className="space-y-2">
        {value && (
          <div className="relative w-fit">
            <img
              src={value}
              alt=""
              className="max-h-24 rounded-lg border border-white/10 object-cover"
              loading="lazy"
              decoding="async"
            />
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute -right-2 -top-2 grid size-6 place-items-center rounded-full bg-black/70 text-white"
            >
              <X className="size-3" />
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10">
            {uploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}
            <span>{value ? "Trocar" : "Enviar"}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </label>
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="ou cole uma URL"
            className="flex-1"
          />
        </div>
      </div>
    </div>
  );
}

function ExtensionUploadSection({
  url,
  filename,
  onChange,
}: {
  url: string;
  filename: string;
  onChange: (url: string, filename: string) => void;
}) {
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    const okExt = /\.(zip|rar|7z)$/i.test(file.name);
    if (!okExt) {
      toast.error("Envie um arquivo .zip, .rar ou .7z");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "zip";
      const path = `extension/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("admin-media")
        .upload(path, file, {
          upsert: false,
          contentType: file.type || "application/octet-stream",
        });
      if (error) throw error;
      const { data: signed, error: sErr } = await supabase.storage
        .from("admin-media")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (sErr) throw sErr;
      onChange(signed?.signedUrl ?? "", file.name);
      toast.success("Extensão enviada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha no upload");
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="glass space-y-4 rounded-2xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold">Extensão do navegador</div>
          <div className="text-xs text-muted-foreground">
            Envie o arquivo compactado (.zip / .rar / .7z). Ele fica disponível no botão
            <span className="mx-1 rounded bg-white/5 px-1.5 py-0.5 text-[10px] uppercase tracking-wider">
              Baixar Extensão
            </span>
            da barra lateral.
          </div>
        </div>
        {url ? (
          <a
            href={url}
            download={filename || "extensao.zip"}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs hover:bg-white/10"
          >
            <Download className="size-3.5" /> Testar download
          </a>
        ) : null}
      </div>

      {url ? (
        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
          <FileArchive className="size-5 text-primary" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm">{filename || "extensao.zip"}</div>
            <div className="truncate text-[11px] text-muted-foreground">{url}</div>
          </div>
          <button
            type="button"
            onClick={() => onChange("", "")}
            className="grid size-7 place-items-center rounded-full bg-black/40 text-white hover:bg-black/60"
            aria-label="Remover extensão"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10">
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          <span>{url ? "Substituir arquivo" : "Enviar .zip / .rar"}</span>
          <input
            type="file"
            accept=".zip,.rar,.7z,application/zip,application/x-rar-compressed,application/x-7z-compressed"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </label>
        <Input
          value={url}
          onChange={(e) => onChange(e.target.value, filename)}
          placeholder="ou cole uma URL direta do arquivo"
          className="flex-1"
        />
      </div>
    </section>
  );
}
