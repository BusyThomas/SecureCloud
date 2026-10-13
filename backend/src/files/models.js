const { createHash, randomUUID } = require("node:crypto");

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256_PATTERN = /^[0-9a-f]{64}$/i;
const MEDIA_TYPE_PATTERN =
  /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+(?:\s*;\s*[a-z0-9!#$&^_.+-]+=[a-z0-9!#$&^_.+-]+)?$/i;

class FileRecord {
  constructor({ fileId = randomUUID(), ...input }) {
    this.fileId = fileId;
    this.ownerId = input.ownerId;
    this.folderId = input.folderId || null;
    this.name = input.name;
    this.contentType = input.contentType;
    this.sizeBytes = input.sizeBytes;
    this.checksumSha256 = input.checksumSha256.toLowerCase();
    this.status = "active";
    this.revision = 1;
    this.createdAt = new Date().toISOString();
    this.updatedAt = this.createdAt;
    this.storageKey = `private/${this.fileId}/${randomUUID()}`;
  }

  asJson() {
    return {
      id: this.fileId,
      ownerId: this.ownerId,
      folderId: this.folderId,
      name: this.name,
      contentType: this.contentType,
      sizeBytes: this.sizeBytes,
      checksumSha256: this.checksumSha256,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  etag() {
    const representation = JSON.stringify({
      revision: this.revision,
      file: this.asJson(),
    });
    return `"${createHash("sha256").update(representation).digest("hex")}"`;
  }

  update(patch) {
    const changed = Object.entries(patch).some(
      ([field, value]) => this[field] !== value,
    );
    if (!changed) {
      return;
    }

    Object.assign(this, patch);
    this.revision += 1;
    this.updatedAt = new Date(
      Math.max(Date.now(), Date.parse(this.updatedAt) + 1),
    ).toISOString();
  }

  setStatus(status) {
    if (this.status === status) {
      return;
    }
    this.status = status;
    this.revision += 1;
    this.updatedAt = new Date(
      Math.max(Date.now(), Date.parse(this.updatedAt) + 1),
    ).toISOString();
  }
}

function validateCreateFile(input) {
  const errors = [];
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return {
      value: null,
      errors: [{ field: "body", message: "A JSON object is required." }],
    };
  }

  const allowedFields = new Set([
    "ownerId",
    "folderId",
    "name",
    "contentType",
    "sizeBytes",
    "checksumSha256",
  ]);
  for (const field of Object.keys(input)) {
    if (!allowedFields.has(field)) {
      errors.push({
        field,
        message: "This field is not allowed.",
      });
    }
  }

  if (typeof input.ownerId !== "string" || !UUID_PATTERN.test(input.ownerId)) {
    errors.push({
      field: "ownerId",
      message: "A valid user UUID is required.",
    });
  }
  if (
    typeof input.folderId !== "undefined" &&
    input.folderId !== null &&
    (typeof input.folderId !== "string" || !UUID_PATTERN.test(input.folderId))
  ) {
    errors.push({
      field: "folderId",
      message: "The folder reference must be a valid UUID.",
    });
  }
  if (
    typeof input.name !== "string" ||
    input.name.trim().length === 0 ||
    input.name.trim().length > 255
  ) {
    errors.push({
      field: "name",
      message: "A file name between 1 and 255 characters is required.",
    });
  }
  if (
    typeof input.contentType !== "string" ||
    !MEDIA_TYPE_PATTERN.test(input.contentType)
  ) {
    errors.push({
      field: "contentType",
      message: "A valid media type is required.",
    });
  }
  if (
    !Number.isSafeInteger(input.sizeBytes) ||
    input.sizeBytes < 0
  ) {
    errors.push({
      field: "sizeBytes",
      message: "The file size must be a non-negative safe integer.",
    });
  }
  if (
    typeof input.checksumSha256 !== "string" ||
    !SHA256_PATTERN.test(input.checksumSha256)
  ) {
    errors.push({
      field: "checksumSha256",
      message: "A 64-character SHA-256 checksum is required.",
    });
  }

  if (errors.length > 0) {
    return { value: null, errors };
  }

  return {
    value: {
      ownerId: input.ownerId.toLowerCase(),
      folderId: input.folderId ? input.folderId.toLowerCase() : null,
      name: input.name.trim(),
      contentType: input.contentType,
      sizeBytes: input.sizeBytes,
      checksumSha256: input.checksumSha256.toLowerCase(),
    },
    errors: [],
  };
}

function isUuid(value) {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function validatePatchFile(input) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return {
      value: null,
      errors: [{ field: "body", message: "A JSON object is required." }],
    };
  }

  const errors = [];
  const fields = Object.keys(input);
  const allowedFields = new Set(["name", "folderId"]);

  if (fields.length === 0) {
    errors.push({ field: "body", message: "At least one field is required." });
  }
  for (const field of fields) {
    if (!allowedFields.has(field)) {
      errors.push({ field, message: "This field is not allowed." });
    }
  }
  if (
    Object.hasOwn(input, "name") &&
    (typeof input.name !== "string" ||
      input.name.trim().length === 0 ||
      input.name.trim().length > 255)
  ) {
    errors.push({
      field: "name",
      message: "A file name between 1 and 255 characters is required.",
    });
  }
  if (
    Object.hasOwn(input, "folderId") &&
    input.folderId !== null &&
    (typeof input.folderId !== "string" || !UUID_PATTERN.test(input.folderId))
  ) {
    errors.push({
      field: "folderId",
      message: "The folder reference must be a valid UUID or null.",
    });
  }

  if (errors.length > 0) {
    return { value: null, errors };
  }

  const value = {};
  if (Object.hasOwn(input, "name")) {
    value.name = input.name.trim();
  }
  if (Object.hasOwn(input, "folderId")) {
    value.folderId = input.folderId ? input.folderId.toLowerCase() : null;
  }
  return { value, errors: [] };
}

module.exports = {
  FileRecord,
  isUuid,
  validateCreateFile,
  validatePatchFile,
};
