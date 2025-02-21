const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, colorize } = format;
const path = require('path');

const myFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level}]: ${message}`;
});

const logger = createLogger({
  level: 'info',
  format: combine(
    timestamp(),
    myFormat
  ),
  transports: [
    new transports.File({ filename: path.join(__dirname, 'logs', 'app.log') }),
    new transports.Console({
      format: combine(
        colorize(),
        timestamp(),
        myFormat
      )
    })
  ]
});

module.exports = logger;
