"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Wraps <input type="file" capture="environment"> behind a single hook, per
 * CLAUDE.md's native-wrap guardrails — when the Capacitor wrap lands, this
 * is the one file that swaps to the native Camera plugin, not every screen
 * that needs a photo (post-visit survey here, check-in flow next).
 */
export function usePhotoCapture() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function open() {
    inputRef.current?.click();
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0] ?? null;
    setFile(picked);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return picked ? URL.createObjectURL(picked) : null;
    });
  }

  function clear() {
    setFile(null);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (inputRef.current) inputRef.current.value = "";
  }

  return {
    file,
    previewUrl,
    open,
    clear,
    inputProps: {
      ref: inputRef,
      type: "file" as const,
      accept: "image/*",
      capture: "environment" as const,
      className: "hidden",
      onChange: handleChange,
    },
  };
}
