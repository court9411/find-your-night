"use client";

import Link from "next/link";
import { usePicksHref } from "@/lib/usePicksHref";

interface Props {
  children: React.ReactNode;
  className?: string;
}

/**
 * A Link to the Picks tab (see usePicksHref) — drop-in replacement for any
 * "Home" or "Back to app" affordance, including inside server components.
 */
export default function PicksLink({ children, className }: Props) {
  const href = usePicksHref();
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
