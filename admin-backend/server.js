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
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim()).filter(Boolean)
  : [];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser requests (no Origin header) and allow-all when not configured.
      if (!origin || corsOrigins.length === 0) return callback(null, true);
      if (corsOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
  })
);
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
