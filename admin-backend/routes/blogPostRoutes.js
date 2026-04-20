import express from "express";
import { requireAuth, requireAdmin } from "../Middlewares/auth.js";
import {
  createBlogPost,
  deleteBlogPost,
  getBlogPosts,
  updateBlogPost,
} from "../controllers/blogPostController.js";

const router = express.Router();

router.get("/", getBlogPosts);
router.post("/", requireAuth, requireAdmin, createBlogPost);
router.put("/:id", requireAuth, requireAdmin, updateBlogPost);
router.delete("/:id", requireAuth, requireAdmin, deleteBlogPost);

export default router;
