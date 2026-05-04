import dotenv from "dotenv";
import fs from "fs/promises";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import imagekit, { hasImageKitConfig } from "../config/imagekit.js";
import { isImageKitUrl } from "../utils/mediaAssets.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(backendRoot, ".env") });
dotenv.config({ path: path.join(backendRoot, "..", ".env"), override: false });

const USAGE_PATTERNS = ["candidatefiles", "CandidateFile"];
const USAGE_SCAN_DIRS = ["controllers", "models", "routes", "services", "server.js"];
const TARGET_COLLECTIONS = ["applications", "candidateprofiles", "blogposts", "resumes"];
const DIRECT_BINARY_FIELD_NAMES = new Set(["data", "file", "buffer", "resumeData"]);
const SAFE_FILE_METADATA_FIELDS = new Set(["url", "fileId", "name", "size", "type"]);

const parseArgs = (argv = []) => {
  const options = {
    execute: false,
    mode: "rename",
    backup: true,
    validateOnly: false,
    includeReports: false,
    migrateCandidatefiles: true,
  };

  for (const arg of argv) {
    if (arg === "--execute") options.execute = true;
    else if (arg === "--drop") options.mode = "drop";
    else if (arg === "--rename") options.mode = "rename";
    else if (arg === "--no-backup") options.backup = false;
    else if (arg === "--validate-only") options.validateOnly = true;
    else if (arg === "--include-reports") options.includeReports = true;
    else if (arg === "--skip-candidatefiles-migrate") options.migrateCandidatefiles = false;
  }

  return options;
};

const normalizeString = (value) => String(value || "").trim();

const timeStampLabel = () => new Date().toISOString().replace(/[:.]/g, "-");

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

const isLikelyBase64String = (value) =>
  typeof value === "string" &&
  value.length >= 1024 &&
  !/^https?:\/\//i.test(value) &&
  /^[A-Za-z0-9+/=\r\n]+$/.test(value) &&
  value.replace(/\s+/g, "").length % 4 === 0;

const isPlainObject = (value) =>
  Object.prototype.toString.call(value) === "[object Object]";

const toPosixPath = (filePath) => filePath.split(path.sep).join("/");

const getFileList = async (targetPath) => {
  const stat = await fs.stat(targetPath);
  if (stat.isFile()) return [targetPath];

  const entries = await fs.readdir(targetPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolute = path.join(targetPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await getFileList(absolute)));
    } else if (entry.isFile()) {
      files.push(absolute);
    }
  }

  return files;
};

const shouldIgnoreUsageFile = (relativePath, options) => {
  const normalized = toPosixPath(relativePath);
  if (normalized === "scripts/cleanupLegacyStorage.js") return true;
  if (normalized === "scripts/analyzeDocumentSizes.js") return true;
  if (!options.includeReports && normalized.startsWith("reports/")) return true;
  return false;
};

