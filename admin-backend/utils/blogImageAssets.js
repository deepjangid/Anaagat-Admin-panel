import {
  hasEmbeddedBase64Images,
  isImageKitUrl,
  normalizeFileAsset,
  normalizeFileAssetList,
} from "./mediaAssets.js";

const IMG_TAG_REGEX = /<img\b[^>]*\bsrc=(["'])(.*?)\1[^>]*>/gi;

const normalizeString = (value) => String(value || "").trim();

export const normalizeImageUrl = (value) => {
  const url = normalizeString(value);
  if (!url) return "";
  return isImageKitUrl(url) ? url : "";
};

export const normalizeContentHtml = (value) => String(value || "").trim();

export const normalizeContentImages = (html) => {
  let nextHtml = normalizeContentHtml(html);
  if (!nextHtml) return "";

  const matches = Array.from(nextHtml.matchAll(IMG_TAG_REGEX));
  for (const match of matches) {
    const fullMatch = match[0];
    const quote = match[1];
    const src = normalizeString(match[2]);

    if (!src) {
      nextHtml = nextHtml.replace(fullMatch, "");
      continue;
    }

    const normalizedUrl = normalizeImageUrl(src);
    if (!normalizedUrl) {
      nextHtml = nextHtml.replace(fullMatch, "");
      continue;
    }

    if (normalizedUrl !== src) {
      nextHtml = nextHtml.replace(
        fullMatch,
        fullMatch.replace(`${quote}${src}${quote}`, `${quote}${normalizedUrl}${quote}`)
      );
    }
  }

  return nextHtml;
};

export { hasEmbeddedBase64Images, normalizeFileAsset, normalizeFileAssetList as normalizeImageAssetList };

export const filterAssetsUsedInHtml = (html, assets = []) => {
  const normalizedHtml = normalizeContentHtml(html);
  const urlSet = new Set();

  for (const match of normalizedHtml.matchAll(IMG_TAG_REGEX)) {
    const src = normalizeImageUrl(match[2]);
    if (src) urlSet.add(src);
  }

  return normalizeImageAssetList(assets).filter((asset) => urlSet.has(asset.url));
};

export const collectRemovedAssetFileIds = (previousAssets = [], nextAssets = []) => {
  const nextIds = new Set(normalizeImageAssetList(nextAssets).map((asset) => asset.fileId));
  return normalizeImageAssetList(previousAssets)
    .map((asset) => asset.fileId)
    .filter((fileId) => fileId && !nextIds.has(fileId));
};
