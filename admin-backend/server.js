import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import jobRoutes from "./routes/jobRoutes.js";
import applicationsRoutes from "./routes/applicationsRoutes.js";

// 🔐 Load ENV
dotenv.config();

const app = express();

// ✅ Middlewares
const stripWrappingQuotes = (value) => {
  const v = String(value || "").trim();
  if (!v) return "";
  // Railway/Render variables sometimes get pasted with quotes.
  const doubleQuoted = v.match(/^"(.*)"$/);
  if (doubleQuoted) return String(doubleQuoted[1]).trim();
  const singleQuoted = v.match(/^'(.*)'$/);
  if (singleQuoted) return String(singleQuoted[1]).trim();
  return v;
};

const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN
      .split(",")
      .map((o) => stripWrappingQuotes(o))
      .map((o) => o.trim())
      .filter(Boolean)
  : [];
const corsAllowAll = corsOrigins.includes("*");

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (no Origin header) and allow-all when not configured.
    if (!origin) return callback(null, true);
    if (corsAllowAll || corsOrigins.length === 0) return callback(null, true);
    if (corsOrigins.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
};

app.use(cors({
  origin: "*",
  credentials: true
}));
// Express v5 (path-to-regexp) doesn't accept "*" as a path string.
// Use a regex to match all routes for preflight.
app.options(/.*/, cors(corsOptions));
app.use(express.json());

// 🔍 Debug (check ENV)
// console.log("MONGO URI:", process.env.MONGODB_URI);

// ✅ Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/applications", applicationsRoutes);

// ✅ Test route
app.get("/", (req, res) => {
  res.send("🚀 Backend is running...");
});

// ✅ DB connect + server start (IMPORTANT FIX)
const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log("✅ MongoDB Connected");
    console.log("🔥 DB NAME:", mongoose.connection.name);

    const PORT = process.env.PORT || 5000;

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

  } catch (err) {
    console.error("❌ DB Connection Error:", err);
  }
};

startServer();
