'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { getApiBaseUrl } from '@/lib/api';

interface SSEOptions {
  token?: string;
  onEvent?: (event: { event: string; data: string }) => void;
}

/**
 * SSE hook using fetch + ReadableStream to pass token via Authorization header
 * instead of URL query parameter (which would expose it in logs).
 */
export function useSSE(clientId: string | null, options?: SSEOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const onEventRef = useRef(options?.onEvent);
  onEventRef.current = options?.onEvent;

  const connect = useCallback(async () => {
    if (!clientId) return;

    // Clean up existing connection
    abortRef.current?.abort();

    const controller = new AbortController();
    abortRef.current = controller;

    const baseUrl = getApiBaseUrl();
    const headers: Record<string, string> = {};
    if (options?.token) {
      headers['Authorization'] = `Bearer ${options.token}`;
    }

    try {
      const res = await fetch(`${baseUrl}/chat/stream/${encodeURIComponent(clientId)}`, {
        headers,
        signal: controller.signal,
      });

      if (!res.ok) {
        setIsConnected(false);
        return;
      }

      setIsConnected(true);

      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let currentEvent = '';
        let currentData = '';

        for (const line of lines) {
          if (line.startsWith('event:')) {
            currentEvent = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            currentData = line.slice(5).trim();
          } else if (line === '' && (currentEvent || currentData)) {
            onEventRef.current?.({ event: currentEvent, data: currentData });
            currentEvent = '';
            currentData = '';
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setIsConnected(false);
      }
    }
  }, [clientId, options?.token]);

  useEffect(() => {
    connect();
    return () => {
      abortRef.current?.abort();
    };
  }, [connect]);

  return { isConnected, reconnect: connect };
}
