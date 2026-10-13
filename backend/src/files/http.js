const { HttpError, problem } = require("./errors");

function createRateLimiter({
  limit = 100,
  windowMs = 60_000,
  now = Date.now,
} = {}) {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new TypeError("Rate limit must be a positive integer.");
  }
  if (!Number.isInteger(windowMs) || windowMs < 1) {
    throw new TypeError("Rate-limit window must be a positive integer.");
  }

  const clients = new Map();

  return (req, res, next) => {
    const currentTime = now();
    const clientId = req.ip || req.socket.remoteAddress;
    let client = clients.get(clientId);
    if (!client || client.resetAt <= currentTime) {
      client = { count: 0, resetAt: currentTime + windowMs };
      clients.set(clientId, client);
    }

    res.set("Cache-Control", "no-store");
    const remaining = Math.max(0, limit - client.count);
    res.set("X-RateLimit-Limit", String(limit));
    res.set("X-RateLimit-Remaining", String(remaining));

    if (client.count >= limit) {
      const retryAfter = Math.max(
        1,
        Math.ceil((client.resetAt - currentTime) / 1000),
      );
      res.set("Retry-After", String(retryAfter));
      return problem(
        res,
        new HttpError(
          429,
          "rate-limit-exceeded",
          "Too Many Requests",
          "The client request limit has been reached. Try again after the indicated delay.",
          [],
          retryAfter,
        ),
      );
    }

    client.count += 1;
    res.set("X-RateLimit-Remaining", String(limit - client.count));
    return next();
  };
}

function requireAccept(req, res, next) {
  res.vary("Accept");
  if (req.method === "OPTIONS") {
    return next();
  }
  const accepted = req.accepts(["application/json", "application/xml"]);
  if (accepted) {
    res.locals.responseType = accepted;
    return next();
  }
  return problem(
    res,
    new HttpError(
      406,
      "not-acceptable",
      "Not Acceptable",
      "This service can return application/json or application/xml.",
    ),
  );
}

function requireAuthorization(req, res, next) {
  if (req.method === "OPTIONS") {
    return next();
  }

  const authorization = req.get("Authorization");
  if (typeof authorization !== "string" || authorization.trim().length === 0) {
    res.set("WWW-Authenticate", 'Bearer realm="SecureCloud API"');
    return problem(
      res,
      new HttpError(
        401,
        "authentication-required",
        "Unauthorized",
        "A non-empty Authorization header is required.",
      ),
    );
  }
  return next();
}

function overrideMethod(req, res, next) {
  const requestedMethod = req.get("X-HTTP-Method-Override");
  if (req.method !== "POST" || requestedMethod === undefined) {
    return next();
  }

  if (!/^\/[^/]+\/?$/.test(req.path)) {
    return problem(
      res,
      new HttpError(
        400,
        "invalid-method-override",
        "Invalid Method Override",
        "Method override is supported only on a single file resource.",
      ),
    );
  }

  const method = requestedMethod.trim().toUpperCase();
  if (!["PATCH", "DELETE"].includes(method)) {
    return problem(
      res,
      new HttpError(
        400,
        "invalid-method-override",
        "Invalid Method Override",
        "X-HTTP-Method-Override supports PATCH or DELETE on a file resource.",
      ),
    );
  }
  req.method = method;
  return next();
}

function matchesIfMatch(header, etag) {
  if (typeof header !== "string") {
    return false;
  }
  return header.split(",").some((candidate) => {
    const tag = candidate.trim();
    return tag === "*" || (tag === etag && !tag.startsWith("W/"));
  });
}

function matchesIfNoneMatch(header, etag) {
  if (typeof header !== "string") {
    return false;
  }
  return header.split(",").some((candidate) => {
    const tag = candidate.trim();
    return tag === "*" || tag.replace(/^W\//, "") === etag;
  });
}

module.exports = {
  createRateLimiter,
  matchesIfMatch,
  matchesIfNoneMatch,
  overrideMethod,
  requireAuthorization,
  requireAccept,
};
