import { cn } from "@/lib/utils";

type SegmentOption = {
  label: string;
  value: string;
};

type SegmentedControlProps = {
  label: string;
  options: SegmentOption[];
  selected: string;
};

export function SegmentedControl({ label, options, selected }: SegmentedControlProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-on-surface-variant">{label}</p>
      <div className="grid grid-cols-2 gap-2 rounded-[1.5rem] bg-surface-container-low p-2">
        {options.map((option) => {
          const active = option.value === selected;

          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              className={cn(
                "min-h-12 rounded-[1rem] px-4 text-sm font-medium transition",
                active
                  ? "bg-surface-container-high text-on-surface shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                  : "text-on-surface-variant hover:bg-white/4 hover:text-on-surface",
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
