const express = require("express");
const { checkActiveUser } = require("./identity-client");
const { HttpError, problem } = require("./errors");
const { matchesIfMatch, matchesIfNoneMatch } = require("./http");
const { representationEtag, sendRepresentation } = require("./representations");
const {
  isUuid,
  validateCreateFile,
  validatePatchFile,
} = require("./models");

function createFilesRouter(options) {
  const router = express.Router();
  const {
    store,
    identityServiceUrl,
    fetchImpl,
    retries,
    timeoutMs,
    baseDelayMs,
    random,
    sleep,
  } = options;

  router.post("/", async (req, res, next) => {
    const { value, errors } = validateCreateFile(req.body);
    if (errors.length > 0) {
      return problem(
        res,
        new HttpError(
          422,
          "invalid-file",
          "Invalid file",
          errors.map((error) => `${error.field}: ${error.message}`).join(" "),
          errors,
        ),
      );
    }

    const key = req.get("Idempotency-Key");
    if (!key || key.trim().length === 0 || key.length > 128) {
      return problem(
        res,
        new HttpError(
          400,
          "idempotency-key-required",
          "Idempotency-Key Required",
          "Send a non-empty Idempotency-Key header of at most 128 characters.",
        ),
      );
    }

    try {
      const { file, representation, etag } = await store.createIdempotently(
        value,
        key.trim(),
        () =>
          checkActiveUser({
            identityServiceUrl,
            userId: value.ownerId,
            fetchImpl,
            retries,
            timeoutMs,
            baseDelayMs,
            random,
            sleep,
          }),
      );
      res
        .status(201)
        .location(`/api/files/${file.fileId}`)
        .set("ETag", representationEtag(etag, res.locals.responseType));
      return sendRepresentation(res, representation);
    } catch (error) {
      return next(error);
    }
  });

  router.get("/", (req, res) => {
    const { ownerId, folderId, search } = req.query;
    const sortBy = req.query.sortBy === undefined ? "createdAt" : req.query.sortBy;
    const sortOrder = req.query.sortOrder === undefined ? "asc" : req.query.sortOrder;
    const page = req.query.page === undefined ? 1 : Number(req.query.page);
    const pageSize =
      req.query.pageSize === undefined ? 20 : Number(req.query.pageSize);

    if (!isUuid(ownerId)) {
      return problem(
        res,
        new HttpError(
          400,
          "invalid-filter",
          "Invalid Filter",
          "A valid ownerId UUID query parameter is required.",
        ),
      );
    }
    if (folderId !== undefined && !isUuid(folderId)) {
      return problem(
        res,
        new HttpError(
          400,
          "invalid-filter",
          "Invalid Filter",
          "folderId must be a valid UUID.",
        ),
      );
    }
    if (
      !Number.isInteger(page) ||
      page < 1 ||
      !Number.isInteger(pageSize) ||
      pageSize < 1 ||
      pageSize > 100
    ) {
      return problem(
        res,
        new HttpError(
          400,
          "invalid-pagination",
          "Invalid Pagination",
          "page must be positive and pageSize must be between 1 and 100.",
        ),
      );
    }
    if (search !== undefined && typeof search !== "string") {
      return problem(
        res,
        new HttpError(
          400,
          "invalid-filter",
          "Invalid Filter",
          "search must be a single text value.",
        ),
      );
    }
    if (!["name", "createdAt", "updatedAt", "sizeBytes"].includes(sortBy)) {
      return problem(
        res,
        new HttpError(
          400,
          "invalid-sort",
          "Invalid Sort",
          "sortBy must be name, createdAt, updatedAt, or sizeBytes.",
        ),
      );
    }
    if (sortOrder !== "asc" && sortOrder !== "desc") {
      return problem(
        res,
        new HttpError(
          400,
          "invalid-sort",
          "Invalid Sort",
          "sortOrder must be asc or desc.",
        ),
      );
    }

    return sendRepresentation(
      res.status(200),
      store.list({
        ownerId: ownerId.toLowerCase(),
        folderId: folderId ? folderId.toLowerCase() : undefined,
        search,
        page,
        pageSize,
        sortBy,
        sortOrder,
      }),
    );
  });

  router.options("/", (req, res) =>
    res.set("Allow", "GET, HEAD, POST, OPTIONS").status(204).end(),
  );

  router.all("/", (req, res) => {
    res.set("Allow", "GET, HEAD, POST, OPTIONS");
    return problem(
      res,
      new HttpError(
        405,
        "method-not-allowed",
        "Method Not Allowed",
        "The requested method is not supported for the file collection.",
      ),
    );
  });

  router.get("/:fileId", (req, res) => {
    if (!isUuid(req.params.fileId)) {
      return problem(
        res,
        new HttpError(
          400,
          "invalid-file-id",
          "Invalid File ID",
          "The file ID must be a valid UUID.",
        ),
      );
    }
    const file = store.get(req.params.fileId);
    if (!file || file.status !== "active") {
      return problem(
        res,
        new HttpError(404, "file-not-found", "File Not Found", "The file does not exist."),
      );
    }
    const etag = representationEtag(file.etag(), res.locals.responseType);
    res.set({
      ETag: etag,
      "Cache-Control": "private, max-age=60, must-revalidate",
    });
    if (matchesIfNoneMatch(req.get("If-None-Match"), etag)) {
      return res.status(304).end();
    }
    return sendRepresentation(res.status(200), file.asJson());
  });

  router.options("/:fileId", (req, res) =>
    res.set("Allow", "GET, HEAD, PATCH, DELETE, OPTIONS").status(204).end(),
  );

  router.patch("/:fileId", (req, res) => {
    if (!isUuid(req.params.fileId)) {
      return problem(
        res,
        new HttpError(
          400,
          "invalid-file-id",
          "Invalid File ID",
          "The file ID must be a valid UUID.",
        ),
      );
    }
    const { value, errors } = validatePatchFile(req.body);
    if (errors.length > 0) {
      return problem(
        res,
        new HttpError(
          422,
          "invalid-file-update",
          "Invalid File Update",
          errors.map((error) => `${error.field}: ${error.message}`).join(" "),
          errors,
        ),
      );
    }

    const file = store.get(req.params.fileId);
    if (!file || file.status !== "active") {
      return problem(
        res,
        new HttpError(404, "file-not-found", "File Not Found", "The file does not exist."),
      );
    }

    const ifMatch = req.get("If-Match");
    if (ifMatch === undefined) {
      return problem(
        res,
        new HttpError(
          428,
          "precondition-required",
          "Precondition Required",
          "Send the current file ETag in the If-Match header.",
        ),
      );
    }
    const currentEtag = representationEtag(file.etag(), res.locals.responseType);
    if (!matchesIfMatch(ifMatch, currentEtag)) {
      res.set("ETag", currentEtag);
      return problem(
        res,
        new HttpError(
          412,
          "precondition-failed",
          "Precondition Failed",
          "The file has changed. Read it again and retry with its current ETag.",
        ),
      );
    }

    store.update(file, value);
    res
      .status(200)
      .set("ETag", representationEtag(file.etag(), res.locals.responseType));
    return sendRepresentation(res, file.asJson());
  });

  router.delete("/:fileId", (req, res) => {
    if (!isUuid(req.params.fileId)) {
      return problem(
        res,
        new HttpError(
          400,
          "invalid-file-id",
          "Invalid File ID",
          "The file ID must be a valid UUID.",
        ),
      );
    }
    const file = store.get(req.params.fileId);
    if (!file || file.status !== "active") {
      return problem(
        res,
        new HttpError(404, "file-not-found", "File Not Found", "The file does not exist."),
      );
    }
    store.delete(file);
    return res.status(204).end();
  });

  router.post("/:fileId/restore", (req, res) => {
    if (!isUuid(req.params.fileId)) {
      return problem(
        res,
        new HttpError(
          400,
          "invalid-file-id",
          "Invalid File ID",
          "The file ID must be a valid UUID.",
        ),
      );
    }
    const file = store.get(req.params.fileId);
    if (!file) {
      return problem(
        res,
        new HttpError(404, "file-not-found", "File Not Found", "The file does not exist."),
      );
    }
    if (file.status !== "deleted") {
      return problem(
        res,
        new HttpError(
          409,
          "file-state-conflict",
          "File State Conflict",
          "Only a deleted file can be restored.",
        ),
      );
    }
    store.restore(file);
    res
      .status(200)
      .set("ETag", representationEtag(file.etag(), res.locals.responseType));
    return sendRepresentation(res, file.asJson());
  });

  router.options("/:fileId/restore", (req, res) =>
    res.set("Allow", "POST, OPTIONS").status(204).end(),
  );

  router.all("/:fileId/restore", (req, res) => {
    res.set("Allow", "POST, OPTIONS");
    return problem(
      res,
      new HttpError(
        405,
        "method-not-allowed",
        "Method Not Allowed",
        "Use POST to restore a file.",
      ),
    );
  });

  router.all("/:fileId", (req, res) => {
    res.set("Allow", "GET, HEAD, PATCH, DELETE, OPTIONS");
    return problem(
      res,
      new HttpError(
        405,
        "method-not-allowed",
        "Method Not Allowed",
        "The requested method is not supported for this file.",
      ),
    );
  });

  return router;
}

module.exports = { createFilesRouter };