const findCodeUsage = async (options) => {
  const matches = [];

  for (const entry of USAGE_SCAN_DIRS) {
    const absolute = path.join(backendRoot, entry);
    try {
      const files = await getFileList(absolute);
      for (const filePath of files) {
        const relativePath = path.relative(backendRoot, filePath);
        if (shouldIgnoreUsageFile(relativePath, options)) continue;

        const content = await fs.readFile(filePath, "utf8");
        const lines = content.split(/\r?\n/);
        lines.forEach((line, index) => {
          for (const pattern of USAGE_PATTERNS) {
            if (!line.includes(pattern)) continue;
            matches.push({
              file: toPosixPath(relativePath),
              line: index + 1,
              pattern,
              text: line.trim(),
            });
          }
        });
      }
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }

  return matches;
};

const listCollections = async (db) => {
  const collections = await db.listCollections().toArray();
  return collections.map((item) => item.name);
};

const getCollectionIfExists = async (db, collectionName) => {
  const exists = await db.listCollections({ name: collectionName }, { nameOnly: true }).hasNext();
  return exists ? db.collection(collectionName) : null;
};

const createBackupCollection = async (db, sourceName) => {
  const backupName = `${sourceName}_backup_${timeStampLabel()}`;
  await db.collection(sourceName).aggregate([{ $match: {} }, { $out: backupName }]).toArray();
  return backupName;
};

const extractBinaryBuffer = (value) => {
  if (!value) return null;
  if (Buffer.isBuffer(value)) return value;
  if (value?._bsontype === "Binary" && value.buffer) return Buffer.from(value.buffer);
  if (value?.buffer && Buffer.isBuffer(value.buffer)) return value.buffer;
  if (typeof value === "string" && isLikelyBase64String(value)) {
    try {
      return Buffer.from(value, "base64");
    } catch {
      return null;
    }
  }
  if (Array.isArray(value?.data)) {
    try {
      return Buffer.from(value.data);
    } catch {
      return null;
    }
  }
  return null;
};

const sanitizeFileName = (value, fallback = "file") =>
  normalizeString(path.basename(value || fallback)).replace(/[^a-zA-Z0-9._-]/g, "-") || fallback;

const detectMimeType = (doc = {}) => {
  const rawMimeType =
    normalizeString(doc?.type || doc?.mimeType || doc?.contentType).toLowerCase();
  if (rawMimeType) return rawMimeType;

  const extension = path.extname(normalizeString(doc?.name || doc?.fileName || doc?.title)).toLowerCase();
  if (extension === ".pdf") return "application/pdf";
  if (extension === ".png") return "image/png";
  if (extension === ".webp") return "image/webp";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  return "application/octet-stream";
};

const buildLegacyAsset = ({ uploaded, fileName, size, mimeType }) => ({
  url: normalizeString(uploaded?.url),
  fileId: normalizeString(uploaded?.fileId),
  name: normalizeString(fileName),
  size: Number(size || 0) || 0,
  type: normalizeString(mimeType).toLowerCase(),
});

const uploadLegacyBufferToImageKit = async (buffer, doc = {}) => {
  if (!hasImageKitConfig || !imagekit) {
    throw new Error("ImageKit is not configured.");
  }

  const baseName = sanitizeFileName(doc?.fileName || doc?.name || doc?.title, `${doc?._id || "candidatefile"}`);
  const uploaded = await imagekit.upload({
    file: buffer,
    fileName: `${Date.now()}-${baseName}`,
    folder: "/migration/candidatefiles",
    useUniqueFileName: true,
  });

  return buildLegacyAsset({
    uploaded,
    fileName: baseName,
    size: buffer.length,
    mimeType: detectMimeType(doc),
  });
};

const hasSafeMetadataShape = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  return keys.length > 0 && keys.every((key) => SAFE_FILE_METADATA_FIELDS.has(key));
};

