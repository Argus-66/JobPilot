import fs from 'fs';
import path from 'path';

/**
 * Logger utility for tracking automation progress
 */
class Logger {
  constructor() {
    this.logDir = path.resolve('logs');
    this.ensureLogDirectory();
    this.sessionLog = path.join(this.logDir, `session-${this.getTimestamp()}.log`);
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  getTimestamp() {
    return new Date().toISOString().replace(/:/g, '-').split('.')[0];
  }

  getCurrentTime() {
    return new Date().toLocaleString();
  }

  log(message, level = 'INFO') {
    const logMessage = `[${this.getCurrentTime()}] [${level}] ${message}`;
    console.log(logMessage);
    this.writeToFile(logMessage);
  }

  info(message) {
    this.log(message, 'INFO');
  }

  success(message) {
    this.log(`✓ ${message}`, 'SUCCESS');
  }

  error(message) {
    this.log(`✗ ${message}`, 'ERROR');
  }

  warn(message) {
    this.log(`⚠ ${message}`, 'WARN');
  }

  debug(message) {
    this.log(message, 'DEBUG');
  }

  writeToFile(message) {
    try {
      fs.appendFileSync(this.sessionLog, message + '\n');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  separator() {
    const line = '='.repeat(80);
    console.log(line);
    this.writeToFile(line);
  }
}

export default new Logger();
