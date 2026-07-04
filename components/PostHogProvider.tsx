"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { Suspense, useEffect } from "react";
import PostHogPageView from "./PostHogPageView";
import { getAnonId } from "@/lib/anon";
import { createClient } from "@/lib/supabase/client";

export default function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) return;
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
      capture_pageview: false,
      capture_pageleave: true,
      persistence: "localStorage",
    });

    const supabase = createClient();

    // Keep PostHog's identity in sync with the real Supabase session, not
    // just the device's anon ID — otherwise every page load re-identifies
    // as anonymous and silently orphans a logged-in user's history.
    // identify() with a new distinct_id auto-merges the prior anonymous
    // activity into the real user, so pre-auth events stay attributed.
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        posthog.identify(user.id, { email: user.email });
      } else {
        posthog.identify(getAnonId());
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        posthog.identify(session.user.id, { email: session.user.email });
      } else if (event === "SIGNED_OUT") {
        // Reset so a shared/public device doesn't keep attributing the next
        // person's activity to whoever was just signed in.
        posthog.reset();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </PHProvider>
  );
}
