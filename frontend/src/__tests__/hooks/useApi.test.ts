import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useApi } from '../../useApi';

// Mock Clerk
vi.mock('@clerk/clerk-react', () => ({
  useAuth: vi.fn(),
}));

// Mock the socket context hook
vi.mock('../../hooks/useSocketContext', () => ({
  useSocketContext: vi.fn(() => ({
    socketId: 'test-socket-id',
  })),
}));

// Mock the API_URL
vi.mock('../../api', () => ({
  API_URL: 'http://localhost:3001/api',
}));

describe('useApi', () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  let mockGetToken: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;

    mockGetToken = vi.fn().mockResolvedValue('mock-token');

    // Mock useAuth properly
    const { useAuth } = await import('@clerk/clerk-react');
    vi.mocked(useAuth).mockReturnValue({
      getToken: mockGetToken,
      isLoaded: true,
      isSignedIn: true,
      userId: 'test-user-id',
      sessionId: 'test-session-id',
      sessionClaims: {} as never,
      actor: null,
      orgId: null,
      orgRole: null,
      orgSlug: null,
      has: vi.fn(),
      signOut: vi.fn(),
    } as ReturnType<typeof useAuth>);
  });

  it('should return an object with an apiFetch function', () => {
    const { result } = renderHook(() => useApi());

    expect(typeof result.current).toBe('object');
    expect(typeof result.current.apiFetch).toBe('function');
  });

  it('should add authorization header when token is available', async () => {
    const { result } = renderHook(() => useApi());

    await result.current.apiFetch('/test-path');

    expect(mockGetToken).toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/test-path',
      {
        headers: new Headers({
          'Authorization': 'Bearer mock-token',
          'X-Socket-Id': 'test-socket-id',
        }),
      }
    );
  });

  it('should handle paths with leading slash', async () => {
    const { result } = renderHook(() => useApi());

    await result.current.apiFetch('/test-path');

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/test-path',
      expect.any(Object)
    );
  });

  it('should handle paths without leading slash', async () => {
    const { result } = renderHook(() => useApi());

    await result.current.apiFetch('test-path');

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/test-path',
      expect.any(Object)
    );
  });

  it('should add socket ID header when available', async () => {
    const { result } = renderHook(() => useApi());

    await result.current.apiFetch('/test-path');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.any(Headers),
      })
    );

    const call = mockFetch.mock.calls[0];
    const headers = call[1].headers;
    expect(headers.get('X-Socket-Id')).toBe('test-socket-id');
  });

  it('should preserve existing headers', async () => {
    const { result } = renderHook(() => useApi());

    await result.current.apiFetch('/test-path', {
      headers: {
        'Custom-Header': 'custom-value',
      },
    });

    const call = mockFetch.mock.calls[0];
    const headers = call[1].headers;
    expect(headers.get('Custom-Header')).toBe('custom-value');
    expect(headers.get('Authorization')).toBe('Bearer mock-token');
  });

  it('should handle missing token gracefully', async () => {
    mockGetToken.mockResolvedValue(null);
    const { result } = renderHook(() => useApi());

    await result.current.apiFetch('/test-path');

    const call = mockFetch.mock.calls[0];
    const headers = call[1].headers;
    expect(headers.has('Authorization')).toBe(false);
  });
});