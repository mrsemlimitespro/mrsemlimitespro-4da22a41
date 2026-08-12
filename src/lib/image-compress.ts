/**
 * Comprime uma imagem para WebP q=0.9, redimensionando para máximo 1920px na maior dimensão.
 * Retorna Blob (WebP) e um objectURL para preview.
 */
export async function compressToWebp(
  file: File,
  opts: { maxSize?: number; quality?: number } = {},
): Promise<{ blob: Blob; previewUrl: string; width: number; height: number }> {
  const maxSize = opts.maxSize ?? 1920;
  const quality = opts.quality ?? 0.9;

  const bmp = await createImageBitmap(file).catch(async () => {
    // fallback via <img> quando createImageBitmap falha (ex.: alguns SVGs)
    return await new Promise<ImageBitmap>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img as unknown as ImageBitmap);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  });

  const iw = (bmp as ImageBitmap).width;
  const ih = (bmp as ImageBitmap).height;
  const ratio = Math.min(1, maxSize / Math.max(iw, ih));
  const w = Math.round(iw * ratio);
  const h = Math.round(ih * ratio);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bmp as CanvasImageSource, 0, 0, w, h);

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Falha ao gerar WebP"))),
      "image/webp",
      quality,
    );
  });
  return { blob, previewUrl: URL.createObjectURL(blob), width: w, height: h };
}
