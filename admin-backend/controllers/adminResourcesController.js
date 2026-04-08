import mongoose from "mongoose";
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
    const deleted = await Model.findByIdAndDelete(req.params.id).lean();
    if (!deleted) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to delete record" });
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

export const deleteClientProfile = (req, res) => deleteResource(req, res, ClientProfile);

export const getContactMessages = (req, res) =>
  listResource(req, res, ContactMessage, [
    "name",
    "fullName",
    "email",
    "phone",
    "mobile",
    "subject",
    "message",
  ]);

export const deleteContactMessage = (req, res) =>
  deleteResource(req, res, ContactMessage);

export const markContactMessageRead = async (req, res) => {
  try {
    const updated = await ContactMessage.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    ).lean();
    if (!updated) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, item: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to update message" });
  }
};

