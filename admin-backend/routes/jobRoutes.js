import express from "express";
import {
  createJob,
  deleteAllJobs,
  deleteJob,
  getJobs,
  updateJob,
} from "../controllers/jobController.js";

const router = express.Router();

router.get("/", getJobs);
router.post("/", createJob);
router.delete("/", deleteAllJobs);
router.put("/:id", updateJob);
router.delete("/:id", deleteJob);

export default router;
