import { describe, it, expect } from 'vitest';
import { globalReplayStore } from '../src/store/replayStore';

describe('Photo Mode (Group D - Item 12)', () => {
  it('manages photo mode activation state cleanly', () => {
    const store = globalReplayStore;
    expect(store.getState().isPhotoMode).toBe(false);

    store.getState().setPhotoMode(true);
    expect(store.getState().isPhotoMode).toBe(true);

    store.getState().setPhotoMode(false);
    expect(store.getState().isPhotoMode).toBe(false);
  });
});
