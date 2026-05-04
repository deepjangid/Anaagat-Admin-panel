import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";
import mongoose from "mongoose";
import { fileURLToPath } from "url";

import imagekit, { hasImageKitConfig } from "../config/imagekit.js";
import BlogPost from "../models/BlogPost.js";
import CandidateProfile from "../models/CandidateProfile.js";
import TeamMember from "../models/TeamMember.js";
import Application from "../models/Application.js";
import { normalizeFileAsset } from "../utils/mediaAssets.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, "..");
const uploadsRoot = path.join(backendRoot, "uploads");

dotenv.config({ path: path.join(backendRoot, ".env") });
dotenv.config({ path: path.join(backendRoot, "..", ".env"), override: false });

const shouldDeleteLocal = process.argv.includes("--delete-local");

const MIME_TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
};

const normalizeString = (value) => String(value || "").trim();

const getMimeType = (fileName = "") =>
  MIME_TYPES[path.extname(String(fileName || "")).toLowerCase()] || "application/octet-stream";

const isLegacyUploadUrl = (value) => normalizeString(value).includes("/uploads/");

const urlToLocalPath = (value) => {
  const raw = normalizeString(value);
  if (!raw) return "";

  try {
    const parsed = new URL(raw);
    if (!parsed.pathname.startsWith("/uploads/")) return "";
    return path.join(backendRoot, parsed.pathname.replace(/^\/+/, ""));
  } catch {
    const marker = raw.indexOf("/uploads/");
    if (marker === -1) return "";
    return path.join(backendRoot, raw.slice(marker + 1).replace(/\//g, path.sep));
  }
};

const buildAsset = ({ uploaded, fileName, mimeType, size }) => ({
  url: normalizeString(uploaded?.url),
  fileId: normalizeString(uploaded?.fileId),
  name: normalizeString(fileName),
  size: Number(size || 0) || 0,
  type: normalizeString(mimeType).toLowerCase(),
});

const uploadBuffer = async ({ buffer, fileName, mimeType, folder = "/migration" }) => {
  const uploaded = await imagekit.upload({
    file: buffer,
    fileName: `${Date.now()}-${normalizeString(path.basename(fileName || "upload")).replace(/[^a-zA-Z0-9._-]/g, "-")}`,
    folder,
    useUniqueFileName: true,
  });

  return buildAsset({
    uploaded,
    fileName,
    mimeType,
    size: buffer.length,
  });
};

const uploadLocalUrl = async (url, folder) => {
  const localPath = urlToLocalPath(url);
  if (!localPath) return null;

  const fileBuffer = await fs.readFile(localPath);
  const stat = await fs.stat(localPath);
  const asset = await uploadBuffer({
    buffer: fileBuffer,
    fileName: path.basename(localPath),
    mimeType: getMimeType(localPath),
    folder,
  });

  if (shouldDeleteLocal) {
    await fs.unlink(localPath).catch(() => {});
  }

  return {
    asset,
    localPath,
    size: stat.size,
  };
};

const uploadResumeData = async (value, fileName = "resume.pdf") => {
  let buffer = null;
  if (Buffer.isBuffer(value)) buffer = value;
  else if (value?.buffer && Buffer.isBuffer(value.buffer)) buffer = value.buffer;
  else if (typeof value === "string") buffer = Buffer.from(value, "base64");
  else if (Array.isArray(value?.data)) buffer = Buffer.from(value.data);

  if (!buffer?.length) return null;

  return uploadBuffer({
    buffer,
    fileName,
    mimeType: "application/pdf",
    folder: "/migration/resumes",
  });
};

const migrateBlogPosts = async () => {
  const records = await BlogPost.find({}).lean();
  const results = [];

  for (const record of records) {
    try {
      const update = {};
      let changed = false;

      const rawCover = record?.coverImage;
      const coverAsset = normalizeFileAsset(rawCover, { required: false });
      if ((!coverAsset?.fileId || isLegacyUploadUrl(coverAsset?.url || rawCover)) && rawCover) {
        const legacyUrl = coverAsset?.url || normalizeString(rawCover);
        if (isLegacyUploadUrl(legacyUrl)) {
          const uploaded = await uploadLocalUrl(legacyUrl, "/migration/blog-covers");
          if (uploaded?.asset) {
            update.coverImage = uploaded.asset;
            changed = true;
          }
        }
      }

      const contentImages = [];
      let nextContent = String(record?.content || "");
      for (const item of Array.isArray(record?.contentImages) ? record.contentImages : []) {
        const asset = normalizeFileAsset(item, { required: false });
        if (asset?.fileId) {
          contentImages.push(asset);
          continue;
        }

        const legacyUrl = normalizeString(item?.url);
        if (!isLegacyUploadUrl(legacyUrl)) continue;
        const uploaded = await uploadLocalUrl(legacyUrl, "/migration/blog-content");
        if (!uploaded?.asset) continue;

        contentImages.push(uploaded.asset);
        nextContent = nextContent.split(legacyUrl).join(uploaded.asset.url);
        changed = true;
      }

      const imgRegex = /<img\b[^>]*\bsrc=(["'])(.*?)\1[^>]*>/gi;
      for (const match of String(record?.content || "").matchAll(imgRegex)) {
        const src = normalizeString(match[2]);
        if (!isLegacyUploadUrl(src)) continue;

        const alreadyMigrated = contentImages.find((item) => item.url === src);
        if (alreadyMigrated) continue;

        const uploaded = await uploadLocalUrl(src, "/migration/blog-content");
        if (!uploaded?.asset) continue;

        contentImages.push(uploaded.asset);
        nextContent = nextContent.split(src).join(uploaded.asset.url);
        changed = true;
      }

      if (contentImages.length) {
        update.contentImages = contentImages;
        update.content = nextContent;
      }

      if (changed) {
        await BlogPost.updateOne({ _id: record._id }, { $set: update });
      }

      results.push({ id: String(record._id), success: true, changed });
      console.log(`[blogposts] ${record._id} ${changed ? "migrated" : "checked"}`);
    } catch (error) {
      results.push({ id: String(record._id), success: false, error: error.message });
      console.error(`[blogposts] ${record._id} failed:`, error.message);
    }
  }

  return results;
};

const migrateCandidateProfiles = async () => {
  const records = await CandidateProfile.find({}).lean();
  const results = [];

  for (const record of records) {
    try {
      const update = {};
      let changed = false;

      const resumeAsset = normalizeFileAsset(record?.resume, { required: false });
      if (!resumeAsset?.fileId && isLegacyUploadUrl(record?.resumePath)) {
        const uploaded = await uploadLocalUrl(record.resumePath, "/migration/resumes");
        if (uploaded?.asset) {
          update.resume = uploaded.asset;
          update.resumePath = uploaded.asset.url;
          update.hasCustomResume = true;
          changed = true;
        }
      } else if (!resumeAsset?.fileId && record?.resumeData) {
        const uploaded = await uploadResumeData(
          record.resumeData,
          `${normalizeString(record?.fullName || record?.name || record?._id) || "candidate"}-resume.pdf`
        );
        if (uploaded) {
          update.resume = uploaded;
          update.resumePath = uploaded.url;
          update.resumeData = null;
          update.hasCustomResume = true;
          changed = true;
        }
      }

      if (changed) {
        await CandidateProfile.updateOne({ _id: record._id }, { $set: update });
      }

      results.push({ id: String(record._id), success: true, changed });
      console.log(`[candidateprofiles] ${record._id} ${changed ? "migrated" : "checked"}`);
    } catch (error) {
      results.push({ id: String(record._id), success: false, error: error.message });
      console.error(`[candidateprofiles] ${record._id} failed:`, error.message);
    }
  }

  return results;
};

const migrateApplications = async () => {
  const records = await Application.find({}).lean();
  const results = [];

  for (const record of records) {
    try {
      const update = {};
      let changed = false;

      const resumeAsset = normalizeFileAsset(record?.resume, { required: false });
      if (!resumeAsset?.fileId && isLegacyUploadUrl(record?.resumePath)) {
        const uploaded = await uploadLocalUrl(record.resumePath, "/migration/application-resumes");
        if (uploaded?.asset) {
          update.resume = uploaded.asset;
          update.resumePath = uploaded.asset.url;
          update.hasCustomResume = true;
          changed = true;
        }
      } else if (!resumeAsset?.fileId && record?.resumeData) {
        const uploaded = await uploadResumeData(
          record.resumeData,
          `${normalizeString(record?.fullName || record?._id) || "application"}-resume.pdf`
        );
        if (uploaded) {
          update.resume = uploaded;
          update.resumePath = uploaded.url;
          update.resumeData = null;
          update.hasCustomResume = true;
          changed = true;
        }
      }

      if (changed) {
        await Application.updateOne({ _id: record._id }, { $set: update });
      }

      results.push({ id: String(record._id), success: true, changed });
      console.log(`[applications] ${record._id} ${changed ? "migrated" : "checked"}`);
    } catch (error) {
      results.push({ id: String(record._id), success: false, error: error.message });
      console.error(`[applications] ${record._id} failed:`, error.message);
    }
  }

  return results;
};

const migrateTeamMembers = async () => {
  const records = await TeamMember.find({}).lean();
  const results = [];

  for (const record of records) {
    try {
      const update = {};
      let changed = false;

      const currentAsset = normalizeFileAsset(record?.profileImageAsset, { required: false });
      const legacyUrl = normalizeString(record?.profileImage);
      if ((!currentAsset?.fileId && isLegacyUploadUrl(legacyUrl)) || isLegacyUploadUrl(currentAsset?.url)) {
        const uploaded = await uploadLocalUrl(currentAsset?.url || legacyUrl, "/migration/team");
        if (uploaded?.asset) {
          update.profileImageAsset = uploaded.asset;
          update.profileImage = uploaded.asset.url;
          changed = true;
        }
      }

      if (changed) {
        await TeamMember.updateOne({ _id: record._id }, { $set: update });
      }

      results.push({ id: String(record._id), success: true, changed });
      console.log(`[teammembers] ${record._id} ${changed ? "migrated" : "checked"}`);
    } catch (error) {
      results.push({ id: String(record._id), success: false, error: error.message });
      console.error(`[teammembers] ${record._id} failed:`, error.message);
    }
  }

  return results;
};

export const main = async () => {
  const mongoUri = normalizeString(process.env.MONGODB_URI);
  if (!mongoUri) throw new Error("Missing MONGODB_URI");
  if (!hasImageKitConfig || !imagekit) throw new Error("ImageKit is not configured");

  await mongoose.connect(mongoUri);
  console.log("[migration] MongoDB connected");

  const summary = {
    blogposts: await migrateBlogPosts(),
    candidateprofiles: await migrateCandidateProfiles(),
    applications: await migrateApplications(),
    teammembers: await migrateTeamMembers(),
  };

  const report = Object.fromEntries(
    Object.entries(summary).map(([key, items]) => [
      key,
      {
        total: items.length,
        migrated: items.filter((item) => item.changed).length,
        failed: items.filter((item) => !item.success).length,
      },
    ])
  );

  console.log("[migration] summary:", JSON.stringify(report, null, 2));
  await mongoose.disconnect();
};

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === __filename;

if (isDirectRun) {
  main().catch(async (error) => {
    console.error("[migration] failed:", error);
    try {
      await mongoose.disconnect();
    } catch {}
    process.exitCode = 1;
  });
}
