const { HttpError } = require("./errors");

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatus(status) {
  return status === 408 || status === 429 || status >= 500;
}

async function checkActiveUser({
  identityServiceUrl,
  userId,
  fetchImpl = global.fetch,
  retries = 3,
  timeoutMs = 1000,
  baseDelayMs = 100,
  random = Math.random,
  sleep = delay,
}) {
  if (!identityServiceUrl) {
    throw new HttpError(
      503,
      "identity-service-unavailable",
      "Identity Service Unavailable",
      "Set IDENTITY_SERVICE_URL to the Identity Service base URL.",
    );
  }

  let baseUrl;
  try {
    baseUrl = new URL(identityServiceUrl);
  } catch {
    throw new HttpError(
      503,
      "identity-service-unavailable",
      "Identity Service Unavailable",
      "IDENTITY_SERVICE_URL must be a valid HTTP or HTTPS URL.",
    );
  }
  if (!["http:", "https:"].includes(baseUrl.protocol)) {
    throw new HttpError(
      503,
      "identity-service-unavailable",
      "Identity Service Unavailable",
      "IDENTITY_SERVICE_URL must use HTTP or HTTPS.",
    );
  }

  const target = new URL(
    `/users/${encodeURIComponent(userId)}/access-status`,
    baseUrl,
  );

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let response;
    try {
      response = await fetchImpl(target, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
    } catch {
      clearTimeout(timeout);
      if (attempt === retries) {
        throw new HttpError(
          503,
          "identity-service-unavailable",
          "Identity Service Unavailable",
          "The Identity Service could not be reached after safe retries.",
        );
      }
      const backoff = baseDelayMs * 2 ** attempt;
      await sleep(backoff + random() * backoff);
      continue;
    }

    if (response.ok) {
      let result;
      try {
        result = await response.json();
      } catch {
        clearTimeout(timeout);
        if (controller.signal.aborted) {
          if (attempt < retries) {
            const backoff = baseDelayMs * 2 ** attempt;
            await sleep(backoff + random() * backoff);
            continue;
          }
          throw new HttpError(
            503,
            "identity-service-unavailable",
            "Identity Service Unavailable",
            "The Identity Service response timed out.",
          );
        }
        throw new HttpError(
          502,
          "invalid-identity-response",
          "Invalid Identity Service Response",
          "The Identity Service returned an invalid response.",
        );
      }
      clearTimeout(timeout);
      if (result.status === "active") {
        return;
      }
      throw new HttpError(
        422,
        "owner-unavailable",
        "Owner Unavailable",
        "The file owner account is not active.",
      );
    }

    clearTimeout(timeout);
    if (response.status === 404) {
      throw new HttpError(
        422,
        "owner-unavailable",
        "Owner Unavailable",
        "The file owner account does not exist.",
      );
    }

    if (isRetryableStatus(response.status) && attempt < retries) {
      const backoff = baseDelayMs * 2 ** attempt;
      await sleep(backoff + random() * backoff);
      continue;
    }

    if (isRetryableStatus(response.status)) {
      throw new HttpError(
        503,
        "identity-service-unavailable",
        "Identity Service Unavailable",
        "The Identity Service could not complete the account check.",
      );
    }
    throw new HttpError(
      502,
      "identity-service-rejected",
      "Identity Service Error",
      "The Identity Service rejected the account check.",
    );
  }

  throw new HttpError(
    503,
    "identity-service-unavailable",
    "Identity Service Unavailable",
    "The Identity Service could not be reached.",
  );
}

module.exports = { checkActiveUser };
