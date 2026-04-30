import mongoose from "mongoose";

const teamMemberSchema = new mongoose.Schema(
  {},
  { timestamps: true, strict: false }
);

export default mongoose.model(
  "TeamMember",
  teamMemberSchema,
  "teammembers"
);
