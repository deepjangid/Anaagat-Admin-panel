import express from "express";
import { requireAuth, requireAdmin } from "../Middlewares/auth.js";
import { getUsers, deleteUser, getDashboard } from "../controllers/adminController.js";
import {
  deleteCandidateProfile,
  deleteClientProfile,
  deleteContactMessage,
  getCandidateProfiles,
  getClientProfiles,
  getContactMessages,
  markContactMessageRead,
} from "../controllers/adminResourcesController.js";

const router = express.Router();

router.get("/users", requireAuth, requireAdmin, getUsers);
router.get("/dashboard", requireAuth, requireAdmin, getDashboard); // ✅ ADD THIS
router.delete("/user/:id", requireAuth, requireAdmin, deleteUser);

router.get("/candidate-profiles", requireAuth, requireAdmin, getCandidateProfiles);
router.delete("/candidate-profiles/:id", requireAuth, requireAdmin, deleteCandidateProfile);

router.get("/client-profiles", requireAuth, requireAdmin, getClientProfiles);
router.delete("/client-profiles/:id", requireAuth, requireAdmin, deleteClientProfile);

router.get("/contact-messages", requireAuth, requireAdmin, getContactMessages);
router.patch("/contact-messages/:id/read", requireAuth, requireAdmin, markContactMessageRead);
router.delete("/contact-messages/:id", requireAuth, requireAdmin, deleteContactMessage);

export default router;
