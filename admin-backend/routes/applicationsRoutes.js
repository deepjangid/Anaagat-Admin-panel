import express from "express";
import { requireAuth, requireAdmin } from "../Middlewares/auth.js";
import {
  createApplication,
  deleteApplication,
  downloadApplicationResume,
  getApplicationById,
  getApplications,
  getApplicationStats,
  updateApplication,
  updateApplicationNotes,
  updateApplicationResponse,
  updateApplicationStatus,
} from "../controllers/applicationsController.js";

const router = express.Router();

router.post("/apply", requireAuth, createApplication);
router.get("/", requireAuth, requireAdmin, getApplications);
router.get("/stats", requireAuth, requireAdmin, getApplicationStats);
router.get("/:id", requireAuth, requireAdmin, getApplicationById);
router.get("/:id/resume", requireAuth, requireAdmin, downloadApplicationResume);
router.put("/:id", requireAuth, requireAdmin, updateApplication);
router.patch("/:id/status", requireAuth, requireAdmin, updateApplicationStatus);
router.patch("/:id/notes", requireAuth, requireAdmin, updateApplicationNotes);
router.patch("/:id/response", requireAuth, requireAdmin, updateApplicationResponse);
router.delete("/:id", requireAuth, requireAdmin, deleteApplication);

export default router;
