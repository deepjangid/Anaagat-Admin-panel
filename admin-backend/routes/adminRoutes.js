import express from "express";
import { requireAuth, requireAdmin } from "../Middlewares/auth.js";
import { getUsers, deleteUser, getDashboard } from "../controllers/adminController.js";
import {
  createCandidateProfile,
  createClientProfile,
  createContactMessage,
  deleteCandidateProfile,
  deleteClientProfile,
  deleteContactMessage,
  deleteTeamMember,
  getCandidateProfiles,
  getClientProfiles,
  getContactInboxMessages,
  getContactMessages,
  getTeamMembers,
  markContactMessageRead,
  updateContactMessage,
  updateCandidateProfile,
  updateClientProfile,
  updateTeamMember,
  createTeamMember,
} from "../controllers/adminResourcesController.js";

const router = express.Router();

router.get("/users", requireAuth, requireAdmin, getUsers);
router.get("/dashboard", requireAuth, requireAdmin, getDashboard); // ✅ ADD THIS
router.delete("/user/:id", requireAuth, requireAdmin, deleteUser);

router.get("/candidate-profiles", requireAuth, requireAdmin, getCandidateProfiles);
router.post("/candidate-profiles", requireAuth, requireAdmin, createCandidateProfile);
router.put("/candidate-profiles/:id", requireAuth, requireAdmin, updateCandidateProfile);
router.delete("/candidate-profiles/:id", requireAuth, requireAdmin, deleteCandidateProfile);

router.get("/client-profiles", requireAuth, requireAdmin, getClientProfiles);
router.post("/client-profiles", requireAuth, requireAdmin, createClientProfile);
router.put("/client-profiles/:id", requireAuth, requireAdmin, updateClientProfile);
router.delete("/client-profiles/:id", requireAuth, requireAdmin, deleteClientProfile);

router.get("/contact-messages", requireAuth, requireAdmin, getContactMessages);
router.get("/contact-inbox", requireAuth, requireAdmin, getContactInboxMessages);
router.post("/contact-messages", requireAuth, requireAdmin, createContactMessage);
router.put("/contact-messages/:id", requireAuth, requireAdmin, updateContactMessage);
router.patch("/contact-messages/:id/read", requireAuth, requireAdmin, markContactMessageRead);
router.delete("/contact-messages/:id", requireAuth, requireAdmin, deleteContactMessage);

router.get("/team-members", requireAuth, requireAdmin, getTeamMembers);
router.post("/team-members", requireAuth, requireAdmin, createTeamMember);
router.put("/team-members/:id", requireAuth, requireAdmin, updateTeamMember);
router.delete("/team-members/:id", requireAuth, requireAdmin, deleteTeamMember);

export default router;
