import CheckInFlow from "@/components/CheckInFlow";

export default function MapPage() {
  return (
    <main className="flex flex-col min-h-screen">
      <div className="px-5 pt-12 pb-6">
        <h1 className="font-display font-extrabold text-3xl sm:text-4xl tracking-tight">Live Map</h1>
        <p className="text-muted text-sm mt-1">Check in to let other scouts know what&apos;s happening.</p>
      </div>
      <CheckInFlow />
    </main>
  );
}
