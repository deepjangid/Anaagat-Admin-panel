import dotenv from "dotenv";
import fs from "fs/promises";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, "..");
const reportsDir = path.join(backendRoot, "reports");
const reportPath = path.join(reportsDir, "document-size-report.json");

dotenv.config({ path: path.join(backendRoot, ".env") });
dotenv.config({ path: path.join(backendRoot, "..", ".env"), override: false });

const DEFAULT_COLLECTIONS = [
  "candidatefiles",
  "blogposts",
  "applications",
  "candidateprofiles",
  "teammembers",
];

const DEFAULT_LIMIT = 100;
const DEFAULT_MIN_SIZE = 0;
const HEAVY_FIELD_THRESHOLD = 5 * 1024;
const HIGHLIGHT_FIELD_PATTERN = /(data|file|buffer|content)/i;

const parseArgs = (argv = []) => {
  const options = {
    limit: DEFAULT_LIMIT,
    minSize: DEFAULT_MIN_SIZE,
    collections: [...DEFAULT_COLLECTIONS],
  };

  for (const arg of argv) {
    if (arg.startsWith("--limit=")) {
      const value = Number(arg.slice("--limit=".length));
      if (Number.isFinite(value) && value > 0) options.limit = Math.floor(value);
      continue;
    }

    if (arg.startsWith("--minSize=")) {
      const value = Number(arg.slice("--minSize=".length));
      if (Number.isFinite(value) && value >= 0) options.minSize = Math.floor(value);
      continue;
    }

    if (arg.startsWith("--collection=")) {
      const raw = arg.slice("--collection=".length);
      const names = raw
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      if (names.length) options.collections = names;
    }
  }

  return options;
};

const formatBytes = (bytes = 0) => {
  const value = Number(bytes || 0);
  if (!Number.isFinite(value) || value <= 0) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  const digits = size >= 10 || unitIndex === 0 ? 0 : 1;
  return `${size.toFixed(digits)} ${units[unitIndex]}`;
};

const normalizeCollectionName = (value) => String(value || "").trim();

const isPlainObject = (value) =>
  Object.prototype.toString.call(value) === "[object Object]";

const isObjectIdLike = (value) =>
  value?._bsontype === "ObjectId" ||
  (value &&
    typeof value === "object" &&
    typeof value.toHexString === "function" &&
    typeof value.equals === "function");

const isBinaryLike = (value) =>
  (!isObjectIdLike(value) && Buffer.isBuffer(value)) ||
  value?._bsontype === "Binary" ||
  (!isObjectIdLike(value) && value && typeof value === "object" && Buffer.isBuffer(value.buffer)) ||
  (value &&
    !isObjectIdLike(value) &&
    typeof value === "object" &&
    value.type === "Buffer" &&
    Array.isArray(value.data));

const getBinaryLength = (value) => {
  if (Buffer.isBuffer(value)) return value.length;
  if (value?._bsontype === "Binary" && value.buffer) return value.buffer.length || 0;
  if (value && typeof value === "object" && Buffer.isBuffer(value.buffer)) return value.buffer.length || 0;
  if (value && typeof value === "object" && value.type === "Buffer" && Array.isArray(value.data)) {
    return value.data.length;
  }
  return 0;
};

const isLikelyBase64String = (value) =>
  typeof value === "string" &&
  value.length >= 1024 &&
  /^[A-Za-z0-9+/=\r\n]+$/.test(value) &&
  value.replace(/\s+/g, "").length % 4 === 0;

const detectType = (value) => {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (isObjectIdLike(value)) return "objectId";
  if (isBinaryLike(value)) return "buffer";
  if (Array.isArray(value)) return "array";
  if (value instanceof Date) return "date";
  return typeof value === "object" ? "object" : typeof value;
};

