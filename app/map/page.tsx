import MapExplorer from "@/components/MapExplorer";

export default function MapPage() {
  return (
    <main className="flex flex-col min-h-screen">
      <div className="px-5 pt-12 pb-4">
        <h1 className="font-display font-extrabold text-3xl sm:text-4xl tracking-tight">Live Map</h1>
      </div>
      <MapExplorer />
    </main>
  );
}
