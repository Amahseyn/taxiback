const rateLimitMiddleware = (req, res, next) => {
  next();
};

module.exports = { rateLimitMiddleware };
