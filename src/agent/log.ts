interface Logger {
  /** Checking this can be used to avoid constructing a large log message. */
  isLoggingEnabled(): boolean;

  log(message: string): void;
}

class ConsoleLogger implements Logger {
  isLoggingEnabled(): boolean {
    return true;
  }

  log(message: string): void {
    const entry = `[${now()}] ${message}`;
    console.log(entry);
  }
}

class EmptyLogger implements Logger {
  isLoggingEnabled(): boolean {
    return false;
  }

  log(_message: string): void {
    // No-op
  }
}

function now() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

let logger: Logger;

/**
 * Creates a .log file for this session, but also symlinks adorable-cli-latest.log
 * to the current log file so you can reliably run:
 *
 * - Mac/Windows: `tail -F "$TMPDIR/adorable/cli-latest.log"`
 * - Linux: `tail -F ~/.local/adorable/cli-latest.log`
 */
export function initLogger(): Logger {
  if (logger) {
    return logger;
  } else if (!process.env["DEBUG"]) {
    logger = new EmptyLogger();
    return logger;
  }

  logger = new ConsoleLogger();

  return logger;
}

export function log(message: string): void {
  (logger ?? initLogger()).log(message);
}

export function isLoggingEnabled(): boolean {
  return (logger ?? initLogger()).isLoggingEnabled();
}

