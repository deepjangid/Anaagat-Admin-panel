import mongoose from "mongoose";

const openingSchema = new mongoose.Schema(
  {
    title: String,
    company: String,
    location: String,
    type: String,
    category: String,
    genderRequirement: String,
    qualification: String,
    experience: String,
    fixedPrice: Number,
    ageRequirement: String,
    salary: {
      min: Number,
      max: Number,
      currency: String,
    },
    description: String,
    requirements: [String],
    responsibilities: [String],
    skills: [String],
    applicationDeadline: Date,
    contactEmail: String,
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
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

export default mongoose.model("Opening", openingSchema, "openings");
