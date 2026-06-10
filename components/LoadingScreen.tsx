interface LoadingScreenProps {
  emoji: string;
  city: string;
}

export default function LoadingScreen({ emoji, city }: LoadingScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 min-h-[60vh] text-center">
      <span className="text-7xl animate-scan">{emoji}</span>
      <h2 className="font-display text-3xl tracking-wide">Scanning {city} tonight...</h2>
      <p className="text-muted">Finding the best spots for your vibe</p>
    </div>
  );
}
