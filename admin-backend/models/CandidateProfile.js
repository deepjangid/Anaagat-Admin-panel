import mongoose from "mongoose";

// Flexible schema: supports existing Mongo documents even if fields differ.
const candidateProfileSchema = new mongoose.Schema(
  {},
  { timestamps: true, strict: false }
);

export default mongoose.model(
  "CandidateProfile",
  candidateProfileSchema,
  "candidateprofiles"
);

