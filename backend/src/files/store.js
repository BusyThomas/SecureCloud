const { FileRecord } = require("./models");
const { HttpError } = require("./errors");

class FileStore {
  constructor() {
    this.files = new Map();
    this.idempotencyRecords = new Map();
  }

  async createIdempotently(input, idempotencyKey, verifyOwner) {
    const key = `${input.ownerId}:${idempotencyKey}`;
    const payload = JSON.stringify(input);
    const previous = this.idempotencyRecords.get(key);
    if (previous) {
      if (previous.payload !== payload) {
        throw new HttpError(
          409,
          "idempotency-key-reused",
          "Idempotency Key Reused",
          "This Idempotency-Key was already used with different file details.",
        );
      }
      return { ...(await previous.promise), replayed: true };
    }

    const record = { payload, promise: null };
    record.promise = (async () => {
      await verifyOwner();
      const file = new FileRecord(input);
      this.files.set(file.fileId, file);
      return {
        file,
        representation: file.asJson(),
        etag: file.etag(),
      };
    })();
    this.idempotencyRecords.set(key, record);

    try {
      return { ...(await record.promise), replayed: false };
    } catch (error) {
      if (this.idempotencyRecords.get(key) === record) {
        this.idempotencyRecords.delete(key);
      }
      throw error;
    }
  }

  get(fileId) {
    return this.files.get(fileId);
  }

  list({
    ownerId,
    folderId,
    search,
    page,
    pageSize,
    sortBy = "createdAt",
    sortOrder = "asc",
  }) {
    const matching = [...this.files.values()]
      .filter((file) => file.ownerId === ownerId && file.status === "active")
      .filter((file) => folderId === undefined || file.folderId === folderId)
      .filter(
        (file) =>
          search === undefined ||
          file.name.toLowerCase().includes(search.toLowerCase()),
      )
      .sort((left, right) => {
        const leftValue = left[sortBy];
        const rightValue = right[sortBy];
        const comparison =
          typeof leftValue === "number"
            ? leftValue - rightValue
            : leftValue.localeCompare(rightValue);
        const ordered = sortOrder === "desc" ? -comparison : comparison;
        return ordered || left.fileId.localeCompare(right.fileId);
      });
    const start = (page - 1) * pageSize;

    return {
      items: matching.slice(start, start + pageSize).map((file) => file.asJson()),
      page,
      pageSize,
      total: matching.length,
    };
  }

  delete(file) {
    file.status = "deleted";
    file.updatedAt = new Date().toISOString();
  }

  restore(file) {
    file.setStatus("active");
  }

  update(file, patch) {
    file.update(patch);
  }
}

module.exports = { FileStore };
