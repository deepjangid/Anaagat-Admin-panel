// controllers/jobController.js
import Job from "../models/Job.js";

const normalizeStatus = (status) => {
  if (!status) return "active";
  const value = String(status).trim().toLowerCase();
  if (value === "active" || value === "open") return "active";
  if (value === "inactive" || value === "closed" || value === "close") return "closed";
  return value;
};

const formatJobForFrontend = (job) => {
  const raw = job?.toObject ? job.toObject() : job;

  const title = raw?.title ?? raw?.jobTitle ?? "";
  const company = raw?.company ?? raw?.department ?? "";
  const location = raw?.location ?? raw?.jobLocation ?? "";
  const type = raw?.type ?? raw?.employmentType ?? "";
  const category = raw?.category ?? raw?.department ?? "";
  const status = normalizeStatus(raw?.status);

  return {
    _id: raw?._id,
    title,
    company,
    location,
    type,
    category,
    status: status === "active" ? "Active" : "Closed",
    viewCount: raw?.viewCount || 0,
  };
};

const normalizeJobPayload = (payload = {}) => {
  const body = payload && typeof payload === "object" ? payload : {};

  const title = body.title ?? body.jobTitle;
  const company = body.company ?? body.department;
  const location = body.location ?? body.jobLocation;
  const type = body.type ?? body.employmentType;
  const category = body.category ?? body.department;

  return {
    ...(title !== undefined ? { title } : {}),
    ...(company !== undefined ? { company } : {}),
    ...(location !== undefined ? { location } : {}),
    ...(type !== undefined ? { type } : {}),
    ...(category !== undefined ? { category } : {}),

    ...(body.jobTitle !== undefined ? { jobTitle: body.jobTitle } : {}),
    ...(body.department !== undefined ? { department: body.department } : {}),
    ...(body.jobLocation !== undefined ? { jobLocation: body.jobLocation } : {}),
    ...(body.employmentType !== undefined ? { employmentType: body.employmentType } : {}),

    ...(body.status !== undefined ? { status: normalizeStatus(body.status) } : {}),
    ...(body.viewCount !== undefined ? { viewCount: body.viewCount } : {}),
  };
};

// ✅ GET ALL JOBS
export const getJobs = async (req, res) => {
  try {
    const jobsData = await Job.find();
    const formattedJobs = jobsData.map(formatJobForFrontend);

    res.json({
      success: true,
      jobs: formattedJobs,
      data: formattedJobs,
      total: formattedJobs.length,
      currentPage: 1,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching jobs" });
  }
};

// ✅ CREATE JOB
export const createJob = async (req, res) => {
  try {
    const job = await Job.create(normalizeJobPayload(req.body));

    res.json({
      success: true,
      message: "Job created",
      job,
      formattedJob: formatJobForFrontend(job),
    });
  } catch (error) {
    res.status(500).json({ message: "Error creating job" });
  }
};

// ✅ UPDATE JOB
export const updateJob = async (req, res) => {
  try {
    const job = await Job.findByIdAndUpdate(
      req.params.id,
      normalizeJobPayload(req.body),
      { new: true }
    );

    res.json({
      success: true,
      job,
      formattedJob: job ? formatJobForFrontend(job) : null,
    });
  } catch (error) {
    res.status(500).json({ message: "Error updating job" });
  }
};

// ✅ DELETE JOB
export const deleteJob = async (req, res) => {
  try {
    await Job.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Deleted",
    });
  } catch (error) {
    res.status(500).json({ message: "Error deleting job" });
  }
};
