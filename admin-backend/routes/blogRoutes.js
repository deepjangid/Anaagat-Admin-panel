import express from "express";
import { getPublicBlogBySlug, getPublicBlogs } from "../controllers/blogPostController.js";

const router = express.Router();

router.get("/", getPublicBlogs);
router.get("/:slug", getPublicBlogBySlug);

export default router;
