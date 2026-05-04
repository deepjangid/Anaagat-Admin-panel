const nodeEnv = String(process.env.NODE_ENV || "development").trim().toLowerCase();

export const isProduction = nodeEnv === "production";

export const logInfo = (...args) => {
  if (isProduction) return;
  console.log(...args);
};

export const logWarn = (...args) => {
  if (isProduction) return;
  console.warn(...args);
};

export const logError = (...args) => {
  console.error(...args);
};
