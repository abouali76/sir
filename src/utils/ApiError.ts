export class ApiError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public details?: unknown;

  constructor(statusCode: number, message: string, isOperational = true, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, details?: unknown) {
    return new ApiError(400, message, true, details);
  }
  static unauthorized(message = 'غير مصرح لك بالدخول') {
    return new ApiError(401, message);
  }
  static forbidden(message = 'ليست لديك صلاحية لتنفيذ هذا الإجراء') {
    return new ApiError(403, message);
  }
  static notFound(message = 'العنصر المطلوب غير موجود') {
    return new ApiError(404, message);
  }
  static conflict(message: string) {
    return new ApiError(409, message);
  }
  static internal(message = 'حدث خطأ داخلي في الخادم') {
    return new ApiError(500, message, false);
  }
}
