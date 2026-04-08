import mongoose from "mongoose";

// Flexible schema: supports existing Mongo documents even if fields differ.
const contactMessageSchema = new mongoose.Schema(
  {
    // Provide a few common fields; strict:false keeps backward compatibility.
    name: String,
    email: String,
    phone: String,
    subject: String,
    message: String,
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true, strict: false }
);

export default mongoose.model(
  "ContactMessage",
  contactMessageSchema,
  "contactmessages"
);

