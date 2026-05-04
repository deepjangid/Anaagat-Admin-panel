import imagekit, { hasImageKitConfig, urlEndpoint } from "../config/imagekit.js";

const normalizeString = (value) => String(value || "").trim();

export const FILE_FIELD_KEYS = ["url", "fileId", "name", "size", "type"];

export const IMAGEKIT_URL_PREFIX = normalizeString(urlEndpoint).replace(/\/+$/, "");

export const isImageKitUrl = (value) => {
  const raw = normalizeString(value);
  return Boolean(raw && IMAGEKIT_URL_PREFIX && raw.startsWith(`${IMAGEKIT_URL_PREFIX}/`));
};

export const hasEmbeddedBase64Images = (html) =>
  /<img\b[^>]*\bsrc=["']data:image\//i.test(String(html || ""));

export const normalizeFileAsset = (value, options = {}) => {
  const required = options.required !== false;
  const candidate = value && typeof value === "object" && !Array.isArray(value) ? value : null;
  if (!candidate) return required ? null : undefined;

  const url = normalizeString(candidate.url);
  const fileId = normalizeString(candidate.fileId);
  const name = normalizeString(candidate.name);
  const type = normalizeString(candidate.type).toLowerCase();
  const size = Number(candidate.size || 0);

  if (!url || !fileId) return required ? null : undefined;
  if (!isImageKitUrl(url)) return required ? null : undefined;

  return {
    url,
    fileId,
    name,
    size: Number.isFinite(size) && size >= 0 ? size : 0,
    type,
  };
};

export const normalizeFileAssetList = (value) => {
  if (!Array.isArray(value)) return [];

  const seen = new Set();
  const assets = [];

  for (const item of value) {
    const asset = normalizeFileAsset(item);
    if (!asset) continue;
    const key = `${asset.fileId}:${asset.url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    assets.push(asset);
  }

  return assets;
};

export const collectRemovedFileIds = (previousAssets = [], nextAssets = []) => {
  const nextIds = new Set(normalizeFileAssetList(nextAssets).map((item) => item.fileId));
  return normalizeFileAssetList(previousAssets)
    .map((item) => item.fileId)
    .filter((fileId) => fileId && !nextIds.has(fileId));
};

export const deleteImageKitFiles = async (fileIds = []) => {
  if (!hasImageKitConfig || !imagekit) return;

  const uniqueIds = [...new Set(fileIds.map((fileId) => normalizeString(fileId)).filter(Boolean))];
  if (!uniqueIds.length) return;

  await Promise.allSettled(
    uniqueIds.map(async (fileId) => {
      try {
        await imagekit.deleteFile(fileId);
      } catch (error) {
        console.error("[imagekit:delete] failed:", fileId, error?.message || error);
      }
    })
  );
};
