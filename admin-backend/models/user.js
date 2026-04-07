// models/User.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, lowercase: true, trim: true },
  password: String,
  isActive: {
    type: Boolean,
    default: true,
  },
  role: {
    type: String,
    enum: ["user", "admin", "candidate"],
    default: "user"
  }
}, { timestamps: true });

export default mongoose.model("User", userSchema);
