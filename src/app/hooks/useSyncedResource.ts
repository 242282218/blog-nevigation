'use client';

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

interface RemoteResource<T> {
  data: T;
  revision: string | null;
}

interface RemoteLoadError {
  error: true;
  message: string;
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
    error: true;
    message: string;
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
  loadRemote: () => Promise<T | RemoteResource<T> | RemoteLoadError | null>;
  saveRemote: (value: T, context: SaveRemoteContext) => Promise<SaveRemoteResult<T>>;
  saveDelayMs?: number;
}

interface SyncedResourceState<T> {
  data: T;
  setData: Dispatch<SetStateAction<T>>;
  isLoaded: boolean;
  lastConflictAt: number | null;
  lastRemoteSaveError: {
    at: number;
    message: string;
  } | null;
  lastRemoteLoadError: {
    at: number;
    message: string;
  } | null;
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

function isRemoteLoadError(value: unknown): value is RemoteLoadError {
  return Boolean(
    value &&
    typeof value === 'object' &&
    'error' in value &&
    (value as RemoteLoadError).error === true &&
    typeof (value as RemoteLoadError).message === 'string'
  );
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
  const initialDataRef = useRef(data);
  const [isLoaded, setIsLoaded] = useState(false);
  const [lastConflictAt, setLastConflictAt] = useState<number | null>(null);
  const [lastRemoteSaveError, setLastRemoteSaveError] = useState<{
    at: number;
    message: string;
  } | null>(null);
  const [lastRemoteLoadError, setLastRemoteLoadError] = useState<{
    at: number;
    message: string;
  } | null>(null);
  const revisionRef = useRef<string | null>(null);
  const skippedRemoteSaveValueRef = useRef<{ value: T } | null>(null);
  const handlersRef = useRef({
    loadLocal,
    saveLocal,
    loadRemote,
    saveRemote,
  });

  useEffect(() => {
    handlersRef.current = {
      loadLocal,
      saveLocal,
      loadRemote,
      saveRemote,
    };
  }, [loadLocal, loadRemote, saveLocal, saveRemote]);

  useEffect(() => {
    let cancelled = false;

    async function initialize(): Promise<void> {
      const handlers = handlersRef.current;
      const remoteValue = await handlers.loadRemote().catch((error: unknown): RemoteLoadError => ({
        error: true,
        message: error instanceof Error ? error.message : '远端数据加载失败。',
      }));

      if (cancelled) {
        return;
      }

      if (isRemoteLoadError(remoteValue)) {
        setLastRemoteLoadError({
          at: Date.now(),
          message: remoteValue.message,
        });

        const localValue = handlers.loadLocal();
        skippedRemoteSaveValueRef.current = { value: localValue ?? initialDataRef.current };

        if (localValue !== null) {
          setData(localValue);
        }
      } else if (remoteValue !== null) {
        const remoteResource = parseRemoteValue(remoteValue);
        revisionRef.current = remoteResource.revision;
        skippedRemoteSaveValueRef.current = { value: remoteResource.data };
        setLastRemoteLoadError(null);
        setData(remoteResource.data);
        handlers.saveLocal(remoteResource.data);
      } else {
        const localValue = handlers.loadLocal();

        if (localValue !== null) {
          skippedRemoteSaveValueRef.current = { value: localValue };
          setData(localValue);
        }
      }

      setIsLoaded(true);
    }

    void initialize();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isLoaded) {
      return undefined;
    }

    handlersRef.current.saveLocal(data);

    if (
      skippedRemoteSaveValueRef.current &&
      Object.is(data, skippedRemoteSaveValueRef.current.value)
    ) {
      skippedRemoteSaveValueRef.current = null;
      return undefined;
    }

    const timer = window.setTimeout(() => {
      const handlers = handlersRef.current;

      void handlers.saveRemote(data, { revision: revisionRef.current }).then((result) => {
        if (!result) {
          return;
        }

        if ('error' in result && result.error) {
          setLastRemoteSaveError({
            at: Date.now(),
            message: result.message,
          });
          return;
        }

        if ('conflict' in result && result.conflict) {
          revisionRef.current = result.revision;
          skippedRemoteSaveValueRef.current = { value: result.data };
          setData(result.data);
          setLastConflictAt(Date.now());
          handlersRef.current.saveLocal(result.data);
          return;
        }

        if ('revision' in result) {
          revisionRef.current = result.revision ?? null;
          setLastRemoteSaveError(null);
        }
      }).catch((error: unknown) => {
        setLastRemoteSaveError({
          at: Date.now(),
          message: error instanceof Error ? error.message : '远端保存失败。',
        });
      });
    }, saveDelayMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [data, isLoaded, saveDelayMs]);

  return {
    data,
    setData,
    isLoaded,
    lastConflictAt,
    lastRemoteSaveError,
    lastRemoteLoadError,
  };
}
