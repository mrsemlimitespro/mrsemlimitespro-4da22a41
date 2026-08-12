import { createFileRoute } from "@tanstack/react-router";
import currentExtensionAsset from "../../../../public/mr-sem-limites-2.2.6.zip.asset.json";

// Nome do arquivo publicado como asset. Ao subir uma nova versão da extensão,
// atualize APENAS esta constante e o import acima.
const FILENAME = "mr-sem-limites-2.2.6.zip";

export const Route = createFileRoute("/api/public/download-extensao")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const assetUrl = new URL(currentExtensionAsset.url, url.origin).toString();

        const upstream = await fetch(assetUrl);
        if (!upstream.ok) {
          return new Response(
            `Falha ao obter extensão (${upstream.status}) em ${FILENAME}`,
            { status: 502 },
          );
        }

        const buf = await upstream.arrayBuffer();
        const bytes = new Uint8Array(buf);

        const isZip =
          bytes.length > 4 &&
          bytes[0] === 0x50 &&
          bytes[1] === 0x4b &&
          bytes[2] === 0x03 &&
          bytes[3] === 0x04;

        if (!isZip) {
          return new Response(
            "Arquivo da extensão inválido no servidor (assinatura ZIP ausente). Publique novamente.",
            { status: 502 },
          );
        }

        return new Response(buf, {
          status: 200,
          headers: {
            "Content-Type": "application/zip",
            "Content-Length": String(buf.byteLength),
            "Content-Disposition": `attachment; filename="${FILENAME}"`,
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
          },
        });
      },
    },
  },
});
