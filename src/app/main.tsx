import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
// Self-hosted fonts (§2: no third-party CDN at runtime) — Latin subset, only the weights in use
import '@fontsource/cormorant-garamond/latin-600.css';
import '@fontsource/cormorant-garamond/latin-700.css';
import '@fontsource/ibm-plex-sans/latin-400.css';
import '@fontsource/ibm-plex-sans/latin-600.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@fontsource/ibm-plex-mono/latin-600.css';
import './index.css';

import { parseInitialUrl } from './deepLink';
import { globalReplayStore } from '../store/replayStore';
import { globalDirector } from '../animation/Director';

// Dev / test probe (window.__immortal) — never part of the production entry chunk
if (import.meta.env.DEV || new URLSearchParams(window.location.search).has('test')) {
  void import('../dev/sceneProbe');
}
if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('debugCamera')) {
  void import('../dev/debugCamera');
}

// Deep link on initial load (§12b). Replay state goes through the Director (§4: only it writes ply / mode);
// Stage rebuilds this ply once the scene has registered its pieces and lights.
const initial = parseInitialUrl(window.location.search);
if (initial.ply > 0 || initial.mode === 'study') {
  if (initial.mode === 'study') globalDirector.setMode('study');
  globalDirector.seek(initial.ply);
  globalReplayStore.getState().setShowIntro(false);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