const safeSerialize = (value, seen = new WeakSet()) => {
  if (value === undefined) return "__undefined__";
  if (typeof value === "bigint") return value.toString();
  if (isBinaryLike(value)) return `[Binary ${getBinaryLength(value)} bytes]`;
  if (typeof value === "function") return `[Function ${value.name || "anonymous"}]`;

  if (value && typeof value === "object") {
    if (seen.has(value)) return "[Circular]";
    seen.add(value);

    if (value instanceof Date) return value.toISOString();
    if (Array.isArray(value)) return value.map((item) => safeSerialize(item, seen));
    if (isPlainObject(value)) {
      const next = {};
      for (const [key, nestedValue] of Object.entries(value)) {
        next[key] = safeSerialize(nestedValue, seen);
      }
      return next;
    }

    const next = {};
    for (const [key, nestedValue] of Object.entries(value)) {
      next[key] = safeSerialize(nestedValue, seen);
    }
    return next;
  }

  return value;
};

const primitiveByteLength = (value) => {
  try {
    return Buffer.byteLength(JSON.stringify(value), "utf8");
  } catch {
    return 0;
  }
};

const estimateStructuredByteLength = (value, seen = new WeakSet()) => {
  if (value === undefined) return Buffer.byteLength('"__undefined__"', "utf8");
  if (value === null) return Buffer.byteLength("null", "utf8");
  if (typeof value === "string") return primitiveByteLength(value);
  if (typeof value === "number") return primitiveByteLength(Number.isFinite(value) ? value : null);
  if (typeof value === "boolean") return value ? 4 : 5;
  if (typeof value === "bigint") return primitiveByteLength(value.toString());
  if (typeof value === "function") return primitiveByteLength(`[Function ${value.name || "anonymous"}]`);
  if (value instanceof Date) return primitiveByteLength(value.toISOString());
  if (isBinaryLike(value)) return Math.max(getBinaryLength(value), primitiveByteLength(safeSerialize(value)));

  if (value && typeof value === "object") {
    if (seen.has(value)) return primitiveByteLength("[Circular]");
    seen.add(value);

    if (Array.isArray(value)) {
      let total = 2;
      value.forEach((item, index) => {
        total += estimateStructuredByteLength(item, seen);
        if (index < value.length - 1) total += 1;
      });
      return total;
    }

    let total = 2;
    const entries = Object.entries(value);
    entries.forEach(([key, nestedValue], index) => {
      total += primitiveByteLength(key);
      total += 1;
      total += estimateStructuredByteLength(nestedValue, seen);
      if (index < entries.length - 1) total += 1;
    });
    return total;
  }

  return primitiveByteLength(value);
};

const safeByteLength = (value) => {
  try {
    return estimateStructuredByteLength(value);
  } catch {
    try {
      const serialized = JSON.stringify(safeSerialize(value));
      return Buffer.byteLength(serialized || "", "utf8");
    } catch {
      return 0;
    }
  }
};

