'use client';

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

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
  const [data, setStateData] = useState<T>(initialValue);
  const dataRef = useRef(data);
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
  const dataGenerationRef = useRef(0);
  const remoteSyncedGenerationRef = useRef(0);
  const saveSequenceRef = useRef(0);
  const saveTimerRef = useRef<number | null>(null);
  const queuedSaveRef = useRef<{ value: T; generation: number } | null>(null);
  const inFlightSaveRef = useRef<{ sequence: number; generation: number } | null>(null);
  const mountedRef = useRef(true);
  const handlersRef = useRef({
    loadLocal,
    saveLocal,
    loadRemote,
    saveRemote,
  });

  const setData = useCallback<Dispatch<SetStateAction<T>>>((value) => {
    const previous = dataRef.current;
    const next = typeof value === 'function'
      ? (value as (previous: T) => T)(previous)
      : value;

    if (Object.is(previous, next)) {
      return;
    }

    dataGenerationRef.current += 1;
    dataRef.current = next;
    setStateData(next);
  }, []);

  const clearPendingSaveTimer = useCallback(() => {
    if (saveTimerRef.current === null) {
      return;
    }

    window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = null;
  }, []);

  const flushRemoteSaveQueue = useCallback(() => {
    if (inFlightSaveRef.current || !queuedSaveRef.current) {
      return;
    }

    const saveRequest = queuedSaveRef.current;
    const sequence = saveSequenceRef.current + 1;
    saveSequenceRef.current = sequence;
    queuedSaveRef.current = null;
    inFlightSaveRef.current = {
      sequence,
      generation: saveRequest.generation,
    };

    const handlers = handlersRef.current;

    void handlers.saveRemote(saveRequest.value, { revision: revisionRef.current }).then((result) => {
      if (!mountedRef.current || inFlightSaveRef.current?.sequence !== sequence) {
        return;
      }

      if (!result) {
        if (dataGenerationRef.current === saveRequest.generation) {
          remoteSyncedGenerationRef.current = saveRequest.generation;
          setLastRemoteSaveError(null);
        }
        return;
      }

      if ('error' in result && result.error) {
        if (dataGenerationRef.current === saveRequest.generation && !queuedSaveRef.current) {
          setLastRemoteSaveError({
            at: Date.now(),
            message: result.message,
          });
        }
        return;
      }

      if ('conflict' in result && result.conflict) {
        revisionRef.current = result.revision;

        if (dataGenerationRef.current === saveRequest.generation && !queuedSaveRef.current) {
          remoteSyncedGenerationRef.current = saveRequest.generation;
          skippedRemoteSaveValueRef.current = { value: result.data };
          dataRef.current = result.data;
          setStateData(result.data);
          setLastConflictAt(Date.now());
          handlersRef.current.saveLocal(result.data);
        }
        return;
      }

      if ('revision' in result) {
        revisionRef.current = result.revision ?? null;
      }

      if (dataGenerationRef.current === saveRequest.generation) {
        remoteSyncedGenerationRef.current = saveRequest.generation;
        setLastRemoteSaveError(null);
      }
    }).catch((error: unknown) => {
      if (!mountedRef.current || inFlightSaveRef.current?.sequence !== sequence) {
        return;
      }

      if (dataGenerationRef.current === saveRequest.generation && !queuedSaveRef.current) {
        setLastRemoteSaveError({
          at: Date.now(),
          message: error instanceof Error ? error.message : '远端保存失败。',
        });
      }
    }).finally(() => {
      if (inFlightSaveRef.current?.sequence === sequence) {
        inFlightSaveRef.current = null;
      }

      if (!mountedRef.current) {
        return;
      }

      if (queuedSaveRef.current && saveTimerRef.current === null) {
        flushRemoteSaveQueue();
      }
    });
  }, []);

  const queueRemoteSave = useCallback((value: T, generation: number, delayMs: number) => {
    queuedSaveRef.current = { value, generation };
    clearPendingSaveTimer();

    saveTimerRef.current = window.setTimeout(() => {
      saveTimerRef.current = null;
      flushRemoteSaveQueue();
    }, delayMs);
  }, [clearPendingSaveTimer, flushRemoteSaveQueue]);

  useEffect(() => {
    handlersRef.current = {
      loadLocal,
      saveLocal,
      loadRemote,
      saveRemote,
    };
  }, [loadLocal, loadRemote, saveLocal, saveRemote]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      clearPendingSaveTimer();

      if (saveLocalTimerRef.current !== null) {
        window.clearTimeout(saveLocalTimerRef.current);
        saveLocalTimerRef.current = null;
      }
    };
  }, [clearPendingSaveTimer]);

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
          dataRef.current = localValue;
          setStateData(localValue);
        }
      } else if (remoteValue !== null) {
        const remoteResource = parseRemoteValue(remoteValue);
        revisionRef.current = remoteResource.revision;
        skippedRemoteSaveValueRef.current = { value: remoteResource.data };
        setLastRemoteLoadError(null);
        dataRef.current = remoteResource.data;
        setStateData(remoteResource.data);
        handlers.saveLocal(remoteResource.data);
      } else {
        const localValue = handlers.loadLocal();

        if (localValue !== null) {
          skippedRemoteSaveValueRef.current = { value: localValue };
          dataRef.current = localValue;
          setStateData(localValue);
        }
      }

      setIsLoaded(true);
    }

    void initialize();

    return () => {
      cancelled = true;
    };
  }, []);

  const saveLocalTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isLoaded) {
      return undefined;
    }

    const generation = dataGenerationRef.current;

    if (saveLocalTimerRef.current !== null) {
      window.clearTimeout(saveLocalTimerRef.current);
    }

    saveLocalTimerRef.current = window.setTimeout(() => {
      saveLocalTimerRef.current = null;
      handlersRef.current.saveLocal(data);
    }, 150);

    if (
      skippedRemoteSaveValueRef.current &&
      Object.is(data, skippedRemoteSaveValueRef.current.value)
    ) {
      skippedRemoteSaveValueRef.current = null;
      remoteSyncedGenerationRef.current = generation;
      return undefined;
    }

    if (generation <= remoteSyncedGenerationRef.current) {
      return undefined;
    }

    queueRemoteSave(data, generation, saveDelayMs);

    return undefined;
  }, [data, isLoaded, queueRemoteSave, saveDelayMs]);

  return {
    data,
    setData,
    isLoaded,
    lastConflictAt,
    lastRemoteSaveError,
    lastRemoteLoadError,
  };
}
