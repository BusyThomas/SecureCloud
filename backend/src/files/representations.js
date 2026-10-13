const { createHash } = require("node:crypto");

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function xmlElement(name, value) {
  if (value === null || value === undefined) {
    return `<${name}/>`;
  }
  if (Array.isArray(value)) {
    return `<${name}>${value.map((item) => xmlElement("item", item)).join("")}</${name}>`;
  }
  if (typeof value === "object") {
    const children = Object.entries(value)
      .map(([key, child]) => xmlElement(key, child))
      .join("");
    return `<${name}>${children}</${name}>`;
  }
  return `<${name}>${escapeXml(value)}</${name}>`;
}

function representationEtag(etag, mediaType) {
  if (mediaType !== "application/xml") {
    return etag;
  }
  const variant = createHash("sha256")
    .update(`${etag}:application/xml`)
    .digest("hex");
  return `"${variant}"`;
}

function sendRepresentation(res, value) {
  res.vary("Accept");
  if (res.locals.responseType === "application/xml") {
    const root = Array.isArray(value.items) ? "files" : "file";
    return res
      .type("application/xml")
      .send(`<?xml version="1.0" encoding="UTF-8"?>${xmlElement(root, value)}`);
  }
  return res.type("application/json").json(value);
}

module.exports = { representationEtag, sendRepresentation };
