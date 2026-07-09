// Dark "night mode" styling for the Google Maps JS SDK, tuned to sit close
// to the app's near-black background (#09090F) rather than the bright
// default road map. Standard Maps JS `styles` array — no extra API surface.
export const DARK_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#0e0e14" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8a8a99" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0e0e14" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#242430" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1c1c26" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#141420" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#26263a" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#6b6b7a" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#08080d" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#4a4a58" }] },
];
