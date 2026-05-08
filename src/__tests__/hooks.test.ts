import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useDarkMode } from '../hooks/useDarkMode';
import { useApiKey } from '../hooks/useApiKey';

// ─── useDarkMode ────────────────────────────────────────────────────────────

describe('useDarkMode', () => {
  beforeEach(() => {
    // Reset dark class
    document.documentElement.classList.remove('dark');
  });

  it('initialises from system preference (light in test env)', () => {
    const { result } = renderHook(() => useDarkMode());
    // setup.ts mocks matchMedia to return matches: false
    expect(result.current.isDarkMode).toBe(false);
  });

  it('applies dark class to <html> when dark mode is enabled', () => {
    const { result } = renderHook(() => useDarkMode());
    act(() => {
      result.current.setDarkMode(true);
    });
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('removes dark class from <html> when switching to light mode', () => {
    const { result } = renderHook(() => useDarkMode());
    act(() => {
      result.current.setDarkMode(true);
    });
    act(() => {
      result.current.setDarkMode(false);
    });
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(result.current.isDarkMode).toBe(false);
  });

  it('isDarkMode state reflects the value set via setDarkMode', () => {
    const { result } = renderHook(() => useDarkMode());
    act(() => {
      result.current.setDarkMode(true);
    });
    expect(result.current.isDarkMode).toBe(true);
  });
});

// ─── useApiKey ──────────────────────────────────────────────────────────────

describe('useApiKey', () => {
  beforeEach(() => {
    vi.mocked(global.fetch).mockReset();
  });

  it('starts in the checking state', () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ apiKey: null }),
    } as Response);
    const { result } = renderHook(() => useApiKey());
    expect(result.current.checking).toBe(true);
    expect(result.current.apiKey).toBe(null);
  });

  it('sets apiKey when the server returns one', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ apiKey: 'test-maps-key' }),
    } as Response);
    const { result } = renderHook(() => useApiKey());
    await waitFor(() => expect(result.current.checking).toBe(false));
    expect(result.current.apiKey).toBe('test-maps-key');
  });

  it('sets apiKey to null when server returns no key', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ apiKey: null }),
    } as Response);
    const { result } = renderHook(() => useApiKey());
    await waitFor(() => expect(result.current.checking).toBe(false));
    expect(result.current.apiKey).toBe(null);
  });

  it('handles network failure gracefully', async () => {
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'));
    const { result } = renderHook(() => useApiKey());
    await waitFor(() => expect(result.current.checking).toBe(false));
    expect(result.current.apiKey).toBe(null);
  });

  it('saveApiKey updates apiKey on success', async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ apiKey: null }) } as Response)
      .mockResolvedValueOnce({ ok: true } as Response);

    const { result } = renderHook(() => useApiKey());
    await waitFor(() => expect(result.current.checking).toBe(false));

    await act(async () => {
      await result.current.saveApiKey('new-key');
    });
    expect(result.current.apiKey).toBe('new-key');
  });

  it('saveApiKey throws when the server responds with an error', async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ apiKey: null }) } as Response)
      .mockResolvedValueOnce({ ok: false } as Response);

    const { result } = renderHook(() => useApiKey());
    await waitFor(() => expect(result.current.checking).toBe(false));

    await expect(
      act(async () => {
        await result.current.saveApiKey('bad-key');
      })
    ).rejects.toThrow('Failed to save key');
  });

  it('resetApiKey clears the apiKey', async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ apiKey: 'existing' }) } as Response)
      .mockResolvedValueOnce({ ok: true } as Response);

    const { result } = renderHook(() => useApiKey());
    await waitFor(() => expect(result.current.apiKey).toBe('existing'));

    await act(async () => {
      await result.current.resetApiKey();
    });
    expect(result.current.apiKey).toBe(null);
  });
});
