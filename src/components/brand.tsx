import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export const BRAND_NAME = "MR Sem Limite Pro";
export const BRAND_LOGO_URL = "/logo.png";

export function BrandLogo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center font-black text-white uppercase tracking-tighter", className)}>
      <span className="text-primary">MR</span>
    </div>
  );
}

export function BrandWatermark() { return null; }
export function BrandDecorations() { return null; }
