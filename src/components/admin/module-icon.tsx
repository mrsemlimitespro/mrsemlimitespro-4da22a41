import * as Icons from "lucide-react";
import type { ComponentType, SVGProps } from "react";

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

export function ModuleIcon({ name, className }: { name: string; className?: string }) {
  const lookup = (Icons as unknown as Record<string, IconType>)[name];
  const Icon = lookup ?? (Icons.Package as unknown as IconType);
  return <Icon className={className} strokeWidth={2} />;
}
