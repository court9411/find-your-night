"use client";

interface Props {
  open: boolean;
  onClose: () => void;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  onChoose?: (option: "apple" | "google") => void;
}

export default function MapsChoiceSheet({ open, onClose, address, lat, lng, onChoose }: Props) {
  if (!open) return null;

  const hasCoords = lat != null && lng != null;

  function openGoogleMaps() {
    onChoose?.("google");
    const href = hasCoords
      ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address ?? "")}`;
    window.open(href, "_blank", "noopener,noreferrer");
    onClose();
  }

  function openAppleMaps() {
    onChoose?.("apple");
    const customSchemeUrl = hasCoords
      ? `maps://?ll=${lat},${lng}`
      : `maps://?address=${encodeURIComponent(address ?? "")}`;
    const webFallbackUrl = hasCoords
      ? `https://maps.apple.com/?ll=${lat},${lng}`
      : `https://maps.apple.com/?address=${encodeURIComponent(address ?? "")}`;

    const fallbackTimer = setTimeout(() => {
      if (!document.hidden) window.location.href = webFallbackUrl;
    }, 1500);
    document.addEventListener(
      "visibilitychange",
      () => clearTimeout(fallbackTimer),
      { once: true }
    );
    window.location.href = customSchemeUrl;
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-md bg-zinc-900 border-t border-zinc-800 rounded-t-3xl px-4 pt-3 pb-8 animate-fadeUp opacity-0">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-zinc-700" />
        <button
          onClick={openAppleMaps}
          className="w-full text-left py-3.5 text-white text-base font-medium border-b border-zinc-800 active:opacity-70"
        >
          Apple Maps
        </button>
        <button
          onClick={openGoogleMaps}
          className="w-full text-left py-3.5 text-white text-base font-medium border-b border-zinc-800 active:opacity-70"
        >
          Google Maps
        </button>
        <button
          onClick={onClose}
          className="w-full text-center py-3.5 mt-3 text-muted text-sm font-semibold rounded-2xl bg-white/5 active:opacity-70"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
