/**
 * Global error handler middleware
 * Logs and responds to all unhandled errors in the application in a consistent format.
 */
export const errorHandler = (err, req, res, next) => {
  console.error('Error occurred:', err.stack || err.message || err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    status: statusCode,
    message,
    // include stack trace only in development environment
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};
