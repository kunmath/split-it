import { cn } from "@/lib/utils";

type SegmentOption = {
  label: string;
  value: string;
};

type SegmentedControlProps = {
  label: string;
  options: SegmentOption[];
  selected: string;
  onChange?: (value: string) => void;
  className?: string;
};

export function SegmentedControl({ label, options, selected, onChange, className }: SegmentedControlProps) {
  return (
    <div role="group" aria-label={label} className={cn("space-y-1.5", className)}>
      <p className="text-sm font-medium text-on-surface">{label}</p>
      <div className="grid auto-cols-fr grid-flow-col gap-1 rounded-2xl bg-surface-container-low p-1">
        {options.map((option) => {
          const active = option.value === selected;

          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={onChange ? () => onChange(option.value) : undefined}
              className={cn(
                "min-h-11 rounded-xl px-4 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                active
                  ? "bg-surface-container-highest text-on-surface shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                  : "text-on-surface-variant hover:bg-white/[0.04] hover:text-on-surface",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
