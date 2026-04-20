import mongoose from "mongoose";

const blogPostSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      trim: true,
      default: null,
    },
    coverImage: {
      type: String,
      default: "",
      trim: true,
    },
    category: {
      type: String,
      default: "General",
      trim: true,
    },
    author: {
      type: String,
      default: "Anaagat Team",
      trim: true,
    },
    publishDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ["Draft", "Published", "Archived"],
      default: "Published",
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    excerpt: {
      type: String,
      default: "",
      trim: true,
    },
    content: {
      type: String,
      default: "",
    },
    tags: {
      type: [String],
      default: [],
    },
    readingTime: {
      type: String,
      default: "",
      trim: true,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

blogPostSchema.pre("save", function syncPublishedFlag() {
  this.isPublished = String(this.status || "").trim().toLowerCase() === "published";
});

blogPostSchema.pre("findOneAndUpdate", function syncPublishedFlagOnUpdate() {
  const update = this.getUpdate() || {};
  const nextStatus = update.status ?? update.$set?.status;
  const nextIsPublished =
    update.isPublished ?? update.$set?.isPublished;

  if (nextStatus !== undefined) {
    const derived = String(nextStatus || "").trim().toLowerCase() === "published";
    update.isPublished = derived;
    if (update.$set && typeof update.$set === "object") {
      update.$set.isPublished = derived;
    }
  } else if (nextIsPublished !== undefined) {
    const derivedStatus = nextIsPublished ? "Published" : "Draft";
    update.status = derivedStatus;
    if (update.$set && typeof update.$set === "object") {
      update.$set.status = derivedStatus;
    }
  }

  this.setUpdate(update);
});

export default mongoose.model("BlogPost", blogPostSchema, "blogposts");
