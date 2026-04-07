import mongoose from "mongoose";

const jobSchema = new mongoose.Schema(
  {
    // Canonical fields used by API responses
    title: String,
    company: String,
    location: String,
    type: String,
    category: String,

    // Backward/legacy fields (some clients send these keys)
    jobTitle: String,
    department: String,
    jobLocation: String,
    employmentType: String,

    status: {
      type: String,
      default: "active",
    },
    viewCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Job", jobSchema, "jobrequirements");
