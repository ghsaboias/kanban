import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api } from '../api';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('API Client', () => {
  const baseUrl = 'http://localhost:3001';

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset fetch mock to default successful response
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: 'test' }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('request method', () => {
    it('should make GET request with correct headers', async () => {
      const mockToken = 'test-token-123';
      
      await api.request('/api/test', {
        method: 'GET',
        headers: { Authorization: `Bearer ${mockToken}` },
      });

      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/api/test`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockToken}`,
        },
      });
    });

    it('should make POST request with body', async () => {
      const testData = { title: 'Test Board' };
      const mockToken = 'test-token-123';

      await api.request('/api/boards', {
        method: 'POST',
        body: testData,
        headers: { Authorization: `Bearer ${mockToken}` },
      });

      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/api/boards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockToken}`,
        },
        body: JSON.stringify(testData),
      });
    });

    it('should include X-Socket-Id header when provided', async () => {
      const mockToken = 'test-token-123';
      const socketId = 'socket-123';

      await api.request('/api/test', {
        method: 'GET',
        headers: { 
          Authorization: `Bearer ${mockToken}`,
          'X-Socket-Id': socketId,
        },
      });

      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/api/test`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockToken}`,
          'X-Socket-Id': socketId,
        },
      });
    });

    it('should handle successful response', async () => {
      const mockResponse = { success: true, data: { id: '1', title: 'Test' } };
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await api.request('/api/test');
      expect(result).toEqual(mockResponse);
    });

    it('should throw error for HTTP error status', async () => {
      const errorResponse = { success: false, error: 'Not found' };
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => errorResponse,
      });

      await expect(api.request('/api/test')).rejects.toThrow('Not found');
    });

    it('should throw generic error when no error message in response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({}),
      });

      await expect(api.request('/api/test')).rejects.toThrow('Request failed');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(api.request('/api/test')).rejects.toThrow('Network error');
    });

    it('should handle JSON parsing errors', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      await expect(api.request('/api/test')).rejects.toThrow('Invalid JSON');
    });
  });

  describe('GET method', () => {
    it('should make GET request', async () => {
      const mockToken = 'test-token';
      const mockResponse = { success: true, data: [] };
      
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await api.get('/api/boards', mockToken);

      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/api/boards`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockToken}`,
        },
      });
      expect(result).toEqual(mockResponse);
    });

    it('should make GET request with socket ID', async () => {
      const mockToken = 'test-token';
      const socketId = 'socket-123';

      await api.get('/api/boards', mockToken, socketId);

      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/api/boards`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockToken}`,
          'X-Socket-Id': socketId,
        },
      });
    });
  });

  describe('POST method', () => {
    it('should make POST request with data', async () => {
      const mockToken = 'test-token';
      const testData = { title: 'New Board', description: 'Test' };
      const mockResponse = { success: true, data: { id: '1', ...testData } };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => mockResponse,
      });

      const result = await api.post('/api/boards', testData, mockToken);

      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/api/boards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockToken}`,
        },
        body: JSON.stringify(testData),
      });
      expect(result).toEqual(mockResponse);
    });

    it('should make POST request with socket ID', async () => {
      const mockToken = 'test-token';
      const socketId = 'socket-123';
      const testData = { title: 'New Board' };

      await api.post('/api/boards', testData, mockToken, socketId);

      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/api/boards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockToken}`,
          'X-Socket-Id': socketId,
        },
        body: JSON.stringify(testData),
      });
    });
  });

  describe('PUT method', () => {
    it('should make PUT request with data', async () => {
      const mockToken = 'test-token';
      const testData = { title: 'Updated Board' };
      const mockResponse = { success: true, data: { id: '1', ...testData } };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await api.put('/api/boards/1', testData, mockToken);

      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/api/boards/1`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockToken}`,
        },
        body: JSON.stringify(testData),
      });
      expect(result).toEqual(mockResponse);
    });

    it('should make PUT request with socket ID', async () => {
      const mockToken = 'test-token';
      const socketId = 'socket-123';
      const testData = { title: 'Updated Board' };

      await api.put('/api/boards/1', testData, mockToken, socketId);

      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/api/boards/1`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockToken}`,
          'X-Socket-Id': socketId,
        },
        body: JSON.stringify(testData),
      });
    });
  });

  describe('DELETE method', () => {
    it('should make DELETE request', async () => {
      const mockToken = 'test-token';
      const mockResponse = { success: true, message: 'Deleted successfully' };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await api.delete('/api/boards/1', mockToken);

      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/api/boards/1`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockToken}`,
        },
      });
      expect(result).toEqual(mockResponse);
    });

    it('should make DELETE request with socket ID', async () => {
      const mockToken = 'test-token';
      const socketId = 'socket-123';

      await api.delete('/api/boards/1', mockToken, socketId);

      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/api/boards/1`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockToken}`,
          'X-Socket-Id': socketId,
        },
      });
    });
  });

  describe('Error handling', () => {
    it('should handle 400 Bad Request', async () => {
      const errorResponse = { success: false, error: 'Invalid data', details: 'Title is required' };
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => errorResponse,
      });

      await expect(api.get('/api/test', 'token')).rejects.toThrow('Invalid data');
    });

    it('should handle 401 Unauthorized', async () => {
      const errorResponse = { success: false, error: 'Unauthorized' };
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => errorResponse,
      });

      await expect(api.get('/api/test', 'invalid-token')).rejects.toThrow('Unauthorized');
    });

    it('should handle 404 Not Found', async () => {
      const errorResponse = { success: false, error: 'Board not found' };
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => errorResponse,
      });

      await expect(api.get('/api/boards/nonexistent', 'token')).rejects.toThrow('Board not found');
    });

    it('should handle 500 Internal Server Error', async () => {
      const errorResponse = { success: false, error: 'Internal server error' };
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => errorResponse,
      });

      await expect(api.get('/api/test', 'token')).rejects.toThrow('Internal server error');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty response body', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 204,
        json: async () => null,
      });

      const result = await api.delete('/api/test', 'token');
      expect(result).toBeNull();
    });

    it('should handle missing Authorization header gracefully', async () => {
      await api.request('/api/test', { method: 'GET' });

      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/api/test`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });

    it('should merge custom headers with default headers', async () => {
      const customHeaders = { 
        'Custom-Header': 'value',
        'Authorization': 'Bearer custom-token',
      };

      await api.request('/api/test', { 
        method: 'GET',
        headers: customHeaders,
      });

      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/api/test`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Custom-Header': 'value',
          'Authorization': 'Bearer custom-token',
        },
      });
    });
  });
});