"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import posthog from "posthog-js";

export default function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      posthog.capture("$pageview", { $current_url: window.location.href });
    } catch {}
  }, [pathname, searchParams]);

  return null;
}
