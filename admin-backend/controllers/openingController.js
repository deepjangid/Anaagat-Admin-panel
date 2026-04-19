import Opening from "../models/Opening.js";

const normalizeStatus = (status) => {
  if (!status) return "active";
  const value = String(status).trim().toLowerCase();
  if (value === "active" || value === "open") return "active";
  if (value === "inactive" || value === "closed" || value === "close") return "closed";
  return value;
};

const normalizeStringArray = (value) => {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || "").trim()).filter(Boolean);
};

const getAdminTrackingId = (user = {}) => {
  const configuredAdminId = String(process.env.ADMIN_ID || "").trim();
  if (configuredAdminId) return configuredAdminId;

  if (user?.role === "admin" && user?.id) {
    return user.id;
  }

  return user?.id || null;
};

const formatOpeningForFrontend = (opening) => {
  const raw = opening?.toObject ? opening.toObject() : opening;

  const title = raw?.title ?? raw?.jobTitle ?? "";
  const company = raw?.company ?? raw?.department ?? "";
  const location = raw?.location ?? raw?.jobLocation ?? "";
  const type = raw?.type ?? raw?.employmentType ?? "";
  const category = raw?.category ?? raw?.department ?? "";
  const status = normalizeStatus(raw?.status);
  const isActive = status === "active";

  return {
    _id: raw?._id,
    title,
    company,
    location,
    type,
    category,
    genderRequirement: raw?.genderRequirement ?? "",
    qualification: raw?.qualification ?? "",
    experience: raw?.experience ?? "",
    fixedPrice: raw?.fixedPrice ?? null,
    ageRequirement: raw?.ageRequirement ?? "",
    salary: raw?.salary ?? null,
    description: raw?.description ?? "",
    requirements: Array.isArray(raw?.requirements) ? raw.requirements : [],
    responsibilities: Array.isArray(raw?.responsibilities) ? raw.responsibilities : [],
    skills: Array.isArray(raw?.skills) ? raw.skills : [],
    applicationDeadline: raw?.applicationDeadline ?? null,
    contactEmail: raw?.contactEmail ?? "",
    status: isActive ? "Active" : "Closed",
    canApply: isActive,
    primaryActionLabel: isActive ? "Apply now" : "Closed",
    secondaryActionLabel: "Read more",
    viewCount: raw?.viewCount || 0,
  };
};

