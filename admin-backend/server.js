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
app.use(cors({
  origin: "https://anaagat-admin-panel.vercel.app",
  credentials: true
}));

// ✅ Handle preflight (VERY IMPORTANT)
app.options("*", cors());

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