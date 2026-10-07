import { createContext, useContext } from 'react';
import type { DirectorCommands } from '../animation/types';

// Provided by app/App.tsx — ui/ only knows the command interface, never the Director itself
export const DirectorContext = createContext<DirectorCommands | null>(null);

export function useDirector(): DirectorCommands {
  const director = useContext(DirectorContext);
  if (!director) {
    throw new Error('useDirector() must be used inside <DirectorContext.Provider>');
  }
  return director;
}
