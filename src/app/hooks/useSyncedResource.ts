'use client';

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

interface RemoteResource<T> {
  data: T;
  revision: string | null;
}

interface SaveRemoteContext {
  revision: string | null;
}

type SaveRemoteResult<T> =
  | void
  | {
    revision?: string | null;
    conflict?: false;
  }
  | {
    conflict: true;
    data: T;
    revision: string | null;
  };

interface UseSyncedResourceOptions<T> {
  initialValue: T | (() => T);
  loadLocal: () => T | null;
  saveLocal: (value: T) => void;
  loadRemote: () => Promise<T | RemoteResource<T> | null>;
  saveRemote: (value: T, context: SaveRemoteContext) => Promise<SaveRemoteResult<T>>;
  saveDelayMs?: number;
}

interface SyncedResourceState<T> {
  data: T;
  setData: Dispatch<SetStateAction<T>>;
  isLoaded: boolean;
}

function parseRemoteValue<T>(value: T | RemoteResource<T>): RemoteResource<T> {
  if (
    value &&
    typeof value === 'object' &&
    'data' in value &&
    'revision' in value
  ) {
    return value as RemoteResource<T>;
  }

  return {
    data: value as T,
    revision: null,
  };
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
  const revisionRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function initialize(): Promise<void> {
      const remoteValue = await loadRemote();

      if (cancelled) {
        return;
      }

      if (remoteValue !== null) {
        const remoteResource = parseRemoteValue(remoteValue);
        revisionRef.current = remoteResource.revision;
        setData(remoteResource.data);
        saveLocal(remoteResource.data);
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
      void saveRemote(data, { revision: revisionRef.current }).then((result) => {
        if (!result) {
          return;
        }

        if (result.conflict) {
          revisionRef.current = result.revision;
          setData(result.data);
          saveLocal(result.data);
          return;
        }

        if ('revision' in result) {
          revisionRef.current = result.revision ?? null;
        }
      });
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
