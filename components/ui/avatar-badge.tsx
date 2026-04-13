import { cn, getInitials } from "@/lib/utils";

type AvatarBadgeProps = {
  name: string;
  note?: string;
  chip?: string;
  tone?: "positive" | "negative" | "neutral";
  size?: "sm" | "md";
  align?: "row" | "stack";
};

export function AvatarBadge({
  name,
  note,
  chip,
  tone = "neutral",
  size = "md",
  align = "row",
}: AvatarBadgeProps) {
  return (
    <div className={cn("flex gap-3", align === "stack" ? "flex-col" : "items-center")}>
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full font-headline font-bold",
          size === "sm" ? "h-10 w-10 text-sm" : "h-12 w-12 text-base",
          tone === "positive" &&
            "bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.16),transparent_35%),linear-gradient(135deg,rgba(78,222,163,0.4),rgba(16,185,129,0.9))] text-on-primary",
          tone === "negative" &&
            "bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.14),transparent_35%),linear-gradient(135deg,rgba(255,181,158,0.35),rgba(127,42,13,0.95))] text-white",
          tone === "neutral" &&
            "bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.12),transparent_35%),linear-gradient(135deg,rgba(57,57,57,1),rgba(42,42,42,1))] text-on-surface",
        )}
      >
        {getInitials(name)}
      </div>
      <div className="space-y-1">
        <p className="font-headline text-sm font-semibold text-on-surface">{name}</p>
        {note ? <p className="text-xs text-on-surface-variant">{note}</p> : null}
        {chip ? (
          <span className="inline-flex rounded-full bg-white/6 px-2 py-1 text-[0.65rem] uppercase tracking-[0.18em] text-on-surface-variant">
            {chip}
          </span>
        ) : null}
      </div>
    </div>
  );
}
