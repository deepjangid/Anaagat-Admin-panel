import mongoose from "mongoose";
import Application from "../models/Application.js";
import { publishCandidateApplicationUpdate } from "./applicationEvents.js";

export const APPLICATION_STATUS_OPTIONS = ["pending", "shortlisted", "rejected", "accepted"];

const APPLICATION_POPULATION = [
  { path: "candidateId", select: "name email role" },
  { path: "clientId", select: "name email role" },
  { path: "jobId", select: "title jobTitle company" },
  { path: "openingId", select: "title jobTitle company" },
];

const APPLICATION_LIST_EXCLUDED_FIELDS = [
  "resumeData",
  "timeline",
].map((field) => `-${field}`).join(" ");

const buildPopulateQuery = (query) => {
  let next = query;
  for (const config of APPLICATION_POPULATION) {
    next = next.populate(config.path, config.select);
  }
  return next;
};

export const normalizeApplicationStatus = (value) => {
  const status = String(value || "").trim().toLowerCase();
  return APPLICATION_STATUS_OPTIONS.includes(status) ? status : "";
};

export const normalizeAdminMessage = (value) =>
  value === undefined || value === null ? "" : String(value).trim();

export const normalizeNextStepInfo = (value) =>
  value === undefined || value === null ? "" : String(value).trim();

const normalizeDetailField = (value) =>
  value === undefined || value === null ? "" : String(value).trim();

export const normalizeCandidateResponseDetails = (value) => {
  const details = value && typeof value === "object" ? value : {};

  return {
    interviewMode: normalizeDetailField(details.interviewMode),
    interviewDate: normalizeDetailField(details.interviewDate),
    interviewTime: normalizeDetailField(details.interviewTime),
    interviewLocation: normalizeDetailField(details.interviewLocation),
    googleMapUrl: normalizeDetailField(details.googleMapUrl),
    contactPerson: normalizeDetailField(details.contactPerson),
    contactPhone: normalizeDetailField(details.contactPhone),
    contactEmail: normalizeDetailField(details.contactEmail),
    reportingNotes: normalizeDetailField(details.reportingNotes),
    documentsRequired: normalizeDetailField(details.documentsRequired),
    additionalInstructions: normalizeDetailField(details.additionalInstructions),
  };
};

const buildNextStepInfoFromDetails = (details) => {
  const lines = [
    details.interviewMode ? `Mode: ${details.interviewMode}` : "",
    details.interviewDate ? `Date: ${details.interviewDate}` : "",
    details.interviewTime ? `Time: ${details.interviewTime}` : "",
    details.interviewLocation ? `Location: ${details.interviewLocation}` : "",
    details.googleMapUrl ? `Map: ${details.googleMapUrl}` : "",
    details.contactPerson ? `Contact Person: ${details.contactPerson}` : "",
    details.contactPhone ? `Contact Phone: ${details.contactPhone}` : "",
    details.contactEmail ? `Contact Email: ${details.contactEmail}` : "",
    details.reportingNotes ? `Reporting Notes: ${details.reportingNotes}` : "",
    details.documentsRequired ? `Documents Required: ${details.documentsRequired}` : "",
    details.additionalInstructions ? `Instructions: ${details.additionalInstructions}` : "",
  ].filter(Boolean);

  return lines.join("\n");
};

export const buildApplicationSearchQuery = (search) => {
  const value = String(search || "").trim();
  if (!value) return null;

  if (/^[a-fA-F0-9]{24}$/.test(value)) {
    return { _id: new mongoose.Types.ObjectId(value) };
  }

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
      { position: rx },
      { adminMessage: rx },
    ],
  };
};

