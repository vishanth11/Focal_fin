const env = require('../config/env');
const logger = require('../utils/logger');

function notFound(req, res, next) {
  const error = new Error(`Not found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
}

function errorHandler(error, req, res, next) {
  const statusCode = error.statusCode || error.status || 500;
  let message = error.message || 'Internal server error';

  if (error.name === 'ValidationError') {
    message = Object.values(error.errors).map((item) => item.message).join(', ');
  }

  if (error.code === 11000) {
    message = `Duplicate value for ${Object.keys(error.keyValue || {}).join(', ')}`;
  }

  if (statusCode === 404) {
    logger.warn(message, {
      path: req.originalUrl,
      method: req.method
    });
  } else {
    logger.error(message, {
      path: req.originalUrl,
      method: req.method,
      stack: error.stack
    });
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(env.nodeEnv === 'development' ? { stack: error.stack } : {})
  });
}

module.exports = {
  errorHandler,
  notFound
};
