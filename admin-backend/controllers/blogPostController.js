import BlogPost from "../models/BlogPost.js";
import {
  filterAssetsUsedInHtml,
  hasEmbeddedBase64Images,
  normalizeContentImages,
  normalizeImageAssetList,
} from "../utils/blogImageAssets.js";
import {
  collectRemovedFileIds,
  deleteImageKitFiles,
  isImageKitUrl,
  normalizeFileAsset,
} from "../utils/mediaAssets.js";
import { logError, logInfo } from "../utils/logger.js";
const slugify = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

const buildUniqueSlug = async (title, excludeId = null) => {
  const base = slugify(title) || `blog-${Date.now()}`;
  let slug = base;
  let counter = 1;

  while (true) {
    const existing = await BlogPost.findOne({
      slug,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    })
      .select("_id")
      .lean();

    if (!existing) return slug;

    counter += 1;
    slug = `${base}-${counter}`;
  }
};

const normalizeStatus = (status) => {
  const value = String(status || "").trim().toLowerCase();
  if (!value) return "Published";
  if (value === "published") return "Published";
  if (value === "archived") return "Archived";
  return "Draft";
};

const parseOptionalDate = (value) => {
  if (value === undefined) return undefined;
  if (value === null) return null;

  const normalized = String(value || "").trim();
  if (!normalized) return null;

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return "INVALID_DATE";
  return parsed;
};

const normalizeStringArray = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }

  return String(value || "")
    .split(/\r?\n|[|;,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const convertLegacyContentToHtml = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || "").trim())
      .filter(Boolean)
      .map((item) => `<p>${item}</p>`)
      .join("");
  }

  return String(value || "").trim();
};

const normalizeCoverImageInput = (body = {}) => {
  const directAsset = normalizeFileAsset(body.coverImageAsset, { required: false });
  if (directAsset) return directAsset;

  const rawUrl = String(body.coverImage || "").trim();
  const rawFileId = String(body.coverImageFileId || "").trim();
  if (!rawUrl) {
    return {
      url: "",
      fileId: "",
      name: "",
      size: 0,
      type: "",
    };
  }

  if (isImageKitUrl(rawUrl) && rawFileId) {
    return {
      url: rawUrl,
      fileId: rawFileId,
      name: String(body.coverImageName || "").trim(),
      size: Number(body.coverImageSize || 0) || 0,
      type: String(body.coverImageType || "").trim().toLowerCase(),
    };
  }

  return null;
};

const getFormattedCoverAsset = (raw = {}) => {
  const directAsset = normalizeFileAsset(raw?.coverImage, { required: false });
  if (directAsset) return directAsset;

  const legacyUrl = String(raw?.coverImage || "").trim();
  const legacyFileId = String(raw?.coverImageFileId || "").trim();
  if (isImageKitUrl(legacyUrl) && legacyFileId) {
    return {
      url: legacyUrl,
      fileId: legacyFileId,
      name: "",
      size: 0,
      type: "",
    };
  }

  return null;
};

const normalizePayload = async (payload = {}) => {
  const body = payload && typeof payload === "object" ? payload : {};
  const normalizedStatus =
    body.status !== undefined || body.isPublished === undefined
      ? normalizeStatus(body.status)
      : body.isPublished
        ? "Published"
        : "Draft";
  const isPublished = normalizedStatus === "Published";
  const normalizedPublishDate =
    body.publishDate !== undefined || body.publishedAt !== undefined
      ? parseOptionalDate(body.publishedAt ?? body.publishDate)
      : undefined;
  const normalizedContent =
    body.content !== undefined
      ? normalizeContentImages(convertLegacyContentToHtml(body.content))
      : undefined;
  const normalizedContentImages =
    body.contentImages !== undefined
      ? filterAssetsUsedInHtml(normalizedContent, normalizeImageAssetList(body.contentImages))
      : undefined;
  const normalizedCoverImage =
    body.coverImage !== undefined || body.coverImageAsset !== undefined || body.coverImageFileId !== undefined
      ? normalizeCoverImageInput(body)
      : undefined;

  return {
    ...(body.title !== undefined ? { title: String(body.title || "").trim() } : {}),
    ...(body.slug !== undefined ? { slug: slugify(body.slug) || null } : {}),
    ...(normalizedCoverImage !== undefined ? { coverImage: normalizedCoverImage } : {}),
    ...(body.category !== undefined ? { category: String(body.category || "").trim() } : {}),
    ...(body.author !== undefined ? { author: String(body.author || "").trim() } : {}),
    ...(normalizedPublishDate !== undefined ? { publishDate: normalizedPublishDate } : {}),
    ...(body.status !== undefined || body.isPublished !== undefined
      ? { status: normalizedStatus, isPublished }
      : {}),
    ...(body.excerpt !== undefined ? { excerpt: String(body.excerpt || "").trim() } : {}),
    ...(body.content !== undefined ? { content: normalizedContent } : {}),
    ...(body.contentImages !== undefined ? { contentImages: normalizedContentImages } : {}),
    ...(body.tags !== undefined ? { tags: normalizeStringArray(body.tags) } : {}),
    ...(body.readingTime !== undefined ? { readingTime: String(body.readingTime || "").trim() } : {}),
  };
};

