import pino from "pino";

const logger = pino();
logger.info(
  "Worker scaffold only; no consumer or background work is configured.",
);
