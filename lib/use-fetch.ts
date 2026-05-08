'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Tiny stale-while-revalidate fetcher.
 *
 * - Returns cached data instantly on second mount with the same `url`.
 * - Refetches in background to refresh cache.
 * - Dedupes concurrent requests for the same url.
 * - Bumping `bumpKey` (a number you increment after mutations) forces a refresh.
 */

type Entry<T> = { data: T | null; ts: number };

const CACHE = new Map<string, Entry<unknown>>();
const INFLIGHT = new Map<string, Promise<unknown>>();
const STALE_MS = 30_000; // serve cached without revalidate if newer than this

export function bustCache(prefix?: string) {
  if (!prefix) { CACHE.clear(); INFLIGHT.clear(); return; }
  for (const k of CACHE.keys()) if (k.startsWith(prefix)) CACHE.delete(k);
  for (const k of INFLIGHT.keys()) if (k.startsWith(prefix)) INFLIGHT.delete(k);
}

async function doFetch<T>(url: string): Promise<T> {
  const existing = INFLIGHT.get(url);
  if (existing) return existing as Promise<T>;
  const p = fetch(url)
    .then(r => r.json())
    .then(data => {
      CACHE.set(url, { data, ts: Date.now() });
      INFLIGHT.delete(url);
      return data as T;
    })
    .catch(err => {
      INFLIGHT.delete(url);
      throw err;
    });
  INFLIGHT.set(url, p);
  return p;
}

export function useFetch<T>(url: string | null, bumpKey = 0): { data: T | null; loading: boolean } {
  const cached = url ? (CACHE.get(url) as Entry<T> | undefined) : undefined;
  const [data, setData] = useState<T | null>(cached?.data ?? null);
  const [loading, setLoading] = useState<boolean>(!cached);
  const lastUrl = useRef<string | null>(null);

  useEffect(() => {
    if (!url) { setData(null); setLoading(false); return; }

    // Show cached immediately on URL change
    const c = CACHE.get(url) as Entry<T> | undefined;
    if (c) {
      setData(c.data);
      setLoading(false);
    } else {
      setData(null);
      setLoading(true);
    }
    lastUrl.current = url;

    const fresh = c && Date.now() - c.ts < STALE_MS && bumpKey === 0;
    if (fresh) return;

    let cancelled = false;
    doFetch<T>(url)
      .then(d => {
        if (cancelled || lastUrl.current !== url) return;
        setData(d);
        setLoading(false);
      })
      .catch(err => {
        if (cancelled || lastUrl.current !== url) return;
        console.error(err);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [url, bumpKey]);

  return { data, loading };
}
