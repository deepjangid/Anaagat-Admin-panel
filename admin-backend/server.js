import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { isProduction, logError, logInfo, logWarn } from "./utils/logger.js";

import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import jobRoutes from "./routes/jobRoutes.js";
import openingRoutes from "./routes/openingRoutes.js";
import applicationsRoutes from "./routes/applicationsRoutes.js";
import candidateApplicationsRoutes from "./routes/candidateApplicationsRoutes.js";
import blogPostRoutes from "./routes/blogPostRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });
dotenv.config({ path: path.join(__dirname, "..", ".env"), override: false });

const app = express();
app.set("trust proxy", true);

const stripWrappingQuotes = (value) => {
  const v = String(value || "").trim();
  if (!v) return "";
  const doubleQuoted = v.match(/^"(.*)"$/);
  if (doubleQuoted) return String(doubleQuoted[1]).trim();
  const singleQuoted = v.match(/^'(.*)'$/);
  if (singleQuoted) return String(singleQuoted[1]).trim();
  return v;
};

const normalizeOrigin = (value) => {
  const raw = stripWrappingQuotes(value).trim();
  if (!raw) return "";
  try {
    return new URL(raw).origin;
  } catch {
    return raw.replace(/\/+$/, "");
  }
};

const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN
      .split(",")
      .map((o) => normalizeOrigin(o))
      .filter(Boolean)
  : [];
const corsAllowAll = corsOrigins.includes("*");

const corsOptions = {
  origin: (origin, callback) => {
    // Some requests (same-origin / server-to-server) may not include Origin; allow them.
    if (!origin) return callback(null, true);

    // If not configured, allow all (tighten in production via CORS_ORIGIN).
    if (corsAllowAll || corsOrigins.length === 0) return callback(null, true);

    if (corsOrigins.includes(origin)) return callback(null, true);
    logWarn("[cors] blocked origin:", origin, "allowed:", corsOrigins);
    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
};

logInfo(
  "[cors] allowlist:",
  corsAllowAll ? "*" : corsOrigins.length ? corsOrigins : "(not set - allow all)"
);

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));
app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/openings", openingRoutes);
app.use("/api/blogposts", blogPostRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/applications", applicationsRoutes);
app.use("/api", candidateApplicationsRoutes);

app.get("/", (req, res) => {
  res.send("Backend is running");
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

app.use((error, _req, res, _next) => {
  logError("Unhandled request error:", error?.message || error);
  res.status(500).json({ success: false, message: "Internal server error" });
});

const startServer = async () => {
  try {
    const mongoUri = stripWrappingQuotes(process.env.MONGO_URI || process.env.MONGODB_URI);

    if (!mongoUri) {
      throw new Error(
        "Missing MONGO_URI. Add it to admin-backend/.env or the project root .env."
      );
    }

    await mongoose.connect(mongoUri);

    logInfo("MongoDB connected", mongoose.connection.name);
    mongoose.connection.on("error", (error) => {
      logError("MongoDB runtime error:", error?.message || error);
    });

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}${isProduction ? "" : " (dev)"}`);
    });
  } catch (err) {
    logError("DB connection error:", err.message || err);
    process.exitCode = 1;
  }
};

startServer();