export const findApplicationList = async ({ query = {}, page = 1, limit = 10 } = {}) => {
  const skip = (page - 1) * limit;

  const [total, applications] = await Promise.all([
    Application.countDocuments(query),
    buildPopulateQuery(
      Application.find(query)
        .select(APPLICATION_LIST_EXCLUDED_FIELDS)
        .sort({ updatedAt: -1, submittedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
    ).lean(),
  ]);

  return {
    total,
    page,
    limit,
    totalPages: Math.max(Math.ceil(total / limit), 1),
    applications,
  };
};

export const findUniqueResumeList = async ({ query = {}, page = 1, limit = 10 } = {}) => {
  const skip = (page - 1) * limit;
  const candidateKey = {
    $ifNull: [
      { $toString: "$candidateId" },
      {
        $ifNull: [
          { $toLower: { $ifNull: ["$email", ""] } },
          { $toString: "$_id" },
        ],
      },
    ],
  };

  const [totalResult, groupedApplications] = await Promise.all([
    Application.aggregate([
      { $match: query },
      { $addFields: { candidateKey } },
      { $group: { _id: "$candidateKey" } },
      { $count: "total" },
    ]),
    Application.aggregate([
      { $match: query },
      { $addFields: { candidateKey } },
      { $sort: { updatedAt: -1, submittedAt: -1, createdAt: -1, _id: -1 } },
      { $group: { _id: "$candidateKey", applicationId: { $first: "$_id" } } },
      { $skip: skip },
      { $limit: limit },
    ]),
  ]);

  const ids = groupedApplications.map((item) => item.applicationId).filter(Boolean);
  const applications = ids.length === 0
    ? []
    : await buildPopulateQuery(
        Application.find({ _id: { $in: ids } }).select(APPLICATION_LIST_EXCLUDED_FIELDS)
      ).lean();

  const order = new Map(ids.map((id, index) => [String(id), index]));
  applications.sort((left, right) => (order.get(String(left._id)) ?? 0) - (order.get(String(right._id)) ?? 0));

  const total = Number(totalResult?.[0]?.total || 0);

  return {
    total,
    page,
    limit,
    totalPages: Math.max(Math.ceil(total / limit), 1),
    applications,
  };
};

export const findApplicationById = async (id) =>
  buildPopulateQuery(Application.findById(id)).lean();

export const findApplicationsForCandidate = async ({ candidateId, email, page = 1, limit = 20 } = {}) => {
  const candidateQuery = [];
  if (candidateId && mongoose.isValidObjectId(candidateId)) {
    candidateQuery.push({ candidateId });
  }
  if (email) {
    candidateQuery.push({ email: String(email).trim().toLowerCase() });
  }

  if (candidateQuery.length === 0) {
    return { total: 0, page, limit, totalPages: 1, applications: [] };
  }

  return findApplicationList({
    query: { $or: candidateQuery },
    page,
    limit,
  });
};

export const updateApplicationAdminResponse = async (id, { status, adminMessage, nextStepInfo, candidateResponseDetails, actorRole } = {}) => {
  const updatedAt = new Date();
  const cleanStatus = normalizeApplicationStatus(status);
  const cleanMessage = normalizeAdminMessage(adminMessage);
  const cleanDetails = normalizeCandidateResponseDetails(candidateResponseDetails);
  const cleanNextStepInfo =
    normalizeNextStepInfo(nextStepInfo) || buildNextStepInfoFromDetails(cleanDetails);

  const application = await buildPopulateQuery(
    Application.findByIdAndUpdate(
      id,
      {
        $set: {
          status: cleanStatus,
          adminMessage: cleanMessage,
          adminResponseStatus: cleanStatus === "accepted" ? "accepted" : cleanStatus === "rejected" ? "rejected" : "pending",
          adminResponseMessage: cleanMessage,
          candidateResponseDetails: cleanDetails,
          nextStepInfo: cleanStatus === "accepted" ? cleanNextStepInfo : "",
          respondedAt: updatedAt,
          statusUpdatedAt: updatedAt,
        },
        $push: {
          timeline: {
            status: cleanStatus,
            note: cleanMessage || `Application marked ${cleanStatus}.`,
            changedByRole: actorRole || "admin",
            createdAt: updatedAt,
          },
        },
      },
      { returnDocument: "after", runValidators: true }
    )
  ).lean();

  if (application?.candidateId?._id) {
    publishCandidateApplicationUpdate(String(application.candidateId._id), {
      applicationId: String(application._id),
      status: application.status,
      adminMessage: application.adminMessage || "",
      updatedAt: application.updatedAt,
    });
  }

  return application;
};
