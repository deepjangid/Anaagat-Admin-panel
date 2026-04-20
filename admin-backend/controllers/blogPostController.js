import BlogPost from "../models/BlogPost.js";
import {
  hasEmbeddedBase64Images,
  normalizeContentImages,
  normalizeImageUrl,
} from "../utils/blogImageStorage.js";

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

const normalizePayload = async (payload = {}, req) => {
  const body = payload && typeof payload === "object" ? payload : {};
  const normalizedStatus =
    body.status !== undefined || body.isPublished === undefined
      ? normalizeStatus(body.status)
      : body.isPublished
        ? "Published"
        : "Draft";
  const isPublished = normalizedStatus === "Published";

  return {
    ...(body.title !== undefined ? { title: String(body.title || "").trim() } : {}),
    ...(body.slug !== undefined ? { slug: slugify(body.slug) || null } : {}),
    ...(body.coverImage !== undefined ? { coverImage: await normalizeImageUrl(body.coverImage, req, "blog-covers") } : {}),
    ...(body.category !== undefined ? { category: String(body.category || "").trim() } : {}),
    ...(body.author !== undefined ? { author: String(body.author || "").trim() } : {}),
    ...((body.publishDate !== undefined || body.publishedAt !== undefined)
      ? {
          publishDate:
            body.publishedAt || body.publishDate
              ? new Date(body.publishedAt || body.publishDate)
              : null,
        }
      : {}),
    ...(body.status !== undefined || body.isPublished !== undefined
      ? { status: normalizedStatus, isPublished }
      : {}),
    ...(body.excerpt !== undefined ? { excerpt: String(body.excerpt || "").trim() } : {}),
    ...(body.content !== undefined
      ? { content: await normalizeContentImages(convertLegacyContentToHtml(body.content), req) }
      : {}),
    ...(body.tags !== undefined ? { tags: normalizeStringArray(body.tags) } : {}),
    ...(body.readingTime !== undefined ? { readingTime: String(body.readingTime || "").trim() } : {}),
  };
};

const formatBlogPost = (blogPost) => {
  const raw = blogPost?.toObject ? blogPost.toObject() : blogPost;

  return {
    _id: raw?._id,
    title: raw?.title ?? "",
    slug: raw?.slug ?? "",
    coverImage: raw?.coverImage ?? "",
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

    console.log("[blogposts:get] raw query params:", JSON.stringify(req.query || {}));
    console.log("[blogposts:get] mongo filter:", JSON.stringify(query));

    const blogPosts = await BlogPost.find(query).sort({ publishDate: -1, createdAt: -1 });
    const data = [];

    for (const blogPost of blogPosts) {
      const updates = {};
      const normalizedCoverImage = await normalizeImageUrl(blogPost.coverImage, req, "blog-covers");
      const normalizedContent = await normalizeContentImages(convertLegacyContentToHtml(blogPost.content), req);

      if (String(blogPost.coverImage || "") !== normalizedCoverImage) {
        updates.coverImage = normalizedCoverImage;
      }

      if (String(convertLegacyContentToHtml(blogPost.content) || "") !== normalizedContent) {
        updates.content = normalizedContent;
      }

      if (Object.keys(updates).length) {
        console.log("[blogposts:get] migrated media:", blogPost._id, JSON.stringify(updates));
        await BlogPost.findByIdAndUpdate(blogPost._id, updates, { runValidators: true });
        Object.assign(blogPost, updates);
      }

      data.push(formatBlogPost(blogPost));
    }

    console.log("[blogposts:get] returned blogs:", data.length);

    res.json({
      success: true,
      blogPosts: data,
      total: data.length,
      currentPage: 1,
    });
  } catch (error) {
    console.error("getBlogPosts error:", error);
    res.status(500).json({ success: false, message: "Error fetching blog posts" });
  }
};

export const createBlogPost = async (req, res) => {
  try {
    const payload = await normalizePayload(req.body, req);

    console.log("[blogposts:create] incoming:", JSON.stringify(req.body));
    console.log("[blogposts:create] normalized:", JSON.stringify(payload));

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
    console.error("createBlogPost error:", error);
    res.status(500).json({ success: false, message: "Error creating blog post" });
  }
};

export const updateBlogPost = async (req, res) => {
  try {
    const payload = await normalizePayload(req.body, req);

    console.log("[blogposts:update] id:", req.params.id);
    console.log("[blogposts:update] incoming:", JSON.stringify(req.body));
    console.log("[blogposts:update] normalized:", JSON.stringify(payload));

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

    const blogPost = await BlogPost.findByIdAndUpdate(
      req.params.id,
      {
        ...payload,
        ...(req.user?.id ? { updatedBy: req.user.id } : {}),
      },
      { new: true, runValidators: true }
    );

    if (!blogPost) {
      return res.status(404).json({ success: false, message: "Blog post not found" });
    }

    res.json({
      success: true,
      message: "Blog post updated",
      blogPost: formatBlogPost(blogPost),
    });
  } catch (error) {
    console.error("updateBlogPost error:", error);
    res.status(500).json({ success: false, message: "Error updating blog post" });
  }
};

export const deleteBlogPost = async (req, res) => {
  try {
    console.log("[blogposts:delete] id:", req.params.id);
    const blogPost = await BlogPost.findByIdAndDelete(req.params.id);

    if (!blogPost) {
      return res.status(404).json({ success: false, message: "Blog post not found" });
    }

    res.json({
      success: true,
      message: "Blog post deleted",
    });
  } catch (error) {
    console.error("deleteBlogPost error:", error);
    res.status(500).json({ success: false, message: "Error deleting blog post" });
  }
};
