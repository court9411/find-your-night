"use client";

interface Props {
  step: number;
  total: number;
}

export default function OnboardingProgress({ step, total }: Props) {
  return (
    <div className="mb-6">
      <div className="h-1 w-full rounded-full overflow-hidden bg-[#242424]">
        <div
          className="h-full rounded-full bg-accent transition-all duration-300"
          style={{ width: `${(step / total) * 100}%` }}
        />
      </div>
      <p className="mt-2 text-[11px] font-semibold uppercase tracking-widest text-muted/60">
        Screen {step} of {total}
      </p>
    </div>
  );
}
