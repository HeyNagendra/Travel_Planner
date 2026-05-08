/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy } from 'react';
import { Loader2, Info } from 'lucide-react';
import ErrorBoundary from './components/ErrorBoundary';
import { useDarkMode } from './hooks/useDarkMode';
import { useApiKey } from './hooks/useApiKey';

// Lazy-load heavy components so the initial bundle stays small.
// Each chunk is split by Vite's manualChunks config.
const MapComponent = lazy(() => import('./components/MapComponent'));
const ChatPanel = lazy(() => import('./components/ChatPanel'));
const AboutModal = lazy(() => import('./components/AboutModal'));

function SuspenseFallback() {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950"
    >
      <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}

export default function App() {
  const { isDarkMode, setDarkMode } = useDarkMode();
  const { apiKey, checking, resetApiKey } = useApiKey();
  const [showAboutModal, setShowAboutModal] = React.useState(false);

  if (checking) {
    return (
      <div
        role="status"
        aria-label="Loading application"
        className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950 transition-colors duration-500"
      >
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
        <span className="sr-only">Loading Travel Planner…</span>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-indigo-600 focus:text-white focus:rounded-lg focus:font-bold"
      >
        Skip to main content
      </a>

      <div className="flex flex-col h-screen bg-white dark:bg-slate-950 transition-colors duration-500">
        <Suspense fallback={null}>
          <AboutModal
            isOpen={showAboutModal}
            onClose={() => setShowAboutModal(false)}
          />
        </Suspense>

        <Suspense fallback={null}>
          <ChatPanel />
        </Suspense>

        <main id="main-content" className="flex-1 relative" aria-label="Travel Planner Map">
          {apiKey ? (
            <Suspense fallback={<SuspenseFallback />}>
              <MapComponent
                apiKey={apiKey}
                isDarkMode={isDarkMode}
                setIsDarkMode={setDarkMode}
              />
            </Suspense>
          ) : !showAboutModal ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-slate-50 dark:bg-slate-950">
              <div className="max-w-md space-y-6">
                <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mx-auto" aria-hidden="true">
                  <Info className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">API Key Required</h2>
                <p className="text-slate-600 dark:text-slate-400">
                  To use the map, please provide a Google Maps API Key in the <span className="font-bold text-indigo-600 dark:text-indigo-400">Secrets</span> panel of AI Studio.
                </p>
                <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-sm text-left space-y-2">
                  <p className="font-bold text-slate-800 dark:text-slate-200">How to set it up:</p>
                  <ol className="list-decimal list-inside space-y-1 text-slate-500 dark:text-slate-400">
                    <li><span className="font-semibold">Remix</span> this app</li>
                    <li>Open the <span className="font-semibold">Settings menu</span> and select the <span className="font-semibold">Secrets</span> tab</li>
                    <li>Add a new secret named <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">GOOGLE_MAPS_API_KEY</code></li>
                    <li>Paste your Google Maps API Key as the value</li>
                  </ol>
                  <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium mt-2 italic">
                    The app will automatically detect the key and refresh once added.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 bg-slate-50 dark:bg-slate-950" aria-hidden="true" />
          )}
        </main>
      </div>
    </ErrorBoundary>
  );
}
