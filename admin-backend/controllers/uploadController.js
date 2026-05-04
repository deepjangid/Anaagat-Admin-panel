import path from "path";
import imagekit from "../config/imagekit.js";
import { logError, logInfo } from "../utils/logger.js";

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

export const uploadFile = async (req, res) => {
  try {
    if (!imagekit) {
      return res.status(500).json({
        success: false,
        message: "ImageKit is not configured on the server",
      });
    }

    const file = req.file;
    if (!file?.buffer?.length) {
      return res.status(400).json({ success: false, message: "File is required" });
    }

    if (!allowedMimeTypes.has(String(file.mimetype || "").toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: "Only JPG, PNG, WEBP images and PDF files are allowed",
      });
    }

    const safeBaseName = String(path.basename(file.originalname || "upload"))
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9._-]/g, "");

    const uploadedFile = await imagekit.upload({
      file: file.buffer,
      fileName: `${Date.now()}-${safeBaseName || "upload"}`,
      folder: "/admin-panel",
      useUniqueFileName: true,
    });

    logInfo(
      "[uploads:file] mime:",
      file.mimetype,
      "size:",
      file.size,
      "url:",
      uploadedFile.url,
      "fileId:",
      uploadedFile.fileId
    );

    res.json({
      success: true,
      url: uploadedFile.url,
      fileId: uploadedFile.fileId,
      name: file.originalname,
      size: file.size,
      type: file.mimetype,
    });
  } catch (error) {
    logError("uploadFile error:", error);
    res.status(500).json({ success: false, message: "Error uploading file" });
  }
};
