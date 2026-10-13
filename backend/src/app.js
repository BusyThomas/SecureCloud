const express = require("express");
const cors = require("cors");
const compression = require("compression");
const helmet = require("helmet");
const morgan = require("morgan");
require("dotenv").config();

const { FileStore } = require("./files/store");
const { createFilesRouter } = require("./files/routes");
const { errorHandler, HttpError, problem } = require("./files/errors");
const {
  createRateLimiter,
  overrideMethod,
  requireAuthorization,
  requireAccept,
} = require("./files/http");

function createApp(options = {}) {
  const app = express();
  const store = options.store || new FileStore();

  app.use(helmet());
  app.use(compression());
  app.use(
    cors({
      origin: "*",
      methods: ["GET", "HEAD", "POST", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: [
        "Authorization",
        "Content-Type",
        "Idempotency-Key",
        "If-Match",
        "If-None-Match",
        "X-HTTP-Method-Override",
      ],
      exposedHeaders: [
        "Allow",
        "ETag",
        "Location",
        "Retry-After",
        "X-RateLimit-Limit",
        "X-RateLimit-Remaining",
      ],
      preflightContinue: true,
    }),
  );
  app.use(
    "/api/files",
    createRateLimiter({
      limit: options.rateLimitLimit,
      windowMs: options.rateLimitWindowMs,
      now: options.now,
    }),
    requireAccept,
    (req, res, next) => {
      res.set("Cache-Control", "no-store");
      next();
    },
  );
  app.use(express.json({ limit: "1mb" }));
  if (options.logRequests !== false) {
    app.use(morgan("dev"));
  }

  app.get("/", (req, res) => {
    res.json({
      success: true,
      message: "SecureCloud API is running",
    });
  });

  app.use(
    "/api/files",
    overrideMethod,
    requireAuthorization,
    createFilesRouter({
      store,
      identityServiceUrl:
        options.identityServiceUrl || process.env.IDENTITY_SERVICE_URL,
      fetchImpl: options.fetchImpl || global.fetch,
      retries: options.retries,
      timeoutMs: options.timeoutMs,
      baseDelayMs: options.baseDelayMs,
      random: options.random,
      sleep: options.sleep,
    }),
  );

  app.use((req, res) =>
    problem(
      res,
      new HttpError(404, "route-not-found", "Route Not Found", "The requested API route does not exist."),
    ),
  );
  app.use(errorHandler);
  return app;
}

if (require.main === module) {
  const port = Number(process.env.PORT || 5000);
  createApp().listen(port, () => {
    console.log(`SecureCloud API running on port ${port}`);
  });
}

module.exports = { createApp };
