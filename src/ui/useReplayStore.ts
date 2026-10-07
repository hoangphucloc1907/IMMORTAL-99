import { useStore } from 'zustand';
import { globalReplayStore, ReplayState } from '../store/replayStore';

export function useReplayStore<T>(selector: (state: ReplayState) => T): T {
  return useStore(globalReplayStore, selector);
}
