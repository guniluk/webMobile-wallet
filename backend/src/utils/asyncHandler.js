/**
 * Wrap asynchronous Express route handlers and automatically catch
 * and pass any errors to the next() error handling middleware.
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
