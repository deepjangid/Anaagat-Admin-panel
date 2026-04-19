import mongoose from "mongoose";
import Application from "../models/Application.js";
import Job from "../models/Job.js";
import Opening from "../models/Opening.js";
import User from "../models/user.js";
import CandidateProfile from "../models/CandidateProfile.js";
import {
  APPLICATION_STATUS_OPTIONS,
  buildApplicationSearchQuery,
  findApplicationById,
  findApplicationList,
  findUniqueResumeList,
  findApplicationsForCandidate,
  normalizeAdminMessage,
  normalizeApplicationStatus,
  normalizeCandidateResponseDetails,
  normalizeNextStepInfo,
  updateApplicationAdminResponse,
} from "../services/applicationService.js";
import { subscribeToCandidateApplications } from "../services/applicationEvents.js";

const ALLOWED_STATUSES = new Set(APPLICATION_STATUS_OPTIONS);

const normalizeString = (value) =>
  value === undefined || value === null ? undefined : String(value).trim();

const normalizeExperience = (value) => {
  if (Array.isArray(value)) return value;
  const text = String(value || "").trim();
  if (!text) return [];
  if (text.toLowerCase() === "fresher") return [];
  return [{ jobProfile: text }];
};

const getCandidateProfileForUser = async (user) => {
  if (!user?._id && !user?.email) return null;

  const candidates = [];

  if (user?._id) {
    candidates.push(
      CandidateProfile.findOne({
        $or: [
          { userId: user._id },
          { candidateId: user._id },
          { user: user._id },
          { userRef: user._id },
        ],
      }).lean()
    );
  }

  if (user?.email) {
    candidates.push(
      CandidateProfile.findOne({ email: String(user.email).trim().toLowerCase() }).lean()
    );
  }

  const results = await Promise.all(candidates);
  return results.find(Boolean) || null;
};

const getCandidateProfileForApplication = async (application = {}) => {
  if (!application?.candidateId && !application?.email) return null;

  const candidateId =
    application?.candidateId?._id ||
    application?.candidateId ||
    null;
  const email = application?.email ? String(application.email).trim().toLowerCase() : "";

  const candidates = [];

  if (candidateId && mongoose.isValidObjectId(candidateId)) {
    candidates.push(
      CandidateProfile.findOne({
        $or: [
          { userId: candidateId },
          { candidateId },
          { user: candidateId },
          { userRef: candidateId },
        ],
      }).lean()
    );
  }

  if (email) {
    candidates.push(CandidateProfile.findOne({ email }).sort({ updatedAt: -1, createdAt: -1 }).lean());
  }

  const results = await Promise.all(candidates);
  return results.find(Boolean) || null;
};

const mergeResumeFields = (application = {}, candidateProfile = null) => {
  if (!candidateProfile) return application;

  const profileResumePath = candidateProfile?.resumePath || candidateProfile?.resume || undefined;
  const profileResumeData = candidateProfile?.resumeData || undefined;
  const hasProfileResume =
    Boolean(candidateProfile?.hasCustomResume) ||
    Boolean(profileResumePath) ||
    Boolean(profileResumeData);

  if (!hasProfileResume) return application;

  return {
    ...application,
    resumePath: profileResumePath ?? application.resumePath,
    resumeData: profileResumeData ?? application.resumeData,
    hasCustomResume: Boolean(candidateProfile?.hasCustomResume) || Boolean(profileResumePath) || Boolean(profileResumeData),
    updatedAt: candidateProfile?.updatedAt || application.updatedAt,
  };
};

const pickFirstText = (...values) => {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return "";
};

const pickFirstId = (...values) => {
  for (const value of values) {
    if (!value) continue;
    if (mongoose.isValidObjectId(value)) return value;
  }
  return undefined;
};

const toExperienceArray = (value) => {
  if (Array.isArray(value)) return value;
  const text = String(value || "").trim();
  if (!text || text.toLowerCase() === "fresher") return [];
  return [{ jobProfile: text }];
};

const resolveJobRecord = async (jobId) => {
  const existingJob = await Job.findById(jobId);
  if (existingJob) {
    return { job: existingJob, opening: null, sourceType: "job" };
  }

  const opening = await Opening.findById(jobId);
  if (!opening) return null;

  return { job: null, opening, sourceType: "opening" };
};

const parsePagination = (req) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const skip = (page - 1) * limit;
  return { limit, page, skip };
};

