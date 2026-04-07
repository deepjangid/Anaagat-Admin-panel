import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import User from "./models/user.js";

dotenv.config();

const createAdmin = async () => {
  try {
    // 🔍 Debug (optional - you can remove later)
    // console.log("MONGO URI:", process.env.MONGODB_URI);

    // ✅ Connect DB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB Connected");

    // 🔐 Hash password
    const hashedPassword = await bcrypt.hash("admin123", 10);

    // ⚠️ Check if admin already exists
    const existingAdmin = await User.findOne({ email: "admin@gmail.com" });
    if (existingAdmin) {
      console.log("⚠️ Admin already exists");
      process.exit();
    }

    // 👑 Create admin
    const admin = await User.create({
      name: "Admin",
      email: "admin@gmail.com",
      password: hashedPassword,
      role: "admin"
    });

    console.log("✅ Admin created successfully");
    console.log(admin);

    process.exit();

  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
};

createAdmin();
