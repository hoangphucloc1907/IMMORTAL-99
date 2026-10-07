import { buildShareUrl } from '../ui/share';

// Re-exported for existing callers; sharing itself lives in ui/share.ts (the UI owns the share button)
export { buildShareUrl };

export interface ParsedUrlState {
  ply: number;
  mode: 'cinematic' | 'study';
}

export function parseInitialUrl(search: string): ParsedUrlState {
  const params = new URLSearchParams(search);
  const rawPly = params.get('ply');
  const rawMode = params.get('mode');

  let ply = 0;
  if (rawPly !== null) {
    const parsed = parseInt(rawPly, 10);
    if (!isNaN(parsed)) {
      ply = Math.max(0, Math.min(87, parsed));
    }
  }

  const mode = rawMode === 'study' ? 'study' : 'cinematic';

  return { ply, mode };
}

export function syncUrlWithState(ply: number, mode: 'cinematic' | 'study'): void {
  if (typeof window === 'undefined' || !window.history?.replaceState) return;
  const newUrl = buildShareUrl(ply, mode);
  window.history.replaceState(null, '', newUrl);
}
