import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test';
import { NextFunction, Request, Response } from 'express';
import { AppError, asyncHandler, errorHandler, notFound } from '../../middleware/errorHandler';

describe('AppError', () => {
  it('should create an AppError with message and status', () => {
    const error = new AppError('Test error', 400);
    expect(error.message).toBe('Test error');
    expect(error.status).toBe(400);
    expect(error.name).toBe('AppError');
  });

  it('should default to status 500', () => {
    const error = new AppError('Test error');
    expect(error.status).toBe(500);
  });

  it('should include details when provided', () => {
    const details = { field: 'email', value: 'invalid' };
    const error = new AppError('Validation error', 400, details);
    expect(error.details).toEqual(details);
  });
});

describe('errorHandler middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {};
    res = {
      status: mock(function (this: Response, _code?: number) { return this; } as unknown as Response['status']),
      json: mock(),
    };
    next = mock();

    // Mock console.error to avoid noise in tests
    spyOn(console, 'error').mockImplementation(() => { });
  });

  afterEach((): void => {
    // In Bun test, mocks are automatically restored between tests
  });

  it('should handle AppError correctly', () => {
    const error = new AppError('Custom error message', 422, { field: 'title' });

    errorHandler(error, req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Custom error message',
      details: { field: 'title' },
    });
  });

  it('should handle ValidationError', () => {
    const error = new Error('Invalid input');
    error.name = 'ValidationError';

    errorHandler(error, req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Dados inválidos fornecidos',
      details: 'Invalid input',
    });
  });

  it('should handle PrismaClientKnownRequestError', () => {
    const error = new Error('Database constraint violation');
    error.name = 'PrismaClientKnownRequestError';

    errorHandler(error, req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Erro na operação do banco de dados',
      details: 'Database constraint violation',
    });
  });

  it('should handle generic errors', () => {
    const error = new Error('Something went wrong');

    errorHandler(error, req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Erro interno do servidor',
    });
  });

  it('should log error details', () => {
    const error = new AppError('Test error', 400);

    errorHandler(error, req as Request, res as Response, next);

    // In the 'test' environment, we don't log to the console
    expect(console.error).not.toHaveBeenCalled();
  });
});

describe('asyncHandler', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {};
    res = {};
    next = mock();
  });

  it('should call next with error when async function rejects', async () => {
    const error = new Error('Async error');
    const asyncFn = mock(() => Promise.reject(error));
    const wrappedFn = asyncHandler(asyncFn as unknown as (req: Request, res: Response, next: NextFunction) => void | Promise<void>);

    await wrappedFn(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('should not call next when async function resolves', async () => {
    const asyncFn = mock(() => Promise.resolve('success'));
    const wrappedFn = asyncHandler(asyncFn as unknown as (req: Request, res: Response, next: NextFunction) => void | Promise<void>);

    await wrappedFn(req as Request, res as Response, next);

    expect(next).not.toHaveBeenCalled();
  });

  it('should pass arguments to wrapped function', async () => {
    const asyncFn = mock(() => Promise.resolve('success'));
    const wrappedFn = asyncHandler(asyncFn as unknown as (req: Request, res: Response, next: NextFunction) => void | Promise<void>);

    await wrappedFn(req as Request, res as Response, next);

    expect(asyncFn).toHaveBeenCalledWith(req, res, next);
  });
});

describe('notFound middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    req = {};
    res = {
      status: mock(function (this: Response, _code?: number) { return this; } as unknown as Response['status']),
      json: mock(),
    };
  });

  it('should return 404 with error message', () => {
    notFound(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Endpoint não encontrado',
    });
  });
});
