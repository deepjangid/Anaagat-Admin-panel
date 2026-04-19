import express from "express";
import { requireAuth, requireAdmin } from "../Middlewares/auth.js";
import {
  createOpening,
  deleteAllOpenings,
  deleteOpening,
  getOpenings,
  updateOpening,
} from "../controllers/openingController.js";

const router = express.Router();

router.get("/", getOpenings);
router.post("/", requireAuth, requireAdmin, createOpening);
router.delete("/", requireAuth, requireAdmin, deleteAllOpenings);
router.put("/:id", requireAuth, requireAdmin, updateOpening);
router.delete("/:id", requireAuth, requireAdmin, deleteOpening);

export default router;