const collectFieldStats = (value, prefix = "", bucket = [], seen = new WeakSet(), depth = 0) => {
  if (depth > 6) return bucket;
  if (!value || typeof value !== "object") return bucket;
  if (seen.has(value)) return bucket;
  seen.add(value);

  const entries = Array.isArray(value) ? value.entries() : Object.entries(value);
  for (const [rawKey, rawValue] of entries) {
    const key = String(rawKey);
    const fieldPath = prefix
      ? Array.isArray(value)
        ? `${prefix}[${key}]`
        : `${prefix}.${key}`
      : key;

    const fieldType = detectType(rawValue);
    const fieldSize = safeByteLength(rawValue);
    const flagged =
      fieldSize > HEAVY_FIELD_THRESHOLD || HIGHLIGHT_FIELD_PATTERN.test(fieldPath);
    const notes = [];

    if (fieldSize > HEAVY_FIELD_THRESHOLD) notes.push("over-5KB");
    if (fieldType === "buffer") notes.push("binary/blob");
    if (typeof rawValue === "string" && /^data:image\//i.test(rawValue)) notes.push("base64-image");
    if (typeof rawValue === "string" && isLikelyBase64String(rawValue)) notes.push("possible-base64");
    if (HIGHLIGHT_FIELD_PATTERN.test(fieldPath)) notes.push("highlighted-name");

    bucket.push({
      field: fieldPath,
      sizeBytes: fieldSize,
      size: formatBytes(fieldSize),
      type: fieldType,
      flagged,
      notes,
    });

    if (
      rawValue &&
      typeof rawValue === "object" &&
      !isBinaryLike(rawValue) &&
      !(rawValue instanceof Date)
    ) {
      collectFieldStats(rawValue, fieldPath, bucket, seen, depth + 1);
    }
  }

  return bucket;
};

const summarizeDocument = (doc) => {
  const docId = doc?._id ? String(doc._id) : "(no _id)";
  const totalSizeBytes = safeByteLength(doc);
  const fields = collectFieldStats(doc);
  const sortedFields = fields.sort((left, right) => right.sizeBytes - left.sizeBytes);
  const topFields = sortedFields.slice(0, 10);
  const flaggedFields = sortedFields.filter((field) => field.flagged);

  return {
    _id: docId,
    totalSizeBytes,
    totalSize: formatBytes(totalSizeBytes),
    largestField: topFields[0]
      ? {
          field: topFields[0].field,
          sizeBytes: topFields[0].sizeBytes,
          size: topFields[0].size,
          type: topFields[0].type,
        }
      : null,
    topFields,
    flaggedFields,
  };
};

const analyzeCollection = async (db, collectionName, options) => {
  const collection = db.collection(collectionName);
  const totalDocs = await collection.countDocuments();
  const cursor = collection.find({}, { limit: options.limit });
  const docs = [];

  for await (const doc of cursor) {
    const summary = summarizeDocument(doc);
    if (summary.totalSizeBytes >= options.minSize) {
      docs.push(summary);
    }
  }

  docs.sort((left, right) => right.totalSizeBytes - left.totalSizeBytes);

  const totalAnalyzedBytes = docs.reduce((sum, item) => sum + item.totalSizeBytes, 0);
  const largestDoc = docs[0] || null;

  return {
    collection: collectionName,
    totalDocs,
    analyzedDocs: docs.length,
    analyzedBytes: totalAnalyzedBytes,
    analyzedSize: formatBytes(totalAnalyzedBytes),
    largestDocumentSizeBytes: largestDoc?.totalSizeBytes || 0,
    largestDocumentSize: largestDoc?.totalSize || "0 B",
    docs,
  };
};

const printConsoleReport = (collections = []) => {
  const rows = [];

  for (const collection of collections) {
    for (const doc of collection.docs) {
      rows.push({
        Collection: collection.collection,
        "Doc ID": doc._id,
        "Total Size": doc.totalSize,
        "Largest Field": doc.largestField?.field || "-",
        "Largest Field Size": doc.largestField?.size || "0 B",
        Type: doc.largestField?.type || "-",
      });
    }
  }

  if (!rows.length) {
    console.log("No documents matched the analysis filters.");
    return;
  }

  console.table(rows);
};

const ensureReportsDir = async () => {
  await fs.mkdir(reportsDir, { recursive: true });
};

const buildReport = (collections, options) => ({
  generatedAt: new Date().toISOString(),
  options: {
    limit: options.limit,
    minSize: options.minSize,
    collections: options.collections,
  },
  collections,
});

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("Missing MongoDB connection string. Set MONGO_URI.");
  }

  await mongoose.connect(mongoUri);

  try {
    const db = mongoose.connection.db;
    const results = [];

    for (const rawName of options.collections) {
      const collectionName = normalizeCollectionName(rawName);
      if (!collectionName) continue;

      const exists = await db.listCollections({ name: collectionName }, { nameOnly: true }).hasNext();
      if (!exists) {
        results.push({
          collection: collectionName,
          totalDocs: 0,
          analyzedDocs: 0,
          analyzedBytes: 0,
          analyzedSize: "0 B",
          largestDocumentSizeBytes: 0,
          largestDocumentSize: "0 B",
          docs: [],
          warning: "Collection not found",
        });
        continue;
      }

      const summary = await analyzeCollection(db, collectionName, options);
      results.push(summary);
    }

    results.sort((left, right) => right.analyzedBytes - left.analyzedBytes);

    await ensureReportsDir();
    await fs.writeFile(reportPath, JSON.stringify(buildReport(results, options), null, 2), "utf8");

    printConsoleReport(results);
    console.log(`Saved JSON report to ${reportPath}`);
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
};

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === __filename;

if (isDirectRun) {
  main().catch((error) => {
    console.error("Document size analysis failed:", error.message);
    process.exitCode = 1;
  });
}

export { analyzeCollection, buildReport, formatBytes, main, parseArgs, summarizeDocument };
