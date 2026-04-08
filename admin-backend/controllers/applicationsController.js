import mongoose from "mongoose";
import Application from "../models/Application.js";

const ALLOWED_STATUSES = new Set([
  "pending",
  "reviewing",
  "shortlisted",
  "rejected",
  "hired",
]);

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
    $or: [{ fullName: rx }, { email: rx }, { phone: rx }, { currentCity: rx }],
  };
};

export const getApplications = async (req, res) => {
  try {
    const { limit, page, skip } = parsePagination(req);
    const status = req.query.status ? String(req.query.status).trim() : "";
    const search = req.query.search ? String(req.query.search).trim() : "";
    const hasResumeRaw = req.query.hasResume;
    const hasResume =
      hasResumeRaw === true ||
      hasResumeRaw === "true" ||
      hasResumeRaw === "1" ||
      hasResumeRaw === 1;

    const query = {};
    if (status) query.status = status;

    const searchQuery = buildSearchQuery(search);
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

    const [total, applications] = await Promise.all([
      Application.countDocuments(query),
      Application.find(query)
        .sort({ submittedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    res.json({
      success: true,
      applications,
      total,
      currentPage: page,
      limit,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to fetch applications" });
  }
};

export const getApplicationById = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id).lean();
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
      reviewing: 0,
      shortlisted: 0,
      hired: 0,
      rejected: 0,
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
    const status = String(req.body?.status || "").trim().toLowerCase();
    if (!ALLOWED_STATUSES.has(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const application = await Application.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).lean();

    if (!application) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, application });
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
      { new: true }
    ).lean();

    if (!application) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, application });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to update notes" });
  }
};

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

    const data = application.resumeData;
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