const shouldRemoveField = (fieldPath, value, parentValue) => {
  const fieldName = fieldPath.split(".").at(-1) || fieldPath;

  if (DIRECT_BINARY_FIELD_NAMES.has(fieldName)) return true;
  if (isBinaryLike(value)) return true;
  if (typeof value === "string" && /^data:image\//i.test(value)) return true;
  if (typeof value === "string" && isLikelyBase64String(value)) return true;
  if (
    (fieldName === "resumePath" || fieldName === "url") &&
    typeof value === "string" &&
    value &&
    !isImageKitUrl(value)
  ) {
    return false;
  }

  if ((fieldName === "data" || fieldName === "buffer") && hasSafeMetadataShape(parentValue)) {
    return false;
  }

  return false;
};

const shouldTraverse = (value) =>
  !isObjectIdLike(value) &&
  !isBinaryLike(value) &&
  (Array.isArray(value) || isPlainObject(value));

const collectInvalidPaths = (value, prefix = "", issues = [], parentValue = null, seen = new WeakSet()) => {
  if (!value || typeof value !== "object") return issues;
  if (seen.has(value)) return issues;
  if (!shouldTraverse(value)) return issues;
  seen.add(value);

  const entries = Array.isArray(value) ? value.entries() : Object.entries(value);
  for (const [rawKey, nestedValue] of entries) {
    const key = String(rawKey);
    const fieldPath = prefix
      ? Array.isArray(value)
        ? `${prefix}[${key}]`
        : `${prefix}.${key}`
      : key;

    if (shouldRemoveField(fieldPath, nestedValue, parentValue || value)) {
      issues.push({
        path: fieldPath,
        reason: isBinaryLike(nestedValue)
          ? "binary/blob"
          : typeof nestedValue === "string" && /^data:image\//i.test(nestedValue)
            ? "base64-image"
            : typeof nestedValue === "string" && isLikelyBase64String(nestedValue)
              ? "possible-base64"
              : "legacy-field-name",
      });
      continue;
    }

    if (
      (fieldPath.endsWith("resumePath") || fieldPath.endsWith(".url") || fieldPath === "url") &&
      typeof nestedValue === "string" &&
      nestedValue &&
      !/^https?:\/\//i.test(nestedValue)
    ) {
      issues.push({
        path: fieldPath,
        reason: "non-http-file-reference",
      });
      continue;
    }

    if (nestedValue && typeof nestedValue === "object" && !isBinaryLike(nestedValue) && shouldTraverse(nestedValue)) {
      collectInvalidPaths(nestedValue, fieldPath, issues, value, seen);
    }
  }

  return issues;
};

const toMongoPath = (value) => value.replace(/\[(\d+)\]/g, ".$1");

const cleanCollectionDocuments = async (db, collectionName, options) => {
  const collection = await getCollectionIfExists(db, collectionName);
  if (!collection) {
    return { collection: collectionName, exists: false, scanned: 0, cleaned: 0, modified: 0, invalidRecords: [] };
  }

  const invalidRecords = [];
  let cleaned = 0;
  let modified = 0;
  let scanned = 0;

  const cursor = collection.find({});
  for await (const doc of cursor) {
    scanned += 1;
    const issues = collectInvalidPaths(doc);
    if (!issues.length) continue;

    invalidRecords.push({
      _id: String(doc._id),
      paths: issues,
    });

    const unsetPayload = {};
    issues.forEach((issue) => {
      unsetPayload[toMongoPath(issue.path)] = "";
    });

    if (options.execute) {
      const result = await collection.updateOne({ _id: doc._id }, { $unset: unsetPayload });
      modified += Number(result.modifiedCount || 0);
      cleaned += issues.length;
    }
  }

  return {
    collection: collectionName,
    exists: true,
    scanned,
    cleaned,
    modified,
    invalidRecords,
  };
};

const validateCollections = async (db, collectionNames) => {
  const results = [];

  for (const collectionName of collectionNames) {
    const collection = await getCollectionIfExists(db, collectionName);
    if (!collection) {
      results.push({ collection: collectionName, exists: false, invalidRecords: [] });
      continue;
    }

    const invalidRecords = [];
    const cursor = collection.find({});
    for await (const doc of cursor) {
      const issues = collectInvalidPaths(doc);
      if (!issues.length) continue;
      invalidRecords.push({
        _id: String(doc._id),
        paths: issues,
      });
    }

    results.push({
      collection: collectionName,
      exists: true,
      invalidRecords,
    });
  }

  return results;
};

const printUsageReport = (matches) => {
  if (!matches.length) {
    console.log("[usage] No active backend references to candidatefiles/CandidateFile were found.");
    return;
  }

  console.warn("[usage] Active references found. Cleanup will not delete candidatefiles.");
  console.table(matches.map((item) => ({
    File: item.file,
    Line: item.line,
    Pattern: item.pattern,
    Text: item.text,
  })));
};

const printCleanupSummary = (results) => {
  console.table(results.map((item) => ({
    Collection: item.collection,
    Exists: item.exists,
    Scanned: item.scanned,
    "Records With Legacy Data": item.invalidRecords.length,
    "Fields Cleaned": item.cleaned,
    "Docs Modified": item.modified,
  })));
};

const printValidationSummary = (results) => {
  console.table(results.map((item) => ({
    Collection: item.collection,
    Exists: item.exists,
    "Invalid Records": item.invalidRecords.length,
  })));
};

const migrateCandidatefilesData = async (collection) => {
  const results = {
    scanned: 0,
    migrated: 0,
    alreadyMetadataOnly: 0,
    removedBinaryOnly: 0,
    failed: 0,
    errors: [],
  };

  const cursor = collection.find({});
  for await (const doc of cursor) {
    results.scanned += 1;

    try {
      const buffer = extractBinaryBuffer(doc?.data);
      const currentUrl = normalizeString(doc?.url);
      const currentFileId = normalizeString(doc?.fileId);

      if (!buffer?.length) {
        if (currentUrl && currentFileId) {
          results.alreadyMetadataOnly += 1;
        }
        continue;
      }

      if (currentUrl && currentFileId && isImageKitUrl(currentUrl)) {
        await collection.updateOne({ _id: doc._id }, { $unset: { data: "" } });
        results.removedBinaryOnly += 1;
        continue;
      }

      const asset = await uploadLegacyBufferToImageKit(buffer, doc);
      await collection.updateOne(
        { _id: doc._id },
        {
          $set: asset,
          $unset: { data: "" },
        }
      );
      results.migrated += 1;
    } catch (error) {
      results.failed += 1;
      results.errors.push({
        _id: String(doc?._id || ""),
        message: error?.message || String(error),
      });
    }
  }

  return results;
};

const handleCandidateFilesCollection = async (db, options, allowDelete) => {
  const collection = await getCollectionIfExists(db, "candidatefiles");
  if (!collection) {
    console.log("[candidatefiles] Collection not found.");
    return { existed: false, action: "missing", backupName: null, migration: null };
  }

  if (!allowDelete) {
    console.warn("[candidatefiles] Deletion skipped because active code references were found.");
    return { existed: true, action: "blocked", backupName: null, migration: null };
  }

  if (!options.execute) {
    console.log(
      `[candidatefiles] Dry run: would ${options.mode === "drop" ? "drop" : "rename"} collection` +
      ` after creating a backup copy${options.migrateCandidatefiles ? " and migrating binary docs to ImageKit" : ""}.`
    );
    return { existed: true, action: "dry-run", backupName: null, migration: null };
  }

  const hasDocsWithData = (await collection.countDocuments({ data: { $exists: true, $ne: null } })) > 0;
  if (hasDocsWithData && options.migrateCandidatefiles && (!hasImageKitConfig || !imagekit)) {
    console.warn("[candidatefiles] Binary docs found but ImageKit is not configured. Cleanup is blocked.");
    return { existed: true, action: "blocked-no-imagekit", backupName: null, migration: null };
  }

  const backupName = await createBackupCollection(db, "candidatefiles");
  console.log(`[candidatefiles] Backup created: ${backupName}`);

  let migration = null;
  if (options.migrateCandidatefiles) {
    migration = await migrateCandidatefilesData(collection);
    console.log(
      `[candidatefiles] Migration scanned=${migration.scanned}, migrated=${migration.migrated}, removedBinaryOnly=${migration.removedBinaryOnly}, failed=${migration.failed}`
    );
    if (migration.failed > 0) {
      console.warn("[candidatefiles] Migration failures detected. Collection will be preserved for safety.");
      return { existed: true, action: "blocked-migration-failed", backupName, migration };
    }
  }

  await collection.updateMany({}, { $unset: { data: "" } });
  console.log("[candidatefiles] Removed legacy data field from active collection.");

  if (options.mode === "drop") {
    await collection.drop();
    console.log("[candidatefiles] Collection dropped.");
    return { existed: true, action: "dropped", backupName, migration };
  }

  const renamedTo = `candidatefiles_legacy_${timeStampLabel()}`;
  await collection.rename(renamedTo, { dropTarget: false });
  console.log(`[candidatefiles] Collection renamed to ${renamedTo}.`);
  return { existed: true, action: "renamed", backupName, migration, renamedTo };
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("Missing MongoDB connection string. Set MONGO_URI.");
  }

  const usageMatches = await findCodeUsage(options);
  printUsageReport(usageMatches);

  await mongoose.connect(mongoUri);

  try {
    const db = mongoose.connection.db;
    const knownCollections = await listCollections(db);
    console.log(`[db] Collections checked: ${knownCollections.join(", ")}`);

    if (!options.validateOnly) {
      const candidatefilesResult = await handleCandidateFilesCollection(db, options, usageMatches.length === 0);
      if (candidatefilesResult?.migration?.errors?.length) {
        console.table(candidatefilesResult.migration.errors.map((item) => ({
          "CandidateFile ID": item._id,
          Error: item.message,
        })));
      }
    } else {
      console.log("[candidatefiles] Skipped delete/rename because --validate-only was used.");
    }

    const cleanupResults = [];
    for (const collectionName of TARGET_COLLECTIONS) {
      const result = await cleanCollectionDocuments(db, collectionName, options);
      cleanupResults.push(result);
    }

    printCleanupSummary(cleanupResults);

    const validationTargets = knownCollections.filter(
      (name) => !name.startsWith("system.")
    );
    const validationResults = await validateCollections(db, validationTargets);
    printValidationSummary(validationResults);

    const remainingInvalid = validationResults.filter((item) => item.invalidRecords.length > 0);
    if (remainingInvalid.length) {
      console.warn("[validation] Binary/base64 remnants still exist in these collections:");
      remainingInvalid.forEach((item) => {
        console.warn(`- ${item.collection}: ${item.invalidRecords.length} record(s)`);
      });
    } else {
      console.log("[validation] No binary/base64 fields detected in the scanned collections.");
    }

    console.log(
      `[status] Mode=${options.mode}, execute=${options.execute}, backup=${options.backup}, validateOnly=${options.validateOnly}`
    );
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
};

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === __filename;

if (isDirectRun) {
  main().catch((error) => {
    console.error("Legacy storage cleanup failed:", error.message);
    process.exitCode = 1;
  });
}

export {
  cleanCollectionDocuments,
  collectInvalidPaths,
  findCodeUsage,
  main,
  parseArgs,
  validateCollections,
};