const normalizeOpeningPayload = (payload = {}) => {
  const body = payload && typeof payload === "object" ? payload : {};

  const title = body.title ?? body.jobTitle;
  const company = body.company ?? body.department;
  const location = body.location ?? body.jobLocation;
  const type = body.type ?? body.employmentType;
  const category = body.category ?? body.department;
  const fixedPrice =
    body.fixedPrice === undefined || body.fixedPrice === null || body.fixedPrice === ""
      ? undefined
      : Number(body.fixedPrice);
  const salary = body.salary && typeof body.salary === "object"
    ? {
        ...(body.salary.min !== undefined && body.salary.min !== null && body.salary.min !== ""
          ? { min: Number(body.salary.min) }
          : {}),
        ...(body.salary.max !== undefined && body.salary.max !== null && body.salary.max !== ""
          ? { max: Number(body.salary.max) }
          : {}),
        ...(body.salary.currency !== undefined
          ? { currency: String(body.salary.currency || "").trim() }
          : {}),
      }
    : undefined;

  return {
    ...(title !== undefined ? { title } : {}),
    ...(company !== undefined ? { company } : {}),
    ...(location !== undefined ? { location } : {}),
    ...(type !== undefined ? { type } : {}),
    ...(category !== undefined ? { category } : {}),
    ...(body.genderRequirement !== undefined
      ? { genderRequirement: String(body.genderRequirement || "").trim() }
      : {}),
    ...(body.qualification !== undefined
      ? { qualification: String(body.qualification || "").trim() }
      : {}),
    ...(body.experience !== undefined
      ? { experience: String(body.experience || "").trim() }
      : {}),
    ...(fixedPrice !== undefined && Number.isFinite(fixedPrice) ? { fixedPrice } : {}),
    ...(body.ageRequirement !== undefined
      ? { ageRequirement: String(body.ageRequirement || "").trim() }
      : {}),
    ...(salary !== undefined ? { salary } : {}),
    ...(body.description !== undefined ? { description: String(body.description || "") } : {}),
    ...(body.requirements !== undefined ? { requirements: normalizeStringArray(body.requirements) } : {}),
    ...(body.responsibilities !== undefined
      ? { responsibilities: normalizeStringArray(body.responsibilities) }
      : {}),
    ...(body.skills !== undefined ? { skills: normalizeStringArray(body.skills) } : {}),
    ...(body.applicationDeadline !== undefined
      ? { applicationDeadline: body.applicationDeadline || null }
      : {}),
    ...(body.contactEmail !== undefined
      ? { contactEmail: String(body.contactEmail || "").trim() }
      : {}),
    ...(body.jobTitle !== undefined ? { jobTitle: body.jobTitle } : {}),
    ...(body.department !== undefined ? { department: body.department } : {}),
    ...(body.jobLocation !== undefined ? { jobLocation: body.jobLocation } : {}),
    ...(body.employmentType !== undefined ? { employmentType: body.employmentType } : {}),
    ...(body.status !== undefined ? { status: normalizeStatus(body.status) } : {}),
    ...(body.viewCount !== undefined ? { viewCount: body.viewCount } : {}),
  };
};

const buildInternalOpeningPayload = (payload = {}, user = {}, { isCreate = false } = {}) => {
  const normalized = normalizeOpeningPayload(payload);
  const adminTrackingId = getAdminTrackingId(user);

  delete normalized.clientId;

  if (adminTrackingId) {
    normalized.ownerId = adminTrackingId;
    normalized.postedBy = adminTrackingId;
    if (isCreate) {
      normalized.createdBy = adminTrackingId;
    }
  }

  return normalized;
};

export const getOpenings = async (req, res) => {
  try {
    const openingsData = await Opening.find();
    const formattedOpenings = openingsData.map(formatOpeningForFrontend);

    res.json({
      success: true,
      jobs: formattedOpenings,
      data: formattedOpenings,
      total: formattedOpenings.length,
      currentPage: 1,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching openings" });
  }
};

export const createOpening = async (req, res) => {
  try {
    console.log("[createOpening] user:", req.user?.id || null);
    console.log("[createOpening] body:", JSON.stringify(req.body, null, 2));

    const opening = await Opening.create(
      buildInternalOpeningPayload(req.body, req.user, { isCreate: true })
    );

    res.json({
      success: true,
      message: "Opening created",
      job: opening,
      formattedJob: formatOpeningForFrontend(opening),
    });
  } catch (error) {
    res.status(500).json({ message: "Error creating opening" });
  }
};

export const updateOpening = async (req, res) => {
  try {
    const opening = await Opening.findByIdAndUpdate(
      req.params.id,
      buildInternalOpeningPayload(req.body, req.user),
      { returnDocument: "after" }
    );

    res.json({
      success: true,
      job: opening,
      formattedJob: opening ? formatOpeningForFrontend(opening) : null,
    });
  } catch (error) {
    res.status(500).json({ message: "Error updating opening" });
  }
};

export const deleteOpening = async (req, res) => {
  try {
    await Opening.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Deleted",
    });
  } catch (error) {
    res.status(500).json({ message: "Error deleting opening" });
  }
};

export const deleteAllOpenings = async (req, res) => {
  try {
    const result = await Opening.deleteMany({});

    res.json({
      success: true,
      message: "All openings deleted",
      deletedCount: result.deletedCount || 0,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error deleting all openings" });
  }
};
