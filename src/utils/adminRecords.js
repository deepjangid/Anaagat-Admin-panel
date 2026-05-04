const EMPTY = 'N/A';

const toText = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value).trim();
  return '';
};

const getByPath = (record, path) => {
  if (!record || !path) return undefined;
  return String(path)
    .split('.')
    .reduce((current, key) => (current && current[key] !== undefined ? current[key] : undefined), record);
};

const pickFirst = (record, keys) => {
  for (const key of keys) {
    const value = getByPath(record, key);
    if (Array.isArray(value)) {
      const listValue = value.map((item) => toText(item)).find(Boolean);
      if (listValue) return listValue;
      continue;
    }
    const text = toText(value);
    if (text) return text;
  }
  return '';
};

const fallbackNameFromEmail = (email) => {
  const value = toText(email);
  if (!value.includes('@')) return '';
  const localPart = value.split('@')[0].replace(/[._-]+/g, ' ').trim();
  if (!localPart) return '';
  return localPart.replace(/\b\w/g, (char) => char.toUpperCase());
};

export const displayValue = (value, fallback = EMPTY) => {
  const text = toText(value);
  return text || fallback;
};

export const getUserName = (record) =>
  displayValue(
    pickFirst(record, ['name', 'fullName', 'username', 'userName', 'profile.name']) ||
      fallbackNameFromEmail(pickFirst(record, ['email']))
  );

export const getUserEmail = (record) => displayValue(pickFirst(record, ['email', 'contact.email']));

export const getUserPhone = (record) =>
  displayValue(
    pickFirst(record, [
      'phone',
      'mobile',
      'phoneNumber',
      'mobileNumber',
      'contact.phone',
      'contact.mobile',
    ])
  );

export const getUserCity = (record) =>
  displayValue(
    pickFirst(record, [
      'currentCity',
      'city',
      'location',
      'address.city',
      'currentLocation',
      'preferredLocation',
    ])
  );

export const getCompanyName = (record) =>
  displayValue(
    pickFirst(record, [
      'companyName',
      'company',
      'organization',
      'organisation',
      'businessName',
      'name',
    ])
  );

export const getSubject = (record) =>
  displayValue(pickFirst(record, ['subject', 'topic', 'messageSubject', 'title']));

export const getMessagePreview = (record) =>
  displayValue(
    pickFirst(record, ['message', 'msg', 'description', 'content', 'details', 'notes'])
  );

export const getApplicationJobTitle = (record) =>
  displayValue(
    pickFirst(record, [
      'jobTitle',
      'appliedFor',
      'appliedJobTitle',
      'position',
      'jobId.title',
      'jobId.jobTitle',
      'openingId.title',
      'openingId.jobTitle',
      'jobRole',
      'desiredRole',
      'profile',
      'title',
      'job.title',
      'job.jobTitle',
      'jobRequirement.title',
      'jobRequirement.jobTitle',
    ])
  );

export const getApplicationClientName = (record) =>
  displayValue(
    pickFirst(record, [
      'jobId.company',
      'openingId.company',
      'company',
      'companyName',
      'clientId.name',
      'clientId.email',
      'job.company',
      'opening.company',
    ])
  );

export const getApplicationJobSourceLabel = (record) => {
  const role = toText(getByPath(record, 'clientId.role')).toLowerCase();
  if (role === 'admin') return 'Admin Job';
  if (role) return 'Client Job';
  return 'Admin Job';
};

export const getApplicationName = (record) =>
  displayValue(
    pickFirst(record, ['fullName', 'name', 'candidateName']) ||
      fallbackNameFromEmail(pickFirst(record, ['email']))
  );

export const getApplicationExperienceSummary = (record) => {
  const experience = Array.isArray(record?.experience) ? record.experience : [];
  if (experience.length === 0) return 'Fresher';
  if (experience.length === 1) return '1 experience';
  return `${experience.length} experiences`;
};

export const hasApplicationResume = (record) =>
  Boolean(record?.resumeData || record?.resume?.url || record?.resumePath || record?.hasCustomResume);