const getBlogErrorMessage = (error, fallbackMessage) => {
  if (!error) return fallbackMessage;

  if (error.code === 11000) {
    return "A blog post with similar unique data already exists.";
  }

  if (error.name === "ValidationError") {
    const firstMessage = Object.values(error.errors || {})[0]?.message;
    return firstMessage || fallbackMessage;
  }

  if (error.name === "CastError") {
    return `Invalid ${error.path || "value"} provided.`;
  }

  if (error.message) return error.message;
  return fallbackMessage;
};

const formatBlogPost = (blogPost) => {
  const raw = blogPost?.toObject ? blogPost.toObject() : blogPost;
  const coverAsset = getFormattedCoverAsset(raw);

  return {
    _id: raw?._id,
    title: raw?.title ?? "",
    slug: raw?.slug ?? "",
    coverImage: coverAsset?.url ?? "",
    coverImageAsset: coverAsset,
    coverImageFileId: coverAsset?.fileId ?? "",
    category: raw?.category ?? "General",
    author: raw?.author ?? "Anaagat Team",
    publishDate: raw?.publishDate
      ? new Date(raw.publishDate).toISOString().slice(0, 10)
      : "",
    publishedAt: raw?.publishDate
      ? new Date(raw.publishDate).toISOString()
      : null,
    status: raw?.status ?? "Draft",
    isPublished:
      typeof raw?.isPublished === "boolean"
        ? raw.isPublished
        : String(raw?.status || "").trim().toLowerCase() === "published",
    excerpt: raw?.excerpt ?? "",
    content: convertLegacyContentToHtml(raw?.content),
    contentImages: Array.isArray(raw?.contentImages) ? raw.contentImages : [],
    tags: Array.isArray(raw?.tags) ? raw.tags : [],
    readingTime: raw?.readingTime ?? "",
    createdAt: raw?.createdAt ?? null,
    updatedAt: raw?.updatedAt ?? null,
  };
};

const parseBoolean = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return null;
  if (["1", "true", "yes", "published"].includes(normalized)) return true;
  if (["0", "false", "no", "draft"].includes(normalized)) return false;
  return null;
};

export const getBlogPosts = async (req, res) => {
  try {
    const publishedOnly = parseBoolean(req.query?.published);
    const status = String(req.query?.status || "").trim();
    const query = {};

    if (publishedOnly !== null) {
      if (publishedOnly) {
        query.$or = [
          { isPublished: true },
          { status: "Published" },
        ];
      } else {
        query.$and = [
          {
            $or: [
              { isPublished: false },
              { status: { $in: ["Draft", "Archived"] } },
            ],
          },
        ];
      }
    }

    if (status) {
      const normalizedStatus = normalizeStatus(status);
      query.status = normalizedStatus;

      if (normalizedStatus === "Published") {
        delete query.$and;
        query.$or = [
          { isPublished: true },
          { status: "Published" },
        ];
      }
    }

    logInfo("[blogposts:get] raw query params:", JSON.stringify(req.query || {}));
    logInfo("[blogposts:get] mongo filter:", JSON.stringify(query));

    const blogPosts = await BlogPost.find(query).sort({ publishDate: -1, createdAt: -1 });
    const data = blogPosts.map((blogPost) => formatBlogPost(blogPost));

    logInfo("[blogposts:get] returned blogs:", data.length);

    res.json({
      success: true,
      blogPosts: data,
      total: data.length,
      currentPage: 1,
    });
  } catch (error) {
    logError("getBlogPosts error:", error);
    res.status(500).json({ success: false, message: "Error fetching blog posts" });
  }
};

