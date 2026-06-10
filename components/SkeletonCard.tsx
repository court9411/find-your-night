interface SkeletonCardProps {
  index: number;
}

export default function SkeletonCard({ index }: SkeletonCardProps) {
  return (
    <div
      className="glass-card p-5 flex flex-col gap-3 animate-fadeUp opacity-0"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-2 flex-1">
          <div className="h-6 w-2/3 rounded-md bg-white/10 animate-pulse" />
          <div className="h-4 w-1/2 rounded-md bg-white/5 animate-pulse" />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="h-6 w-6 rounded-full bg-white/5 animate-pulse" />
          <div className="h-6 w-6 rounded-full bg-white/5 animate-pulse" />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="h-4 w-full rounded-md bg-white/5 animate-pulse" />
        <div className="h-4 w-5/6 rounded-md bg-white/5 animate-pulse" />
      </div>

      <div className="rounded-xl bg-accent/10 border border-accent/20 px-3 py-2 flex flex-col gap-2">
        <div className="h-3 w-24 rounded-md bg-accent/30 animate-pulse" />
        <div className="h-4 w-full rounded-md bg-white/10 animate-pulse" />
      </div>

      <div className="flex items-center justify-between">
        <div className="h-5 w-8 rounded-md bg-white/10 animate-pulse" />
        <div className="flex gap-2">
          <div className="h-6 w-16 rounded-full bg-white/5 animate-pulse" />
          <div className="h-6 w-16 rounded-full bg-white/5 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
