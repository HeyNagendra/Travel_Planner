/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import AboutModal from './components/AboutModal';
import MapComponent from './components/MapComponent';
import ChatPanel from './components/ChatPanel';
import { Loader2, Info } from 'lucide-react';

export default function App() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [themeOverridden, setThemeOverridden] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);

  useEffect(() => {
    checkApiKey();
    
    // Initialize theme from system preference
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDarkMode(mediaQuery.matches);
    
    const handler = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
    // const handler = (e: MediaQueryListEvent) => {
    //   // Only follow system if the user hasn't manually toggled the theme
    //   setThemeOverridden(prev => {
    //     if (!prev) {
    //       setIsDarkMode(e.matches);
    //     }
    //     return prev;
    //   });
    // };
    
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const handleSetDarkMode = (isDark: boolean) => {
    setIsDarkMode(isDark);
    setThemeOverridden(true);
  };

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const checkApiKey = async () => {
    try {
      const res = await fetch('/api/config');
      const data = await res.json();
      if (data.apiKey) {
        setApiKey(data.apiKey);
        return true;
      }
    } catch (error) {
      console.error('Error checking API key:', error);
    } finally {
      setChecking(false);
    }
    return false;
  };

  // Polling for API key if not present
  useEffect(() => {
    if (apiKey || checking) return;

    const interval = setInterval(async () => {
      const found = await checkApiKey();
      if (found) {
        clearInterval(interval);
      }
    }, 3000); // Check every 3 seconds

    return () => clearInterval(interval);
  }, [apiKey, checking]);

  const handleApiKeySubmit = async (key: string) => {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: key }),
    });

    if (res.ok) {
      setApiKey(key);
    } else {
      throw new Error('Failed to save key');
    }
  };

  const handleResetKey = async () => {
    await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: '' }),
    });
    setApiKey(null);
  };

  useEffect(() => {
    if (!apiKey) return;
    
    // Places UI Kit components often look for a script tag with a key to initialize.
    // When using dynamic loaders, we can help them by ensuring a script tag exists or 
    // by setting the key in a way they can find.
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript && !existingScript.hasAttribute('key')) {
      existingScript.setAttribute('key', apiKey);
    }
  }, [apiKey]);

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
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-indigo-600 focus:text-white focus:rounded-lg focus:font-bold"
      >
        Skip to main content
      </a>

      <div className="flex flex-col h-screen bg-white dark:bg-slate-950 transition-colors duration-500">
        <AboutModal
          isOpen={showAboutModal}
          onClose={() => setShowAboutModal(false)}
        />

        <ChatPanel />

        <main id="main-content" className="flex-1 relative" aria-label="Travel Planner Map">
          {apiKey ? (
            <MapComponent
              apiKey={apiKey}
              isDarkMode={isDarkMode}
              setIsDarkMode={handleSetDarkMode}
            />
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
    </>
  );
}

