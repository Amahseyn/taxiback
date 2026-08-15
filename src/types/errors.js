class AppError extends Error {
  constructor(statusCode, message, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

class BadRequestError extends AppError {
  constructor(message) {
    super(400, message);
  }
}

class UnauthorizedError extends AppError {
  constructor(message) {
    super(401, message);
  }
}

class ForbiddenError extends AppError {
  constructor(message) {
    super(403, message);
  }
}

class NotFoundError extends AppError {
  constructor(message) {
    super(404, message);
  }
}

class ConflictError extends AppError {
  constructor(message) {
    super(409, message);
  }
}

class InternalServerError extends AppError {
  constructor(message) {
    super(500, message);
  }
}

module.exports = {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  InternalServerError,
};
