import { useEffect, useRef, useState } from 'react';

/** A link straight to this move and mode (§12b D12: `?ply=47&mode=study`). */
export function buildShareUrl(ply: number, mode: 'cinematic' | 'study', baseUrl?: string): string {
  const base = baseUrl || (typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : '');
  return `${base}?ply=${ply}&mode=${mode}`;
}

export type ShareResult = 'shared' | 'copied' | 'failed';

/**
 * Copies the link; with `preferShareSheet` (mobile) it opens the system share sheet instead when there is one.
 * Desktop browsers have a share sheet too, but a "copy link" button should simply copy.
 */
export async function shareLink(
  ply: number,
  mode: 'cinematic' | 'study',
  preferShareSheet = false,
): Promise<ShareResult> {
  const url = buildShareUrl(ply, mode);
  const nav = typeof navigator !== 'undefined' ? navigator : undefined;
  try {
    if (preferShareSheet && nav?.share) {
      await nav.share({ title: "Kasparov's Immortal", url });
      return 'shared';
    }
    if (nav?.clipboard?.writeText) {
      await nav.clipboard.writeText(url);
      return 'copied';
    }
  } catch {
    // Share sheet dismissed, or clipboard access refused
  }
  return 'failed';
}

/** Share action with a short-lived "copied" state for the button label. */
export function useShareLink(ply: number, mode: 'cinematic' | 'study', preferShareSheet = false) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const share = async () => {
    if ((await shareLink(ply, mode, preferShareSheet)) !== 'copied') return;
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1800);
  };

  return { copied, share: () => void share() };
}
