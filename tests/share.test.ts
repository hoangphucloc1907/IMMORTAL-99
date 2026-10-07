import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildShareUrl, shareLink } from '../src/ui/share';

const originalNavigator = global.navigator;

function mockNavigator(nav: Partial<Navigator>) {
  Object.defineProperty(global, 'navigator', { value: nav, configurable: true, writable: true });
}

afterEach(() => {
  Object.defineProperty(global, 'navigator', { value: originalNavigator, configurable: true, writable: true });
});

describe('Share link (§12b D12)', () => {
  it('builds a link to the move and mode', () => {
    expect(buildShareUrl(47, 'study', 'https://example.com/')).toBe('https://example.com/?ply=47&mode=study');
  });

  it('copies the link by default, even where a share sheet exists (desktop browsers have one too)', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const share = vi.fn().mockResolvedValue(undefined);
    mockNavigator({ clipboard: { writeText } as unknown as Clipboard, share });

    expect(await shareLink(51, 'cinematic')).toBe('copied');
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('?ply=51&mode=cinematic'));
    expect(share).not.toHaveBeenCalled();
  });

  it('uses the system share sheet when preferred (mobile) and available', async () => {
    const writeText = vi.fn();
    const share = vi.fn().mockResolvedValue(undefined);
    mockNavigator({ clipboard: { writeText } as unknown as Clipboard, share });

    expect(await shareLink(87, 'cinematic', true)).toBe('shared');
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ url: expect.stringContaining('?ply=87') }));
    expect(writeText).not.toHaveBeenCalled();
  });

  it('reports failure quietly when the sheet is dismissed or the clipboard is refused', async () => {
    mockNavigator({ share: vi.fn().mockRejectedValue(new DOMException('cancel', 'AbortError')) });
    expect(await shareLink(1, 'study', true)).toBe('failed');

    mockNavigator({ clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } as unknown as Clipboard });
    expect(await shareLink(1, 'study')).toBe('failed');
  });
});
