export default function MapPage() {
  return (
    <main className="flex flex-col min-h-screen">
      <div className="px-5 pt-12 pb-4">
        <h1 className="font-display font-extrabold text-3xl sm:text-4xl tracking-tight">Live Map</h1>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-3 px-5 text-center">
        <span className="text-5xl" aria-hidden>
          🗺️
        </span>
        <p className="text-muted text-sm">Live Map — coming soon</p>
      </div>
    </main>
  );
}
