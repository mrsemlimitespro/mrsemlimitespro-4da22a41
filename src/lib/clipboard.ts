/**
 * Copy text to the clipboard with a robust fallback for iframes / insecure
 * contexts where `navigator.clipboard.writeText` is blocked (common inside
 * the Lovable preview and some in-app webviews).
 */
export async function copyText(text: string): Promise<boolean> {
  const value = text ?? "";
  // 1) Modern async API — only works in secure contexts with permission.
  try {
    if (
      typeof navigator !== "undefined" &&
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === "function" &&
      (typeof window === "undefined" || window.isSecureContext !== false)
    ) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    /* fall through to legacy path */
  }

  // 2) Legacy fallback via a hidden textarea + execCommand("copy").
  try {
    if (typeof document === "undefined") return false;
    const ta = document.createElement("textarea");
    ta.value = value;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "0";
    ta.style.left = "0";
    ta.style.opacity = "0";
    ta.style.pointerEvents = "none";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, value.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
