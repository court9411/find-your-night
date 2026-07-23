import { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base: IconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export function DrinksIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      {/* glass */}
      <path d="M5 5h14L12 13v6.5" />
      <path d="M8.5 20.5h7" />
      {/* liquid line */}
      <path d="M6.5 7.2Q12 10 17.5 7.2" />
      {/* olive + pick */}
      <circle cx="15.5" cy="6" r="1.1" />
      <path d="M16.3 5.3 18.3 3.5" />
    </svg>
  );
}

export function LiveMusicIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      {/* mic head */}
      <rect x="9" y="2.5" width="6" height="10" rx="3" />
      <path d="M9 6.5h6M9 9h6" />
      {/* short stand */}
      <path d="M12 12.5v4.5" />
      <ellipse cx="12" cy="19.5" rx="4.5" ry="1.4" />
    </svg>
  );
}

export function FreshAirIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      {/* sun */}
      <circle cx="12" cy="5.5" r="2.2" />
      <path d="M12 1.5v1.2M8.6 3.1l.8.9M15.4 3.1l-.8.9" />
      {/* mountains */}
      <path d="M2 20 8 10l3.5 5.5L14 12l8 8Z" />
      {/* trail marker dots */}
      <path d="M2 20h20" />
    </svg>
  );
}

export function FoodDrinksIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      {/* fork */}
      <path d="M6 2v6a1.5 1.5 0 0 0 3 0V2M7.5 8v14" />
      <path d="M6 2v3M9 2v3" />
      {/* knife */}
      <path d="M17 2c-2 0-3.5 2-3.5 5s1.5 5 3.5 5v9" />
    </svg>
  );
}

export function LateNightEatsIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      {/* top bun */}
      <path d="M4 9c0-3 3.6-5 8-5s8 2 8 5" />
      <path d="M3.5 9h17" />
      {/* layers */}
      <path d="M4 12.5q2-1.4 4 0t4 0 4 0 4 0" />
      <path d="M4 15.5q2-1.4 4 0t4 0 4 0 4 0" />
      {/* bottom bun */}
      <path d="M3.5 18.5h17v.5a2 2 0 0 1-2 2H5.5a2 2 0 0 1-2-2Z" />
    </svg>
  );
}

export function RooftopIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      {/* skyline */}
      <path d="M2.5 21V13l3-2 3 2v8" />
      <path d="M8.5 21V8l3.5-3 3.5 3v13" />
      <path d="M15.5 21V12l3-1.5 3 1.5v9" />
      <path d="M2 21h20" />
      {/* crescent moon */}
      <path d="M16.6 3.3a3.3 3.3 0 1 0 3.7 5.1A4 4 0 0 1 16.6 3.3Z" />
    </svg>
  );
}

export function CasualFunIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      {/* back pin */}
      <path d="M14 2h2v2l2 4.5-1 6.5q-2 1-4 0l-1-6.5L14 4Z" />
      <path d="M13.5 5h3" />
      {/* front pin */}
      <path d="M7.5 6h2v2l1.5 4-.8 5q-1.7 1-3.4 0l-.8-5L7.5 8Z" />
      <path d="M7 9h3" />
      {/* ball mid-roll */}
      <circle cx="4" cy="19" r="2.6" />
      <circle cx="3.3" cy="18.1" r="0.35" fill="currentColor" />
      <circle cx="4.7" cy="18.1" r="0.35" fill="currentColor" />
      {/* motion lines */}
      <path d="M0.5 17.5 2 18.3M0.5 21l1.5-.8" />
    </svg>
  );
}

export function ArtsEventsIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <g transform="rotate(-12 12 12)">
        <path d="M3 6.5h4.3a1.2 1.2 0 0 0 2.4 0H21v11H9.7a1.2 1.2 0 0 0-2.4 0H3Z" />
        <path d="M8.5 6.5v11" strokeDasharray="1.8 1.8" />
        <path d="M5.5 10.5v3M4 12h3" />
      </g>
    </svg>
  );
}

export function ComedyIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      {/* mask outline */}
      <path d="M4 6.5c0-2 2.5-3 4-1.5 1-1.5 3.5-1.5 4 .5.5-2 3-2 4-.5 1.5-1.5 4-.5 4 1.5 0 6-4 10-8 10s-8-4-8-10Z" />
      {/* smiling eyes */}
      <path d="M8 9.5q1 1.2 2 0M14 9.5q1 1.2 2 0" />
    </svg>
  );
}

export function DancingIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      {/* raised arm + head */}
      <circle cx="9" cy="4" r="1.8" />
      <path d="M9 6.2v5M9 11.2 5 8M9 11.2l4.5-3.5M9 11.2 7 20M9 11.2l4 2 2-4.5" />
    </svg>
  );
}

const SPARKLE =
  "M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L13.937 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.563 1.594Z";

export function SurpriseMeIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      {/* wand */}
      <path d="M3.5 20.5 14 10" />
      <circle cx="3.5" cy="20.5" r="1" />
      {/* big sparkle at tip */}
      <g transform="translate(17.5,6.5) scale(0.5) translate(-12,-12)">
        <path d={SPARKLE} vectorEffect="non-scaling-stroke" />
      </g>
      {/* small scattered sparkles */}
      <g transform="translate(21.5,12) scale(0.28) translate(-12,-12)">
        <path d={SPARKLE} vectorEffect="non-scaling-stroke" />
      </g>
      <g transform="translate(13,3) scale(0.28) translate(-12,-12)">
        <path d={SPARKLE} vectorEffect="non-scaling-stroke" />
      </g>
    </svg>
  );
}
