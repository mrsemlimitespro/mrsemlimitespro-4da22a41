import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-white/[0.04] border border-white/[0.03]",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.8s_ease-in-out_infinite]",
        "before:bg-[linear-gradient(90deg,transparent,color-mix(in_oklab,var(--primary)_14%,transparent),transparent)]",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
