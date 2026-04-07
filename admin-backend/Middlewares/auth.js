// middlewares/auth.js
import jwt from "jsonwebtoken";

const getJwtSecret = () => {
  return process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
};

export const requireAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) return res.status(401).json({ msg: "No token" });

  try {
    const secret = getJwtSecret();
    if (!secret) return res.status(500).json({ msg: "JWT secret not set" });

    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ msg: "Invalid token" });
  }
};

export const requireAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ msg: "Admin only" });
  }
  next();
};
