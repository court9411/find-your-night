"use client";

export default function ChipGroup({
  label,
  options,
  selected,
  onChange,
  labels,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  // Optional display-label override per option value — lets `options` stay
  // the raw stored value (e.g. "live_music") while the chip shows something
  // readable ("Live Music").
  labels?: Record<string, string>;
}) {
  function toggle(opt: string) {
    onChange(
      selected.includes(opt)
        ? selected.filter((s) => s !== opt)
        : [...selected, opt]
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-muted font-semibold uppercase tracking-wider">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors active:scale-95 ${
              selected.includes(opt)
                ? "bg-accent text-black"
                : "bg-white/[0.06] border border-card-border text-muted hover:text-white"
            }`}
          >
            {labels?.[opt] ?? opt}
          </button>
        ))}
      </div>
    </div>
  );
}
