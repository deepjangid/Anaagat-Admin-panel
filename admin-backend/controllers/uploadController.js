import { saveImageBuffer } from "../utils/blogImageStorage.js";

export const uploadBlogImage = async (req, res) => {
  try {
    const mimeType = String(req.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
    const fileBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || []);

    if (!mimeType.startsWith("image/")) {
      return res.status(400).json({ success: false, message: "Only image uploads are allowed" });
    }

    if (!fileBuffer.length) {
      return res.status(400).json({ success: false, message: "Image file is required" });
    }

    const url = await saveImageBuffer({ buffer: fileBuffer, mimeType, req, folder: "blog-content" });

    console.log("[uploads:blog-image] mime:", mimeType, "size:", fileBuffer.length, "url:", url);

    res.json({
      success: true,
      url,
    });
  } catch (error) {
    console.error("uploadBlogImage error:", error);
    res.status(500).json({ success: false, message: "Error uploading image" });
  }
};
