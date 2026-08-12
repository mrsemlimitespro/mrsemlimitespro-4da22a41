/**
 * downloadItemAsHtml — gera um arquivo .html auto-contido com capa,
 * descrição e prompt de um item (prompt / agente).
 * Uso: baixar conteúdo completo a partir do modal de detalhe.
 */
export type DownloadableItem = {
  titulo: string;
  categoria?: string | null;
  subcategoria?: string | null;
  descricao?: string | null;
  descricao_completa?: string | null;
  prompt?: string | null;
  cover_url?: string | null;
  autor?: string | null;
  versao?: string | null;
};

function esc(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function slugify(s: string) {
  return (
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "")
      .toLowerCase()
      .slice(0, 80) || "item"
  );
}

export function downloadItemAsHtml(item: DownloadableItem) {
  const title = item.titulo || "Item";
  const meta = [item.categoria, item.subcategoria].filter(Boolean).join(" · ");
  const info = [
    item.autor ? `Autor: ${item.autor}` : null,
    item.versao ? `Versão: ${item.versao}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>${esc(title)}</title>
<meta name="viewport" content="width=device-width,initial-scale=1" />
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin:0; font-family: system-ui,-apple-system,Segoe UI,Roboto,sans-serif; background:#0a0710; color:#f4eefc; line-height:1.55; }
  main { max-width: 820px; margin: 0 auto; padding: 32px 20px 80px; }
  .cover { width:100%; aspect-ratio: 16/9; object-fit: cover; border-radius: 16px; border: 1px solid rgba(255,255,255,0.08); background:#000; }
  .kicker { color:#c4b5fd; font-size:11px; letter-spacing: 0.28em; text-transform: uppercase; margin: 20px 0 8px; }
  h1 { font-size: 32px; margin: 0 0 8px; background: linear-gradient(90deg,#fff,#c4b5fd); -webkit-background-clip: text; background-clip: text; color: transparent; }
  .muted { color:#a89fb8; font-size: 13px; }
  h2 { font-size: 14px; letter-spacing: 0.28em; text-transform: uppercase; color:#c4b5fd; margin: 28px 0 10px; }
  p { white-space: pre-wrap; }
  pre { white-space: pre-wrap; word-break: break-word; background:#050308; border:1px solid rgba(196,181,253,0.15); border-radius: 12px; padding: 16px; font-size: 13px; color:#eee; }
  .btn { display:inline-block; margin-top:16px; padding:10px 16px; background:#7c3aed; color:#fff; text-decoration:none; border-radius: 999px; font-weight:600; font-size:13px; }
  footer { margin-top: 40px; font-size: 11px; color:#6b6382; text-align:center; }
</style>
</head>
<body>
<main>
  ${item.cover_url ? `<img class="cover" src="${esc(item.cover_url)}" alt="${esc(title)}" />` : ""}
  ${meta ? `<div class="kicker">${esc(meta)}</div>` : `<div style="height:20px"></div>`}
  <h1>${esc(title)}</h1>
  ${info ? `<div class="muted">${esc(info)}</div>` : ""}
  ${item.descricao ? `<h2>Descrição</h2><p>${esc(item.descricao)}</p>` : ""}
  ${item.descricao_completa ? `<h2>Descrição completa</h2><p>${esc(item.descricao_completa)}</p>` : ""}
  ${
    item.prompt
      ? `<h2>Prompt completo</h2><pre>${esc(item.prompt)}</pre>
    <a class="btn" href="#" onclick="navigator.clipboard.writeText(document.querySelector('pre').innerText);this.textContent='Copiado ✓';return false;">Copiar prompt</a>`
      : ""
  }
  <footer>Baixado de MR Sem Limites</footer>
</main>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slugify(title)}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
