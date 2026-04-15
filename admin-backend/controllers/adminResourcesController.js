import mongoose from "mongoose";
import User from "../models/user.js";
import CandidateProfile from "../models/CandidateProfile.js";
import ClientProfile from "../models/ClientProfile.js";
import ContactMessage from "../models/ContactMessage.js";

const parsePagination = (req, defaultLimit = 20) => {
  const limit = Math.min(
    Math.max(parseInt(req.query.limit, 10) || defaultLimit, 1),
    100
  );
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const skip = (page - 1) * limit;
  return { limit, page, skip };
};

const buildSearchQuery = (search, fields) => {
  const value = String(search || "").trim();
  if (!value) return null;

  const isObjectId = /^[a-fA-F0-9]{24}$/.test(value);
  if (isObjectId) return { _id: new mongoose.Types.ObjectId(value) };

  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rx = new RegExp(escaped, "i");
  return { $or: fields.map((f) => ({ [f]: rx })) };
};

const isValidMongoId = (value) => mongoose.isValidObjectId(value);

const normalizeText = (value) => String(value || "").trim();

const getFirstValue = (record, keys) => {
  for (const key of keys) {
    const value = normalizeText(record?.[key]);
    if (value) return value;
  }
  return "";
};

const listResource = async (req, res, Model, searchFields) => {
  try {
    const { limit, page, skip } = parsePagination(req);
    const search = req.query.search ? String(req.query.search).trim() : "";

    const query = {};
    const searchQuery = buildSearchQuery(search, searchFields);
    if (searchQuery) Object.assign(query, searchQuery);

    const [total, items] = await Promise.all([
      Model.countDocuments(query),
      Model.find(query).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).lean(),
    ]);

    res.json({
      success: true,
      items,
      total,
      currentPage: page,
      limit,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to fetch records" });
  }
};

const deleteResource = async (req, res, Model) => {
  try {
    if (!isValidMongoId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid record id" });
    }
    const deleted = await Model.findByIdAndDelete(req.params.id).lean();
    if (!deleted) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to delete record",
    });
  }
};

const sanitizePayload = (payload = {}) => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return {};
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  );
};

const createResource = async (req, res, Model, successMessage = "Created") => {
  try {
    const item = await Model.create(sanitizePayload(req.body));
    res.status(201).json({ success: true, message: successMessage, item });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to create record" });
  }
};

const updateResource = async (req, res, Model, successMessage = "Updated") => {
  try {
    if (!isValidMongoId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid record id" });
    }
    const item = await Model.findByIdAndUpdate(
      req.params.id,
      sanitizePayload(req.body),
      { returnDocument: "after" }
    ).lean();
    if (!item) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, message: successMessage, item });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to update record",
    });
  }
};

export const getCandidateProfiles = (req, res) =>
  listResource(req, res, CandidateProfile, [
    "fullName",
    "name",
    "email",
    "phone",
    "mobile",
    "currentCity",
    "location",
  ]);

export const deleteCandidateProfile = (req, res) =>
  deleteResource(req, res, CandidateProfile);

export const createCandidateProfile = (req, res) =>
  createResource(req, res, CandidateProfile, "Candidate profile created");

export const updateCandidateProfile = (req, res) =>
  updateResource(req, res, CandidateProfile, "Candidate profile updated");

export const getClientProfiles = (req, res) =>
  listResource(req, res, ClientProfile, [
    "company",
    "companyName",
    "name",
    "email",
    "phone",
    "mobile",
    "website",
    "location",
    "city",
  ]);

export const createClientProfile = (req, res) =>
  createResource(req, res, ClientProfile, "Client profile created");

export const updateClientProfile = (req, res) =>
  updateResource(req, res, ClientProfile, "Client profile updated");

export const deleteClientProfile = (req, res) => deleteResource(req, res, ClientProfile);

