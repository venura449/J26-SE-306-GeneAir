const winston = require("winston");

const logFormat = winston.format.printf(
  ({ timestamp, level, message, stack }) => {
    return `[${timestamp}] ${level}: ${message} ${stack}`;
  },
);

const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json(),
  ),

  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), logFormat),
    }),

    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
      format: winston.format.combine(winston.format.uncolorize(), logFormat),
    }),
  ],
});

module.exports = logger;
