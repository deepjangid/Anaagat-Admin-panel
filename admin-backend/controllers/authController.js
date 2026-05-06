// controllers/authController.js
import User from "../models/user.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const getJwtSecret = () => process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;

const getSafeUser = (user) => {
  if (!user) return null;
  const source = user.toObject ? user.toObject() : user._doc || user;
  const { password: _, ...safeUser } = source;
  return safeUser;
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const normalizedEmail = String(email || "").trim().toLowerCase();
    const rawPassword = String(password || "");

    if (!normalizedEmail || !rawPassword) {
      return res.status(400).json({ msg: "Email and password are required" });
    }

    const escapedEmail = normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const user = await User.findOne({ email: new RegExp(`^${escapedEmail}$`, "i") });
    if (!user) return res.status(400).json({ msg: "Invalid credentials" });

    let isMatch = false;
    try {
      isMatch = await bcrypt.compare(rawPassword, user.password);
    } catch {
      isMatch = false;
    }
    if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

    const jwtSecret = getJwtSecret();
    if (!jwtSecret) return res.status(500).json({ msg: "JWT secret not set" });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      jwtSecret,
      { expiresIn: "1d" }
    );

    res.json({ token, user: getSafeUser(user) });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

export const register = async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const role = String(req.body?.role || "user").trim().toLowerCase();

    if (!name || !email || !password) {
      return res.status(400).json({ msg: "Name, email, and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ msg: "Password must be at least 6 characters long" });
    }

    if (!["user", "candidate", "admin"].includes(role)) {
      return res.status(400).json({ msg: "Invalid role selected" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ msg: "User already exists with this email" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
    });

    const jwtSecret = getJwtSecret();
    if (!jwtSecret) return res.status(500).json({ msg: "JWT secret not set" });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      jwtSecret,
      { expiresIn: "1d" }
    );

    res.status(201).json({ token, user: getSafeUser(user) });
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user?.id).select("-password -passwordHash");
    if (!user) return res.status(404).json({ msg: "User not found" });
    res.json({ user: getSafeUser(user) });
  } catch (err) {
    console.error("GET ME ERROR:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

export const logout = async (_req, res) => {
  res.json({ success: true, message: "Logged out successfully" });
};