export const createBlogPost = async (req, res) => {
  try {
    const payload = await normalizePayload(req.body);

    logInfo("[blogposts:create] incoming:", JSON.stringify(req.body));
    logInfo("[blogposts:create] normalized:", JSON.stringify(payload));

    if ("coverImage" in payload && payload.coverImage === null) {
      return res.status(400).json({
        success: false,
        message: "Cover image must come from ImageKit upload only.",
      });
    }

    if (payload.publishDate === "INVALID_DATE") {
      return res.status(400).json({
        success: false,
        message: "Publish date is invalid.",
      });
    }

    if (hasEmbeddedBase64Images(payload.content)) {
      return res.status(400).json({
        success: false,
        message: "Embedded base64 images are not allowed. Please upload images and use the returned URL.",
      });
    }

    if (!payload.title || !String(payload.content || "").trim()) {
      return res.status(400).json({
        success: false,
        message: "Title and content are required",
      });
    }

    payload.slug = payload.slug || (await buildUniqueSlug(payload.title));
    payload.contentImages = filterAssetsUsedInHtml(payload.content, payload.contentImages);

    const blogPost = await BlogPost.create({
      ...payload,
      ...(req.user?.id ? { createdBy: req.user.id, updatedBy: req.user.id } : {}),
    });

    res.json({
      success: true,
      message: "Blog post created",
      blogPost: formatBlogPost(blogPost),
    });
  } catch (error) {
    logError("createBlogPost error:", error);
    const status = error?.name === "ValidationError" || error?.name === "CastError" ? 400 : 500;
    res.status(status).json({ success: false, message: getBlogErrorMessage(error, "Error creating blog post") });
  }
};

export const updateBlogPost = async (req, res) => {
  try {
    const existingBlogPost = await BlogPost.findById(req.params.id);
    if (!existingBlogPost) {
      return res.status(404).json({ success: false, message: "Blog post not found" });
    }

    const payload = await normalizePayload(req.body);

    logInfo("[blogposts:update] id:", req.params.id);
    logInfo("[blogposts:update] incoming:", JSON.stringify(req.body));
    logInfo("[blogposts:update] normalized:", JSON.stringify(payload));

    if ("coverImage" in payload && payload.coverImage === null) {
      return res.status(400).json({
        success: false,
        message: "Cover image must come from ImageKit upload only.",
      });
    }

    if (payload.publishDate === "INVALID_DATE") {
      return res.status(400).json({
        success: false,
        message: "Publish date is invalid.",
      });
    }

    if ("content" in payload && hasEmbeddedBase64Images(payload.content)) {
      return res.status(400).json({
        success: false,
        message: "Embedded base64 images are not allowed. Please upload images and use the returned URL.",
      });
    }

    if ("title" in payload && !payload.title) {
      return res.status(400).json({ success: false, message: "Title is required" });
    }

    if ("content" in payload && !String(payload.content || "").trim()) {
      return res.status(400).json({ success: false, message: "Content is required" });
    }

    if (payload.title && !payload.slug) {
      payload.slug = await buildUniqueSlug(payload.title, req.params.id);
    }

    if ("content" in payload || "contentImages" in payload) {
      const nextContent = "content" in payload ? payload.content : existingBlogPost.content;
      const nextAssets =
        "contentImages" in payload ? payload.contentImages : existingBlogPost.contentImages;
      payload.contentImages = filterAssetsUsedInHtml(nextContent, nextAssets);
    }

    const previousCover = normalizeFileAsset(existingBlogPost.coverImage, { required: false });
    const nextCover =
      "coverImage" in payload ? normalizeFileAsset(payload.coverImage, { required: false }) : previousCover;
    const coverFileChanged =
      "coverImage" in payload &&
      previousCover?.fileId &&
      nextCover?.fileId !== previousCover.fileId;
    const coverRemoved =
      "coverImage" in payload && previousCover?.fileId && !nextCover?.url;
    const removedContentFileIds = collectRemovedFileIds(
      existingBlogPost.contentImages,
      payload.contentImages ?? existingBlogPost.contentImages
    );

    const blogPost = await BlogPost.findByIdAndUpdate(
      req.params.id,
      {
        ...payload,
        ...(req.user?.id ? { updatedBy: req.user.id } : {}),
      },
      { new: true, runValidators: true }
    );
    const filesToDelete = [
      ...removedContentFileIds,
      ...(coverFileChanged || coverRemoved ? [previousCover?.fileId] : []),
    ];
    await deleteImageKitFiles(filesToDelete);

    res.json({
      success: true,
      message: "Blog post updated",
      blogPost: formatBlogPost(blogPost),
    });
  } catch (error) {
    logError("updateBlogPost error:", error);
    const status = error?.name === "ValidationError" || error?.name === "CastError" ? 400 : 500;
    res.status(status).json({ success: false, message: getBlogErrorMessage(error, "Error updating blog post") });
  }
};

export const deleteBlogPost = async (req, res) => {
  try {
    logInfo("[blogposts:delete] id:", req.params.id);
    const blogPost = await BlogPost.findByIdAndDelete(req.params.id);

    if (!blogPost) {
      return res.status(404).json({ success: false, message: "Blog post not found" });
    }

    await deleteImageKitFiles([
      blogPost?.coverImage?.fileId,
      ...((Array.isArray(blogPost.contentImages) ? blogPost.contentImages : []).map((item) => item.fileId)),
    ]);

    res.json({
      success: true,
      message: "Blog post deleted",
    });
  } catch (error) {
    logError("deleteBlogPost error:", error);
    res.status(500).json({ success: false, message: "Error deleting blog post" });
  }
};
