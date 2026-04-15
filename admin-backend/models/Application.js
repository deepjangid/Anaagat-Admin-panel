import mongoose from "mongoose";

const applicationSchema = new mongoose.Schema(
  {
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job" },
    openingId: { type: mongoose.Schema.Types.ObjectId, ref: "Opening" },
    fullName: { type: String },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    jobTitle: { type: String },
    appliedFor: { type: String },
    position: { type: String },
    qualification: { type: String },
    college: { type: String },
    currentCity: { type: String },

    experience: { type: Array, default: [] },

    resumePath: { type: String },
    resumeData: { type: mongoose.Schema.Types.Mixed },
    hasCustomResume: { type: Boolean, default: false },

    status: {
      type: String,
      default: "pending",
    },

    submittedAt: { type: Date },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("Application", applicationSchema, "applications");

