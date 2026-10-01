import { loadEnvironment } from "./config/environment.js";
import { logger } from "./logging/logger.js";

function main(): void {
  const environment = loadEnvironment();

  logger.info("Lumina foundation started.");
  logger.info(`Environment: ${environment.nodeEnv}`);
}

try {
  main();
} catch (error) {
  logger.fatal(error);
  process.exitCode = 1;
}
