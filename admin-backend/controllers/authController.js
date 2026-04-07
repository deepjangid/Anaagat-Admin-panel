// controllers/authController.js
import User from "../models/user.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

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

    const jwtSecret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
    if (!jwtSecret) return res.status(500).json({ msg: "JWT secret not set" });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      jwtSecret,
      { expiresIn: "1d" }
    );

    const { password: _, ...safeUser } = user._doc;

    res.json({ token, user: safeUser });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ msg: "Server error" });
  }
};
