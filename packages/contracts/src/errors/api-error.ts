import { ErrorCode, ErrorCodeType } from './error-codes';

export class AppError extends Error {
  public readonly code: ErrorCodeType | string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(
    message: string,
    options?: {
      code?: ErrorCodeType | string;
      statusCode?: number;
      isOperational?: boolean;
      details?: unknown;
      cause?: unknown;
    },
  ) {
    super(message);
    this.name = 'AppError';
    this.code = options?.code ?? ErrorCode.INTERNAL_SERVER_ERROR;
    this.statusCode = options?.statusCode ?? 500;
    this.isOperational = options?.isOperational ?? true;
    this.details = options?.details;
    if (options?.cause) {
      this.cause = options.cause;
    }
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', code: ErrorCodeType | string = ErrorCode.BAD_REQUEST, details?: unknown) {
    super(message, { code, statusCode: 404, details });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthenticated', code: ErrorCodeType | string = ErrorCode.AUTH_UNAUTHENTICATED, details?: unknown) {
    super(message, { code, statusCode: 401, details });
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden', code: ErrorCodeType | string = ErrorCode.AUTHZ_INSUFFICIENT_PERMISSIONS, details?: unknown) {
    super(message, { code, statusCode: 403, details });
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details?: unknown) {
    super(message, { code: ErrorCode.VALIDATION_FAILED, statusCode: 400, details });
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = 'Too many requests', details?: unknown) {
    super(message, { code: ErrorCode.RATE_LIMIT_EXCEEDED, statusCode: 429, details });
  }
}
