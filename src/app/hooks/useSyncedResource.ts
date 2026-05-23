'use client';

import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';

interface UseSyncedResourceOptions<T> {
  initialValue: T | (() => T);
  loadLocal: () => T | null;
  saveLocal: (value: T) => void;
  loadRemote: () => Promise<T | null>;
  saveRemote: (value: T) => Promise<void>;
  saveDelayMs?: number;
}

interface SyncedResourceState<T> {
  data: T;
  setData: Dispatch<SetStateAction<T>>;
  isLoaded: boolean;
}

export function useSyncedResource<T>({
  initialValue,
  loadLocal,
  saveLocal,
  loadRemote,
  saveRemote,
  saveDelayMs = 300,
}: UseSyncedResourceOptions<T>): SyncedResourceState<T> {
  const [data, setData] = useState<T>(initialValue);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function initialize(): Promise<void> {
      const remoteValue = await loadRemote();

      if (cancelled) {
        return;
      }

      if (remoteValue !== null) {
        setData(remoteValue);
        saveLocal(remoteValue);
      } else {
        const localValue = loadLocal();

        if (localValue !== null) {
          setData(localValue);
        }
      }

      setIsLoaded(true);
    }

    void initialize();

    return () => {
      cancelled = true;
    };
  }, [loadLocal, loadRemote, saveLocal]);

  useEffect(() => {
    if (!isLoaded) {
      return undefined;
    }

    saveLocal(data);

    const timer = window.setTimeout(() => {
      void saveRemote(data);
    }, saveDelayMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [data, isLoaded, saveDelayMs, saveLocal, saveRemote]);

  return {
    data,
    setData,
    isLoaded,
  };
}
