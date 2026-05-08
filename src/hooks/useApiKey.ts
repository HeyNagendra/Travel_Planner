import { useState, useEffect, useCallback } from 'react';

interface UseApiKeyReturn {
  apiKey: string | null;
  checking: boolean;
  saveApiKey: (key: string) => Promise<void>;
  resetApiKey: () => Promise<void>;
}

export function useApiKey(): UseApiKeyReturn {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  const checkApiKey = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/config');
      const data = await res.json() as { apiKey?: string };
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
  }, []);

  useEffect(() => {
    checkApiKey();
  }, [checkApiKey]);

  useEffect(() => {
    if (apiKey || checking) return;
    const interval = setInterval(async () => {
      const found = await checkApiKey();
      if (found) clearInterval(interval);
    }, 3000);
    return () => clearInterval(interval);
  }, [apiKey, checking, checkApiKey]);

  const saveApiKey = async (key: string): Promise<void> => {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: key }),
    });
    if (!res.ok) throw new Error('Failed to save key');
    setApiKey(key);
  };

  const resetApiKey = async (): Promise<void> => {
    await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: '' }),
    });
    setApiKey(null);
  };

  return { apiKey, checking, saveApiKey, resetApiKey };
}
