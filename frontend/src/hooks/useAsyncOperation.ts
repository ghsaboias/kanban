import { useState, useCallback, useRef, useEffect } from 'react';

export interface UseAsyncOperationState<T> {
  data: T | undefined;
  loading: boolean;
  error: string | null;
}

export interface UseAsyncOperationReturn<T> extends UseAsyncOperationState<T> {
  execute: <Args extends unknown[]>(
    operation: (...args: Args) => Promise<T>,
    ...args: Args
  ) => Promise<void>;
  setData: (data: T) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export function useAsyncOperation<T = unknown>(): UseAsyncOperationReturn<T> {
  const [state, setState] = useState<UseAsyncOperationState<T>>({
    data: undefined,
    loading: false,
    error: null,
  });

  const isMountedRef = useRef(true);
  const lastOpIdRef = useRef(0);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const execute = useCallback(async <Args extends unknown[]>(
    operation: (...args: Args) => Promise<T>,
    ...args: Args
  ) => {
    if (!isMountedRef.current) return;

    const opId = ++lastOpIdRef.current;

    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
    }));

    try {
      const result = await operation(...args);
      
      if (!isMountedRef.current) return;
      if (opId !== lastOpIdRef.current) return;

      setState(prev => ({
        ...prev,
        data: result,
        loading: false,
        error: null,
      }));
    } catch (error) {
      if (!isMountedRef.current) return;
      if (opId !== lastOpIdRef.current) return;

      const errorMessage = error instanceof Error ? error.message : String(error);
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
    }
  }, []);

  const setData = useCallback((data: T) => {
    if (!isMountedRef.current) return;
    setState(prev => ({ ...prev, data }));
  }, []);

  const setError = useCallback((error: string | null) => {
    if (!isMountedRef.current) return;
    setState(prev => ({ ...prev, error }));
  }, []);

  const clearError = useCallback(() => {
    if (!isMountedRef.current) return;
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    execute,
    setData,
    setError,
    clearError,
  };
}
