import { NextFunction, Request, Response } from 'express';
import { ApiResponse } from '../types/api';

export class AppError extends Error {
  public status: number;
  public details?: unknown;

  constructor(message: string, status: number = 500, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
    this.name = 'AppError';
  }
}

export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response<ApiResponse>,
  _next: NextFunction
) => {
  let status = 500;
  let message = 'Erro interno do servidor';
  let details: unknown = undefined;

  if (error instanceof AppError) {
    status = error.status;
    message = error.message;
    details = error.details;
  } else if (error.name === 'ValidationError') {
    status = 400;
    message = 'Dados inválidos fornecidos';
    details = error.message;
  } else if (error.name === 'PrismaClientKnownRequestError') {
    status = 400;
    message = 'Erro na operação do banco de dados';
    details = error.message;
  }

  if (process.env.NODE_ENV !== 'test') {
    console.error(`[${new Date().toISOString()}] ${error.name}: ${error.message}`, error.stack);
  }

  res.status(status).json({
    success: false,
    error: message,
    ...(details ? { details } : {})
  });
};

export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void> | void) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export const notFound = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint não encontrado'
  });
};