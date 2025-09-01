import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../../api';

// Mock fetch globally
global.fetch = vi.fn();

const mockFetch = global.fetch as any;

describe('API Performance Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  it('should handle createBoard requests within performance threshold', async () => {
    const mockResponse = {
      success: true,
      data: { id: '1', title: 'Test Board' },
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const startTime = performance.now();
    const result = await api.post('/api/boards', { title: 'Test Board', description: 'Test' });
    const endTime = performance.now();

    const apiTime = endTime - startTime;
    console.log(`createBoard API call time: ${apiTime.toFixed(2)}ms`);

    // API call should complete quickly (under 100ms in test environment)
    expect(apiTime).toBeLessThan(100);
    expect(result).toEqual(mockResponse);
  });

  it('should handle getBoards requests within performance threshold', async () => {
    const mockResponse = {
      success: true,
      data: Array.from({ length: 50 }, (_, i) => ({
        id: `board-${i}`,
        title: `Board ${i + 1}`,
        description: `Description ${i + 1}`,
        _count: { columns: Math.floor(Math.random() * 10) },
      })),
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const startTime = performance.now();
    const result = await api.get('/api/boards');
    const endTime = performance.now();

    const apiTime = endTime - startTime;
    console.log(`getBoards API call time: ${apiTime.toFixed(2)}ms`);

    // API call should complete quickly even with many boards
    expect(apiTime).toBeLessThan(100);
    expect(result.data).toHaveLength(50);
  });

  it('should handle getBoard with large dataset within performance threshold', async () => {
    const mockResponse = {
      success: true,
      data: {
        id: 'board-1',
        title: 'Large Board',
        description: 'Board with many columns and cards',
        columns: Array.from({ length: 10 }, (_, colIndex) => ({
          id: `column-${colIndex}`,
          title: `Column ${colIndex + 1}`,
          position: colIndex,
          cards: Array.from({ length: 25 }, (_, cardIndex) => ({
            id: `card-${colIndex}-${cardIndex}`,
            title: `Card ${cardIndex + 1}`,
            description: `Description for card ${cardIndex + 1}`,
            priority: 'MEDIUM',
            position: cardIndex,
            assignee: null,
          })),
        })),
      },
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const startTime = performance.now();
    const result = await api.get('/api/boards/board-1');
    const endTime = performance.now();

    const apiTime = endTime - startTime;
    console.log(`getBoard (large dataset) API call time: ${apiTime.toFixed(2)}ms`);

    // Should handle large datasets efficiently
    expect(apiTime).toBeLessThan(150);
    expect(result.data.columns).toHaveLength(10);
    expect(result.data.columns[0].cards).toHaveLength(25);
  });

  it('should handle multiple concurrent API calls efficiently', async () => {
    const mockResponse = { success: true, data: { id: '1', title: 'Updated' } };
    
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const operations = [
      () => api.put('/api/boards/1', { title: 'Update 1' }),
      () => api.put('/api/boards/2', { title: 'Update 2' }),
      () => api.put('/api/boards/3', { title: 'Update 3' }),
      () => api.put('/api/boards/4', { title: 'Update 4' }),
      () => api.put('/api/boards/5', { title: 'Update 5' }),
    ];

    const startTime = performance.now();
    const results = await Promise.all(operations.map(op => op()));
    const endTime = performance.now();

    const totalTime = endTime - startTime;
    const avgTime = totalTime / operations.length;

    console.log(`Concurrent API calls total time: ${totalTime.toFixed(2)}ms`);
    console.log(`Average time per call: ${avgTime.toFixed(2)}ms`);

    // Concurrent calls should be efficient
    expect(totalTime).toBeLessThan(200);
    expect(avgTime).toBeLessThan(50);
    expect(results).toHaveLength(5);
    results.forEach(result => expect(result.success).toBe(true));
  });

  it('should handle API error scenarios efficiently', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const startTime = performance.now();
    
    try {
      await api.get('/api/boards/non-existent');
    } catch (error) {
      const endTime = performance.now();
      const errorTime = endTime - startTime;
      
      console.log(`API error handling time: ${errorTime.toFixed(2)}ms`);
      
      // Error handling should be quick
      expect(errorTime).toBeLessThan(50);
      expect(error).toBeInstanceOf(Error);
    }
  });

  it('should handle batch operations efficiently', async () => {
    const mockResponse = { success: true, data: {} };
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    // Simulate batch creation of boards
    const batchSize = 10;
    const operations = Array.from({ length: batchSize }, (_, i) => 
      () => api.post('/api/boards', { title: `Batch Board ${i + 1}` })
    );

    const startTime = performance.now();
    const results = await Promise.all(operations.map(op => op()));
    const endTime = performance.now();

    const batchTime = endTime - startTime;
    const avgTime = batchTime / batchSize;

    console.log(`Batch operations (${batchSize} boards) total time: ${batchTime.toFixed(2)}ms`);
    console.log(`Average time per operation: ${avgTime.toFixed(2)}ms`);

    // Batch operations should be efficient
    expect(batchTime).toBeLessThan(300);
    expect(avgTime).toBeLessThan(50);
    expect(results).toHaveLength(batchSize);
  });

  it('should measure delete operation performance', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    const startTime = performance.now();
    await api.delete('/api/boards/board-1');
    const endTime = performance.now();

    const deleteTime = endTime - startTime;
    console.log(`deleteBoard API call time: ${deleteTime.toFixed(2)}ms`);

    // Delete operations should be quick
    expect(deleteTime).toBeLessThan(100);
  });

  it('should maintain performance with repeated operations', async () => {
    const mockResponse = { success: true, data: [] };
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const iterations = 10;
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      await api.get('/api/boards');
      const endTime = performance.now();
      times.push(endTime - startTime);
    }

    const averageTime = times.reduce((a, b) => a + b, 0) / times.length;
    const maxTime = Math.max(...times);
    const minTime = Math.min(...times);

    console.log(`Repeated operations average time: ${averageTime.toFixed(2)}ms`);
    console.log(`Min time: ${minTime.toFixed(2)}ms, Max time: ${maxTime.toFixed(2)}ms`);

    // Performance should be consistent
    expect(averageTime).toBeLessThan(100);
    expect(maxTime).toBeLessThan(200);
    
    // Variation shouldn't be too high (max shouldn't be more than 20x min for test environment)
    // Note: Test environment timing can be highly variable
    expect(maxTime).toBeLessThan(Math.max(minTime * 20, 1)); // At least 1ms threshold
  });
});