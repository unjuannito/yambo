export interface ErrorResponse {
  id: string;
  timestamp: string;
  type: string;
  message: string;
  path: string;
  status: number;
  details?: string;
}

export class ApiError extends Error {
  public id: string;
  public timestamp: string;
  public type: string;
  public path: string;
  public status: number;
  public details?: string;

  constructor(errorResponse: ErrorResponse) {
    super(errorResponse.message);
    this.name = 'ApiError';
    this.id = errorResponse.id;
    this.timestamp = errorResponse.timestamp;
    this.type = errorResponse.type;
    this.path = errorResponse.path;
    this.status = errorResponse.status;
    this.details = errorResponse.details;
  }

  /**
   * Get a user-friendly error message
   */
  getUserMessage(): string {
    return this.message;
  }

  /**
   * Get detailed error information for debugging
   */
  getDebugInfo(): string {
    const parts = [
      `Error ID: ${this.id}`,
      `Type: ${this.type}`,
      `Status: ${this.status}`,
      `Path: ${this.path}`,
      `Time: ${this.timestamp}`,
    ];

    if (this.details) {
      parts.push(`Details: ${this.details}`);
    }

    return parts.join('\n');
  }

  /**
   * Check if error is a specific type
   */
  isType(type: string): boolean {
    return this.type === type;
  }

  /**
   * Check if error is authentication related
   */
  isAuthError(): boolean {
    return this.type === 'AUTHENTICATION_FAILED' ||
           this.type === 'UNAUTHORIZED' ||
           this.type === 'ACCESS_DENIED';
  }

  /**
   * Check if error is validation related
   */
  isValidationError(): boolean {
    return this.type === 'VALIDATION_ERROR';
  }
}

/**
 * Extract a user-friendly error message from any caught error.
 * Centralises error message extraction across the entire frontend.
 */
export function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.getUserMessage();
  if (err instanceof Error) return err.message;
  return fallback;
}
