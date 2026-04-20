import express from "express";
import { requireAuth, requireAdmin } from "../Middlewares/auth.js";
import { uploadBlogImage } from "../controllers/uploadController.js";

const router = express.Router();

router.post(
  "/blog-image",
  requireAuth,
  requireAdmin,
  express.raw({ type: "image/*", limit: "10mb" }),
  uploadBlogImage
);

export default router;
