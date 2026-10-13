class HttpError extends Error {
  constructor(status, type, title, detail, errors = [], retryAfter = 1) {
    super(detail);
    this.name = "HttpError";
    this.status = status;
    this.type = type;
    this.title = title;
    this.errors = errors;
    this.retryAfter = retryAfter;
  }
}

function problem(res, error) {
  if (error.status === 429 || error.status === 503) {
    res.set("Retry-After", String(error.retryAfter));
  }
  const body = {
    type: `https://securecloud.example.com/problems/${error.type}`,
    title: error.title,
    status: error.status,
    detail: error.message,
  };
  if (error.errors.length > 0) {
    body.errors = error.errors;
  }
  return res
    .status(error.status)
    .type("application/problem+json")
    .json(body);
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }
  if (error instanceof HttpError) {
    return problem(res, error);
  }
  if (error && error.type === "entity.parse.failed") {
    return problem(
      res,
      new HttpError(400, "malformed-json", "Malformed JSON", "The request body is not valid JSON."),
    );
  }
  if (error && error.type === "entity.too.large") {
    return problem(
      res,
      new HttpError(413, "request-too-large", "Request too large", "The JSON request body exceeds 1 MB."),
    );
  }

  console.error("Unhandled request error:", error);
  return problem(
    res,
    new HttpError(
      500,
      "internal-error",
      "Internal Server Error",
      "The request could not be completed.",
    ),
  );
}

module.exports = { HttpError, errorHandler, problem };
