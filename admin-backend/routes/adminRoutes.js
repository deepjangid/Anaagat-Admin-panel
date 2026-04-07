import express from "express";
import { requireAuth, requireAdmin } from "../Middlewares/auth.js";
import { getUsers, deleteUser, getDashboard } from "../controllers/adminController.js";

const router = express.Router();

router.get("/users", requireAuth, requireAdmin, getUsers);
router.get("/dashboard", requireAuth, requireAdmin, getDashboard); // ✅ ADD THIS
router.delete("/user/:id", requireAuth, requireAdmin, deleteUser);

export default router;
