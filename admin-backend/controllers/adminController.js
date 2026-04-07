// controllers/adminController.js
import User from "../models/user.js";
import Job from "../models/Job.js";
import mongoose from "mongoose";

export const getUsers = async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const skip = (page - 1) * limit;

    const role = req.query.role ? String(req.query.role).trim() : "";
    const search = req.query.search ? String(req.query.search).trim() : "";

    const query = {};
    if (role) query.role = role;

    if (search) {
      const isObjectIdSearch = /^[a-fA-F0-9]{24}$/.test(search);
      if (isObjectIdSearch) {
        query._id = new mongoose.Types.ObjectId(search);
      } else {
        const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const rx = new RegExp(escaped, "i");
        query.$or = [{ email: rx }, { name: rx }, { mobile: rx }];
      }
    }

    const [total, users] = await Promise.all([
      User.countDocuments(query),
      User.find(query)
        .select("-password -passwordHash")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    res.json({
      success: true,
      users,
      total,
      currentPage: page,
      limit,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch users" });
  }
};

export const deleteUser = async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ msg: "User deleted" });
};

export const getDashboard = async (req, res) => {
  try {
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 20, 1),
      100
    );
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const skip = (page - 1) * limit;

    const [
      totalUsers,
      adminCount,
      activeUsers,
      users,
      totalJobs,
      activeJobs,
      closedJobs,
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ role: "admin" }),
      User.countDocuments({ isActive: { $ne: false } }),
      User.find()
        .select("-password -passwordHash")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Job.countDocuments({}),
      Job.countDocuments({ status: { $in: ["active", "open", "Active", "ACTIVE"] } }),
      Job.countDocuments({ status: { $in: ["closed", "inactive", "close", "Closed", "CLOSED"] } }),
    ]);

    res.json({
      totalUsers,
      adminCount,
      activeUsers,
      usersCount: totalUsers,
      users,
      usersPage: page,
      usersLimit: limit,
      usersTotalPages: Math.max(Math.ceil(totalUsers / limit), 1),
      totalJobs,
      activeJobs,
      closedJobs,
    });
  } catch (error) {
    res.status(500).json({ message: "Dashboard error", error: String(error) });
  }
};
