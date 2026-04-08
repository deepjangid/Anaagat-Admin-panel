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

// ✅ CORS (FINAL FIX)
const stripWrappingQuotes = (value) => {
  const v = String(value || "").trim();
  if (!v) return "";
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
    if (!origin) return callback(null, true);
    if (corsAllowAll || corsOrigins.length === 0) return callback(null, true);
    if (corsOrigins.includes(origin)) return callback(null, true);
    console.warn("[cors] blocked origin:", origin, "allowed:", corsOrigins);
    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

// ✅ Handle preflight (VERY IMPORTANT)
app.options(/.*/, cors());

// ✅ Body parser
app.use(express.json());

// ✅ Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/applications", applicationsRoutes);

// ✅ Test route
app.get("/", (req, res) => {
  res.send("🚀 Backend is running...");
});

// ✅ Start server
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

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