export const getContactMessages = async (req, res) => {
  try {
    const { limit, page, skip } = parsePagination(req);
    const search = normalizeText(req.query.search).toLowerCase();

    const [users, candidateProfiles, clientProfiles, contactMessages] =
      await Promise.all([
        User.find({})
          .select("name email role isActive createdAt updatedAt")
          .lean(),
        CandidateProfile.find({}).lean(),
        ClientProfile.find({}).lean(),
        ContactMessage.find({}).lean(),
      ]);

    const contactMap = new Map();

    const upsertContact = (raw, source) => {
      const email = normalizeText(raw.email).toLowerCase();
      const phone = normalizeText(raw.phone || raw.mobile);
      const key = email || phone || String(raw._id);
      const existing = contactMap.get(key) || {
        _id: key,
        recordId: null,
        name: "",
        email: "",
        phone: "",
        city: "",
        role: "",
        companyName: "",
        subject: "",
        message: "",
        isActive: undefined,
        sources: [],
        canEdit: false,
        canDelete: false,
        createdAt: raw.createdAt || null,
        updatedAt: raw.updatedAt || null,
      };

      existing.name =
        existing.name ||
        getFirstValue(raw, ["name", "fullName", "companyName", "company"]);
      existing.email = existing.email || email;
      existing.phone = existing.phone || phone;
      existing.city =
        existing.city ||
        getFirstValue(raw, ["currentCity", "city", "location", "address"]);
      existing.role = existing.role || normalizeText(raw.role) || "contact";
      existing.companyName =
        existing.companyName ||
        getFirstValue(raw, ["companyName", "company", "organization"]);
      existing.subject =
        existing.subject ||
        getFirstValue(raw, ["subject", "companyName", "company"]);
      existing.message =
        existing.message ||
        getFirstValue(raw, ["message", "notes", "description"]);

      if (existing.isActive === undefined && raw.isActive !== undefined) {
        existing.isActive = raw.isActive;
      }
      if (source && !existing.sources.includes(source)) {
        existing.sources.push(source);
      }
      if (raw.createdAt && (!existing.createdAt || new Date(raw.createdAt) < new Date(existing.createdAt))) {
        existing.createdAt = raw.createdAt;
      }
      if (raw.updatedAt && (!existing.updatedAt || new Date(raw.updatedAt) > new Date(existing.updatedAt))) {
        existing.updatedAt = raw.updatedAt;
      }

      if (source === "Contact Form" && isValidMongoId(raw._id)) {
        existing.recordId = String(raw._id);
        existing._id = String(raw._id);
        existing.canEdit = true;
        existing.canDelete = true;
      }

      contactMap.set(key, existing);
    };

    users.forEach((item) => upsertContact(item, "User"));
    candidateProfiles.forEach((item) => upsertContact(item, "Candidate Profile"));
    clientProfiles.forEach((item) => upsertContact(item, "Client Profile"));
    contactMessages.forEach((item) => upsertContact(item, "Contact Form"));

    let items = Array.from(contactMap.values()).map((item) => ({
      ...item,
      sourceLabel: item.sources.join(", "),
    }));

    if (search) {
      items = items.filter((item) =>
        [
          item.name,
          item.email,
          item.phone,
          item.city,
          item.role,
          item.companyName,
          item.subject,
          item.message,
          item.sourceLabel,
        ].some((value) => normalizeText(value).toLowerCase().includes(search))
      );
    }

    items.sort((a, b) => {
      const left = new Date(b.updatedAt || b.createdAt || 0).getTime();
      const right = new Date(a.updatedAt || a.createdAt || 0).getTime();
      return left - right;
    });

    const total = items.length;
    items = items.slice(skip, skip + limit);

    res.json({
      success: true,
      items,
      total,
      currentPage: page,
      limit,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to fetch contacts" });
  }
};

export const deleteContactMessage = (req, res) =>
  deleteResource(req, res, ContactMessage);

export const createContactMessage = (req, res) =>
  createResource(req, res, ContactMessage, "Contact created");

export const updateContactMessage = (req, res) =>
  updateResource(req, res, ContactMessage, "Contact updated");

export const markContactMessageRead = async (req, res) => {
  try {
    if (!isValidMongoId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid record id" });
    }
    const updated = await ContactMessage.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { returnDocument: "after" }
    ).lean();
    if (!updated) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, item: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to update message",
    });
  }
};