const buildSearchQuery = (search) => {
  const value = String(search || "").trim();
  if (!value) return null;

  const isObjectId = /^[a-fA-F0-9]{24}$/.test(value);
  if (isObjectId) return { _id: new mongoose.Types.ObjectId(value) };

  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rx = new RegExp(escaped, "i");
  return {
    $or: [
      { fullName: rx },
      { name: rx },
      { email: rx },
      { phone: rx },
      { currentCity: rx },
      { qualification: rx },
      { college: rx },
      { jobTitle: rx },
      { appliedFor: rx },
      { appliedJobTitle: rx },
      { position: rx },
      { jobRole: rx },
      { desiredRole: rx },
      { profile: rx },
      { title: rx },
      { adminMessage: rx },
    ],
  };
};

export const createApplication = async (req, res) => {
  try {
    const jobId = String(req.body?.jobId || "").trim();
    if (!mongoose.isValidObjectId(jobId)) {
      return res.status(400).json({ success: false, message: "Valid jobId is required" });
    }

    const candidateUser = await User.findById(req.user?.id).lean();
    if (!candidateUser) {
      return res.status(401).json({ success: false, message: "Candidate user not found" });
    }

    const resolved = await resolveJobRecord(jobId);
    if (!resolved) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    const candidateProfile = await getCandidateProfileForUser(candidateUser);
    const canonicalJobId = resolved.job?._id;
    const openingId = resolved.opening?._id;

    const existingQuery = canonicalJobId
      ? {
          candidateId: candidateUser._id,
          jobId: canonicalJobId,
        }
      : {
          candidateId: candidateUser._id,
          sourceCollection: "openings",
          sourceJobId: openingId,
        };

    const existingApplication = await Application.findOne(existingQuery).lean();
    if (existingApplication) {
      return res.status(409).json({
        success: false,
        message: "Application already exists for this candidate and job",
        application: existingApplication,
      });
    }

    const appliedAt = new Date();
    const clientId = resolved.job
      ? pickFirstId(
          resolved.job?.clientId,
          resolved.job?.ownerId,
          resolved.job?.createdBy,
          resolved.job?.postedBy
        )
      : pickFirstId(resolved.opening?.clientId);
    const appliedFor = pickFirstText(
      resolved.job?.title,
      resolved.job?.jobTitle,
      resolved.opening?.title,
      resolved.opening?.jobTitle
    );

    const application = await Application.create({
      candidateId: candidateUser._id,
      ...(clientId ? { clientId } : {}),
      ...(canonicalJobId ? { jobId: canonicalJobId } : {}),
      ...(openingId ? { openingId } : {}),
      ...(openingId
        ? {
            sourceCollection: "openings",
            sourceJobId: openingId,
            sourceSnapshot: {
              title: pickFirstText(resolved.opening?.title, resolved.opening?.jobTitle),
              company: pickFirstText(resolved.opening?.company, resolved.opening?.department),
              location: pickFirstText(resolved.opening?.location, resolved.opening?.jobLocation),
              type: pickFirstText(resolved.opening?.type, resolved.opening?.employmentType),
            },
          }
        : {}),
      fullName: pickFirstText(
        candidateProfile?.fullName,
        candidateProfile?.name,
        candidateUser?.name
      ),
      email: pickFirstText(candidateProfile?.email, candidateUser?.email).toLowerCase(),
      phone: pickFirstText(
        candidateProfile?.phone,
        candidateProfile?.mobile,
        candidateProfile?.contactNumber
      ),
      qualification: pickFirstText(
        candidateProfile?.qualification,
        candidateProfile?.highestQualification,
        candidateProfile?.education
      ),
      college: pickFirstText(
        candidateProfile?.college,
        candidateProfile?.collegeName,
        candidateProfile?.institute,
        candidateProfile?.university
      ),
      currentCity: pickFirstText(
        candidateProfile?.currentCity,
        candidateProfile?.city,
        candidateProfile?.location
      ),
      jobTitle: appliedFor,
      appliedFor,
      position: appliedFor,
      experience: toExperienceArray(candidateProfile?.experience),
      resumePath: candidateProfile?.resumePath || candidateProfile?.resume || undefined,
      resumeData: candidateProfile?.resumeData || undefined,
      hasCustomResume:
        Boolean(candidateProfile?.hasCustomResume) ||
        Boolean(candidateProfile?.resumePath) ||
        Boolean(candidateProfile?.resumeData),
      status: "pending",
      adminMessage: "",
      statusUpdatedAt: appliedAt,
      adminResponseStatus: "pending",
      adminResponseMessage: "",
      nextStepInfo: "",
      submittedAt: appliedAt,
      timeline: [
        {
          status: "pending",
          note: "Application submitted successfully.",
          changedByRole: "candidate",
          createdAt: appliedAt,
        },
      ],
    });

    const populated = await findApplicationById(application._id);

    res.status(201).json({
      success: true,
      message: resolved.sourceType === "opening"
        ? "Application created successfully for opening"
        : "Application created successfully",
      application: populated,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to create application" });
  }
};

export const getApplications = async (req, res) => {
  try {
    const { limit, page } = parsePagination(req);
    const status = req.query.status ? String(req.query.status).trim() : "";
    const search = req.query.search ? String(req.query.search).trim() : "";
    const hasResumeRaw = req.query.hasResume;
    const hasResume =
      hasResumeRaw === true ||
      hasResumeRaw === "true" ||
      hasResumeRaw === "1" ||
      hasResumeRaw === 1;
    const uniqueCandidatesRaw = req.query.uniqueCandidates;
    const uniqueCandidates =
      uniqueCandidatesRaw === true ||
      uniqueCandidatesRaw === "true" ||
      uniqueCandidatesRaw === "1" ||
      uniqueCandidatesRaw === 1;

    const query = {};
    if (status) query.status = status;

    const searchQuery = buildApplicationSearchQuery(search);
    if (searchQuery) Object.assign(query, searchQuery);

    if (hasResume) {
      const resumeQuery = {
        $or: [
          { resumeData: { $exists: true, $ne: null } },
          { resumePath: { $exists: true, $ne: null } },
          { hasCustomResume: true },
        ],
      };

      // If search already introduced a `$or`, combine with AND so we still enforce resume presence.
      if (Array.isArray(query.$or) && query.$or.length > 0) {
        query.$and = [{ $or: query.$or }, resumeQuery];
        delete query.$or;
      } else {
        Object.assign(query, resumeQuery);
      }
    }

    const result =
      hasResume && uniqueCandidates
        ? await findUniqueResumeList({ query, page, limit })
        : await findApplicationList({ query, page, limit });

    const applications = hasResume && uniqueCandidates
      ? await Promise.all(
          (result.applications || []).map(async (application) =>
            mergeResumeFields(application, await getCandidateProfileForApplication(application))
          )
        )
      : result.applications;

    res.json({
      success: true,
      applications,
      total: result.total,
      currentPage: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to fetch applications" });
  }
};

export const getApplicationById = async (req, res) => {
  try {
    const application = await findApplicationById(req.params.id);
    if (!application) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, application });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch application" });
  }
};

export const getApplicationStats = async (req, res) => {
  try {
    const groups = await Application.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const stats = {
      total: 0,
      pending: 0,
      shortlisted: 0,
      rejected: 0,
      accepted: 0,
    };

    for (const g of groups) {
      const key = String(g._id || "").toLowerCase();
      const count = Number(g.count || 0) || 0;
      stats.total += count;
      if (key in stats) stats[key] = count;
    }

    res.json({ success: true, stats });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to fetch stats" });
  }
};

export const updateApplicationStatus = async (req, res) => {
  try {
    const status = normalizeApplicationStatus(req.body?.status);
    if (!status || !ALLOWED_STATUSES.has(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${APPLICATION_STATUS_OPTIONS.join(", ")}`,
      });
    }

    const application = await updateApplicationAdminResponse(req.params.id, {
      status,
      adminMessage: normalizeAdminMessage(req.body?.adminMessage),
      nextStepInfo: normalizeNextStepInfo(req.body?.nextStepInfo),
      candidateResponseDetails: normalizeCandidateResponseDetails(req.body?.candidateResponseDetails),
      actorRole: req.user?.role || "admin",
    });

    if (!application) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, message: "Application status updated", application });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to update status" });
  }
};

export const updateApplicationNotes = async (req, res) => {
  try {
    const notes = req.body?.notes === undefined ? "" : String(req.body.notes);
    const application = await Application.findByIdAndUpdate(
      req.params.id,
      { notes },
      { returnDocument: "after" }
    ).lean();

    if (!application) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, application });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to update notes" });
  }
};

export const updateApplication = async (req, res) => {
  try {
    const status = normalizeApplicationStatus(req.body?.status);
    const hasAdminResponseFields =
      status ||
      req.body?.adminMessage !== undefined ||
      req.body?.nextStepInfo !== undefined ||
      req.body?.candidateResponseDetails !== undefined;

    if (hasAdminResponseFields) {
      if (!status) {
        return res.status(400).json({
          success: false,
          message: `Status must be one of: ${APPLICATION_STATUS_OPTIONS.join(", ")}`,
        });
      }

      const application = await updateApplicationAdminResponse(req.params.id, {
        status,
        adminMessage: normalizeAdminMessage(req.body?.adminMessage),
        nextStepInfo: normalizeNextStepInfo(req.body?.nextStepInfo),
        candidateResponseDetails: normalizeCandidateResponseDetails(req.body?.candidateResponseDetails),
        actorRole: req.user?.role || "admin",
      });

      if (!application) return res.status(404).json({ success: false, message: "Not found" });
      return res.json({ success: true, message: "Application updated", application });
    }

    const payload = {
      ...(normalizeString(req.body?.fullName) !== undefined ? { fullName: normalizeString(req.body.fullName) } : {}),
      ...(normalizeString(req.body?.email) !== undefined ? { email: normalizeString(req.body.email).toLowerCase() } : {}),
      ...(normalizeString(req.body?.phone) !== undefined ? { phone: normalizeString(req.body.phone) } : {}),
      ...(normalizeString(req.body?.jobTitle) !== undefined ? { jobTitle: normalizeString(req.body.jobTitle) } : {}),
      ...(normalizeString(req.body?.appliedFor) !== undefined ? { appliedFor: normalizeString(req.body.appliedFor) } : {}),
      ...(normalizeString(req.body?.position) !== undefined ? { position: normalizeString(req.body.position) } : {}),
      ...(normalizeString(req.body?.qualification) !== undefined ? { qualification: normalizeString(req.body.qualification) } : {}),
      ...(normalizeString(req.body?.college) !== undefined ? { college: normalizeString(req.body.college) } : {}),
      ...(normalizeString(req.body?.currentCity) !== undefined ? { currentCity: normalizeString(req.body.currentCity) } : {}),
      ...(req.body?.experience !== undefined ? { experience: normalizeExperience(req.body.experience) } : {}),
    };

    const application = await Application.findByIdAndUpdate(
      req.params.id,
      payload,
      { returnDocument: "after" }
    )
      .populate("clientId", "name email")
      .populate("jobId", "title jobTitle company")
      .populate("openingId", "title jobTitle company")
      .lean();

    if (!application) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, message: "Application updated", application });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to update application" });
  }
};

export const getMyApplications = async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const candidate = await User.findById(req.user?.id).lean();

    if (!candidate) {
      return res.status(404).json({ success: false, message: "Candidate account not found" });
    }

    const result = await findApplicationsForCandidate({
      candidateId: candidate._id,
      email: candidate.email,
      page,
      limit,
    });

    res.json({
      success: true,
      applications: result.applications,
      total: result.total,
      currentPage: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to fetch candidate applications" });
  }
};

export const streamMyApplications = async (req, res) => {
  try {
    const candidate = await User.findById(req.user?.id).lean();
    if (!candidate) {
      return res.status(404).json({ success: false, message: "Candidate account not found" });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    const unsubscribe = subscribeToCandidateApplications(String(candidate._id), res);
    const heartbeat = setInterval(() => {
      res.write(`event: heartbeat\ndata: ${Date.now()}\n\n`);
    }, 25000);

    req.on("close", () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  } catch (error) {
    console.error(error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: "Failed to start application stream" });
    }
  }
};

export const updateApplicationResponse = updateApplication;

export const deleteApplication = async (req, res) => {
  try {
    const application = await Application.findByIdAndDelete(req.params.id).lean();
    if (!application) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to delete application" });
  }
};

export const downloadApplicationResume = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id).lean();
    if (!application) return res.status(404).json({ success: false, message: "Not found" });

    const candidateProfile = await getCandidateProfileForApplication(application);
    const latestResumeData = candidateProfile?.resumeData || application.resumeData;

    const data = latestResumeData;
    if (!data) {
      return res.status(404).json({ success: false, message: "Resume not available" });
    }

    // Mongo Binary becomes a Buffer in most cases (or an object with a `buffer` field).
    let buffer = null;
    if (Buffer.isBuffer(data)) buffer = data;
    else if (data?.buffer && Buffer.isBuffer(data.buffer)) buffer = data.buffer;
    else if (typeof data === "string") buffer = Buffer.from(data, "base64");
    else if (Array.isArray(data?.data)) buffer = Buffer.from(data.data);

    if (!buffer) {
      return res.status(500).json({ success: false, message: "Invalid resume data" });
    }

    const safeName = String(application.fullName || "Applicant")
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9._-]/g, "");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${safeName || "Applicant"}_Resume.pdf"`);
    res.send(buffer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to download resume" });
  }
};
