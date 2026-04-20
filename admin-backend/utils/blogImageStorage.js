import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsRoot = path.join(__dirname, "..", "uploads");

const MIME_EXTENSION_MAP = {
  "image/gif": "gif",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const DATA_IMAGE_REGEX = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/i;
const IMG_TAG_REGEX = /<img\b[^>]*\bsrc=(["'])(.*?)\1[^>]*>/gi;

const ensureDirectory = async (directoryPath) => {
  await fs.mkdir(directoryPath, { recursive: true });
};

const normalizeMimeType = (mimeType) => String(mimeType || "").trim().toLowerCase();

const getExtensionForMimeType = (mimeType) => MIME_EXTENSION_MAP[normalizeMimeType(mimeType)] || "";

const buildPublicBaseUrl = (req) => {
  const configured =
    String(process.env.PUBLIC_BACKEND_URL || process.env.BACKEND_PUBLIC_URL || "").trim().replace(/\/+$/, "");
  if (configured) return configured;

  const forwardedProto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
  const protocol = forwardedProto || req.protocol || "http";
  return `${protocol}://${req.get("host")}`;
};

export const isDataImageUrl = (value) => /^data:image\//i.test(String(value || "").trim());

export const isHttpImageUrl = (value) => /^https?:\/\//i.test(String(value || "").trim());

export const hasEmbeddedBase64Images = (html) => /<img\b[^>]*\bsrc=["']data:image\//i.test(String(html || ""));

const decodeDataImageUrl = (dataUrl) => {
  const match = String(dataUrl || "").trim().match(DATA_IMAGE_REGEX);
  if (!match) {
    throw new Error("Unsupported embedded image format");
  }

  const mimeType = normalizeMimeType(match[1]);
  const extension = getExtensionForMimeType(mimeType);
  if (!extension) {
    throw new Error("Unsupported image type");
  }

  return {
    mimeType,
    extension,
    buffer: Buffer.from(match[2].replace(/\s+/g, ""), "base64"),
  };
};

export const saveImageBuffer = async ({ buffer, mimeType, req, folder = "blog-content" }) => {
  const extension = getExtensionForMimeType(mimeType);
  if (!extension) {
    throw new Error("Unsupported image type");
  }

  const outputDirectory = path.join(uploadsRoot, folder);
  await ensureDirectory(outputDirectory);

  const fileName = `${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const filePath = path.join(outputDirectory, fileName);
  await fs.writeFile(filePath, buffer);

  return `${buildPublicBaseUrl(req)}/uploads/${folder}/${fileName}`;
};

export const normalizeImageUrl = async (value, req, folder = "blog-content") => {
  const raw = String(value || "").trim();
  if (!raw) return "";

  if (isDataImageUrl(raw)) {
    const { buffer, mimeType } = decodeDataImageUrl(raw);
    return saveImageBuffer({ buffer, mimeType, req, folder });
  }

  if (isHttpImageUrl(raw)) return raw;
  return "";
};

export const normalizeContentImages = async (html, req) => {
  let nextHtml = String(html || "");
  if (!nextHtml) return "";

  const matches = Array.from(nextHtml.matchAll(IMG_TAG_REGEX));
  for (const match of matches) {
    const fullMatch = match[0];
    const quote = match[1];
    const src = String(match[2] || "").trim();

    if (isDataImageUrl(src)) {
      const uploadedUrl = await normalizeImageUrl(src, req, "blog-content");
      const safeReplacement = fullMatch.replace(`${quote}${src}${quote}`, `${quote}${uploadedUrl}${quote}`);
      nextHtml = nextHtml.replace(fullMatch, safeReplacement);
      continue;
    }

    if (!isHttpImageUrl(src)) {
      nextHtml = nextHtml.replace(fullMatch, "");
    }
  }

  return nextHtml;
};
