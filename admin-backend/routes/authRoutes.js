// routes/authRoutes.js
import express from "express";
import { getMe, login, logout, register } from "../controllers/authController.js";
import { requireAuth } from "../Middlewares/auth.js";

const router = express.Router();

router.post("/login", login);
router.post("/register", register);
router.get("/me", requireAuth, getMe);
router.post("/logout", requireAuth, logout);

export default router;
