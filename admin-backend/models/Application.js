import mongoose from "mongoose";

const applicationSchema = new mongoose.Schema(
  {
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job" },
    openingId: { type: mongoose.Schema.Types.ObjectId, ref: "Opening" },
    sourceCollection: { type: String, trim: true, lowercase: true },
    sourceJobId: { type: mongoose.Schema.Types.ObjectId },
    sourceSnapshot: {
      title: { type: String, default: "" },
      company: { type: String, default: "" },
      location: { type: String, default: "" },
      type: { type: String, default: "" },
    },
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
    resume: {
      url: { type: String, default: "", trim: true },
      fileId: { type: String, default: "", trim: true },
      name: { type: String, default: "", trim: true },
      size: { type: Number, default: 0 },
      type: { type: String, default: "", trim: true },
    },
    hasCustomResume: { type: Boolean, default: false },

    status: {
      type: String,
      enum: ["pending", "shortlisted", "rejected", "accepted"],
      default: "pending",
    },

    adminMessage: { type: String, default: "" },
    statusUpdatedAt: { type: Date },
    adminResponseStatus: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
    adminResponseMessage: { type: String, default: "" },
    candidateResponseDetails: {
      interviewMode: { type: String, default: "" },
      interviewDate: { type: String, default: "" },
      interviewTime: { type: String, default: "" },
      interviewLocation: { type: String, default: "" },
      googleMapUrl: { type: String, default: "" },
      contactPerson: { type: String, default: "" },
      contactPhone: { type: String, default: "" },
      contactEmail: { type: String, default: "" },
      reportingNotes: { type: String, default: "" },
      documentsRequired: { type: String, default: "" },
      additionalInstructions: { type: String, default: "" },
    },
    nextStepInfo: { type: String, default: "" },
    respondedAt: { type: Date },
    timeline: {
      type: [
        {
          status: { type: String, trim: true },
          note: { type: String, trim: true },
          changedByRole: { type: String, trim: true },
          createdAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    submittedAt: { type: Date },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

// Allow one application per candidate per Job when `jobId` exists.
applicationSchema.index(
  { candidateId: 1, jobId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      candidateId: { $exists: true, $type: 'objectId' },
      jobId: { $exists: true, $type: 'objectId' },
    },
  }
);

// Allow one application per candidate per Opening when `openingId` exists.
applicationSchema.index(
  { candidateId: 1, openingId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      candidateId: { $exists: true, $type: 'objectId' },
      openingId: { $exists: true, $type: 'objectId' },
    },
  }
);

// Source-aware uniqueness for internal openings.
applicationSchema.index(
  { candidateId: 1, sourceCollection: 1, sourceJobId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      candidateId: { $exists: true, $type: 'objectId' },
      sourceCollection: { $exists: true, $type: 'string' },
      sourceJobId: { $exists: true, $type: 'objectId' },
    },
  }
);

export default mongoose.model("Application", applicationSchema, "applications");

