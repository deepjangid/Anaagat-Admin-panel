import express from "express";
import { requireAuth } from "../Middlewares/auth.js";
import {
  getMyApplications,
  streamMyApplications,
} from "../controllers/applicationsController.js";

const router = express.Router();

router.get("/my-applications", requireAuth, getMyApplications);
router.get("/my-applications/stream", requireAuth, streamMyApplications);

export default router;
