"use client";

interface Props {
  step: number;
  total: number;
}

export default function OnboardingProgress({ step, total }: Props) {
  return (
    <div className="relative z-10 mb-5">
      <div className="h-[3px] w-full rounded-full overflow-hidden bg-[#242424]">
        <div
          className="h-full rounded-full bg-accent shadow-[0_0_8px_rgba(34,197,94,0.7)] transition-all duration-300"
          style={{ width: `${(step / total) * 100}%` }}
        />
      </div>
      <p className="mt-2 text-[10px] font-medium uppercase tracking-[0.15em] text-muted/40">
        Screen {step} of {total}
      </p>
    </div>
  );
}
