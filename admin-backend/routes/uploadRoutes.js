import express from "express";
import multer from "multer";
import { requireAuth, requireAdmin } from "../Middlewares/auth.js";
import { uploadFile } from "../controllers/uploadController.js";

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    const mimeType = String(file.mimetype || "").toLowerCase();
    if (["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(mimeType)) {
      callback(null, true);
      return;
    }

    callback(new Error("Only JPG, PNG, WEBP images and PDF files are allowed"));
  },
});

const handleFileUpload = (req, res, next) => {
  upload.single("file")(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      res.status(413).json({
        success: false,
        message: "File is too large. Please choose a file smaller than 5 MB.",
      });
      return;
    }

    res.status(400).json({
      success: false,
      message: error.message || "Invalid image upload",
    });
  });
};

router.post(
  "/file",
  requireAuth,
  requireAdmin,
  handleFileUpload,
  uploadFile
);

router.post(
  "/blog-image",
  requireAuth,
  requireAdmin,
  handleFileUpload,
  uploadFile
);

export default router;
