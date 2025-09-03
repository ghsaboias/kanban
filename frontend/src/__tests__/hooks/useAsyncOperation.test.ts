import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useAsyncOperation } from '../../hooks/useAsyncOperation';

describe('useAsyncOperation', () => {
  it('should initialize with loading false, no error, and no data', () => {
    const { result } = renderHook(() => useAsyncOperation<string>());
    
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.data).toBeUndefined();
  });

  it('should set loading to true when operation starts', async () => {
    const { result } = renderHook(() => useAsyncOperation<string>());
    
    const asyncOperation = vi.fn().mockResolvedValue('success');
    
    act(() => {
      result.current.execute(asyncOperation);
    });
    
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('should set data and loading false when operation succeeds', async () => {
    const { result } = renderHook(() => useAsyncOperation<string>());
    
    const asyncOperation = vi.fn().mockResolvedValue('success');
    
    await act(async () => {
      await result.current.execute(asyncOperation);
    });
    
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.data).toBe('success');
  });

  it('should set error and loading false when operation fails', async () => {
    const { result } = renderHook(() => useAsyncOperation<string>());
    
    const error = new Error('Test error');
    const asyncOperation = vi.fn().mockRejectedValue(error);
    
    await act(async () => {
      await result.current.execute(asyncOperation);
    });
    
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('Test error');
    expect(result.current.data).toBeUndefined();
  });

  it('should handle string errors', async () => {
    const { result } = renderHook(() => useAsyncOperation<string>());
    
    const asyncOperation = vi.fn().mockRejectedValue('String error');
    
    await act(async () => {
      await result.current.execute(asyncOperation);
    });
    
    expect(result.current.error).toBe('String error');
  });

  it('should reset error when new operation starts', async () => {
    const { result } = renderHook(() => useAsyncOperation<string>());
    
    const failingOperation = vi.fn().mockRejectedValue(new Error('First error'));
    const successOperation = vi.fn().mockResolvedValue('success');
    
    await act(async () => {
      await result.current.execute(failingOperation);
    });
    
    expect(result.current.error).toBe('First error');
    
    act(() => {
      result.current.execute(successOperation);
    });
    
    expect(result.current.error).toBeNull();
  });

  it('should allow manual error clearing', () => {
    const { result } = renderHook(() => useAsyncOperation<string>());
    
    act(() => {
      result.current.setError('Manual error');
    });
    
    expect(result.current.error).toBe('Manual error');
    
    act(() => {
      result.current.clearError();
    });
    
    expect(result.current.error).toBeNull();
  });

  it('should allow manual data setting', () => {
    const { result } = renderHook(() => useAsyncOperation<string>());
    
    act(() => {
      result.current.setData('manual data');
    });
    
    expect(result.current.data).toBe('manual data');
  });

  it('should pass arguments to the operation function', async () => {
    const { result } = renderHook(() => useAsyncOperation<string>());
    
    const asyncOperation = vi.fn().mockResolvedValue('success');
    
    await act(async () => {
      await result.current.execute(asyncOperation, 'arg1', 'arg2', 123);
    });
    
    expect(asyncOperation).toHaveBeenCalledWith('arg1', 'arg2', 123);
  });

  it('should not update state if component unmounts during operation', async () => {
    const { result, unmount } = renderHook(() => useAsyncOperation<string>());
    
    const asyncOperation = vi.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve('success'), 100))
    );
    
    act(() => {
      result.current.execute(asyncOperation);
    });
    
    expect(result.current.loading).toBe(true);
    
    unmount();
    
    // Wait for the promise to resolve
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Should not throw or cause warnings about setting state on unmounted component
  });
});