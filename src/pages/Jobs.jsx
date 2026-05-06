import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  DatePicker,
  message,
  Popconfirm,
  Typography,
  Dropdown,
} from 'antd';
import { MdAdd, MdArrowDropDown, MdDelete, MdDownload, MdEdit, MdUpload, MdVisibility } from 'react-icons/md';
import { jobsAPI } from '../services/api';
import moment from 'moment';

const { TextArea } = Input;
const { Search } = Input;
const { Option } = Select;
const { Text } = Typography;

const normalizeCode = (value, maxLen) => {
  const cleaned = String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '');
  if (!cleaned) return 'NA';
  return cleaned.slice(0, maxLen);
};

const getGenderCode = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return 'ANY';
  if (normalized.startsWith('m')) return 'M';
  if (normalized.startsWith('f')) return 'F';
  if (normalized.startsWith('b')) return 'B';
  return normalizeCode(normalized, 3);
};

const getQualificationCode = (value) => {
  const normalized = String(value || '').trim().toUpperCase();
  if (!normalized) return 'NA';
  if (/\b10\b|\b10TH\b/.test(normalized)) return 'X';
  if (/\b12\b|\b12TH\b/.test(normalized)) return 'Y';
  if (
    normalized.includes('POST') ||
    normalized.includes('PG') ||
    normalized.includes('MBA') ||
    normalized.includes('MTECH') ||
    normalized.includes('MSC') ||
    normalized.includes('MCOM') ||
    normalized.includes('MA')
  ) return 'PG';
  if (
    normalized.includes('GRAD') ||
    normalized.includes('BTECH') ||
    normalized.includes('BE') ||
    normalized.includes('BSC') ||
    normalized.includes('BCA') ||
    normalized.includes('BBA') ||
    normalized.includes('BCOM') ||
    normalized.includes('BA')
  ) return 'UG';
  return normalizeCode(normalized, 3);
};

const getExperienceCode = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return 'NA';
  if (normalized.includes('fresher') || normalized === '0' || normalized.startsWith('0-')) {
    return 'FR';
  }
  return 'EX';
};

const getTypeCode = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return 'NA';
  if (normalized.includes('full')) return 'FT';
  if (normalized.includes('part')) return 'PT';
  if (normalized.includes('contract')) return 'CT';
  if (normalized.includes('freelance')) return 'FL';
  if (normalized.includes('intern')) return 'IN';
  return normalizeCode(normalized, 2);
};

const getEnhancedJobPublicId = (job) => {
  const company = normalizeCode(job?.company, 3);
  const gender = getGenderCode(job?.genderRequirement);
  const qualification = getQualificationCode(job?.qualification);
  const experience = getExperienceCode(job?.experience);
  const location = normalizeCode(job?.location, 3);
  const type = getTypeCode(job?.type);
  const age = normalizeCode(job?.ageRequirement, 3);
  return [company, gender, qualification, experience, location, type, age].join('/');
};

const getJobMetaLine = (job) =>
  [
    job?.company || 'NA',
    job?.genderRequirement || 'Any',
    job?.qualification || 'NA',
    job?.experience || 'NA',
    job?.location || 'NA',
    job?.type || 'NA',
    job?.ageRequirement || 'NA',
  ].join(' | ');

const IMPORT_EXPORT_FIELDS = [
  { key: 'title', label: 'title' },
  { key: 'company', label: 'company' },
  { key: 'location', label: 'location' },
  { key: 'type', label: 'type' },
  { key: 'category', label: 'category' },
  { key: 'experience', label: 'experience' },
  { key: 'genderRequirement', label: 'genderRequirement' },
  { key: 'qualification', label: 'qualification' },
  { key: 'ageRequirement', label: 'ageRequirement' },
  { key: 'fixedPrice', label: 'fixedPrice' },
  { key: 'salary.min', label: 'salaryMin' },
  { key: 'salary.max', label: 'salaryMax' },
  { key: 'salary.currency', label: 'salaryCurrency' },
  { key: 'description', label: 'description' },
  { key: 'requirements', label: 'requirements', isArray: true },
  { key: 'responsibilities', label: 'responsibilities', isArray: true },
  { key: 'skills', label: 'skills', isArray: true },
  { key: 'applicationDeadline', label: 'applicationDeadline' },
  { key: 'contactEmail', label: 'contactEmail' },
  { key: 'status', label: 'status' },
];

const IMPORT_ALIASES = {
  title: 'title',
  jobtitle: 'title',
  company: 'company',
  companyname: 'company',
  department: 'company',
  clientid: 'clientId',
  location: 'location',
  address: 'location',
  joblocation: 'location',
  type: 'type',
  employmenttype: 'type',
  category: 'category',
  urgencylevel: 'category',
  salary: 'fixedPrice',
  experiencerequired: 'experience',
  experience: 'experience',
  genderrequirement: 'genderRequirement',
  qualification: 'qualification',
  agerequirement: 'ageRequirement',
  age: 'ageRequirement',
  fixedprice: 'fixedPrice',
  minctclpa: 'salary.min',
  maxctclpa: 'salary.max',
  salarymin: 'salary.min',
  salarymax: 'salary.max',
  salarycurrency: 'salary.currency',
  description: 'description',
  jobdescription: 'description',
  requirements: 'requirements',
  responsibilities: 'responsibilities',
  skills: 'skills',
  workmodes: 'skills',
  applicationdeadline: 'applicationDeadline',
  contactemail: 'contactEmail',
  status: 'status',
};

const parseNumericAmount = (value) => {
  const matches = String(value || '').match(/\d+(?:\.\d+)?/g);
  if (!matches?.length) return null;
  const numberValue = Number(matches[0]);
  return Number.isFinite(numberValue) ? numberValue : null;
};

const splitArrayField = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean);
  }

  return String(value || '')
    .split(/\r?\n|[|;,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const getNestedValue = (record, path) =>
  path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), record);

const setNestedValue = (target, path, value) => {
  const keys = path.split('.');
  const lastKey = keys.pop();
  let cursor = target;

  keys.forEach((key) => {
    if (!cursor[key] || typeof cursor[key] !== 'object') {
      cursor[key] = {};
    }
    cursor = cursor[key];
  });

  cursor[lastKey] = value;
};

const escapeCsvValue = (value) => {
  const text = String(value ?? '');
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
};

const detectCsvDelimiter = (line) => {
  const candidates = [',', ';', '\t'];
  let bestDelimiter = ',';
  let bestCount = -1;

  candidates.forEach((delimiter) => {
    const count = String(line || '').split(delimiter).length;
    if (count > bestCount) {
      bestDelimiter = delimiter;
      bestCount = count;
    }
  });

  return bestDelimiter;
};

const parseCsvRow = (line, delimiter = ',') => {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
};

const parseCsvText = (text) => {
  const normalized = String(text || '')
    .split('\0')
    .join('')
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n');
  const rows = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < normalized.length; i += 1) {
    const char = normalized[i];
    const next = normalized[i + 1];

    current += char;

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += next;
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    }

    if (char === '\n' && !inQuotes) {
      rows.push(current.slice(0, -1));
      current = '';
    }
  }

  if (current) rows.push(current);

  const nonEmptyRows = rows
    .map((row) => row.replace(/\r/g, ''))
    .filter((row) => row.trim() !== '');

  if (!nonEmptyRows.length) return [];

  let headerIndex = 0;
  let delimiter = ',';
  const separatorMatch = nonEmptyRows[0].match(/^sep=(.+)$/i);

  if (separatorMatch) {
    delimiter = separatorMatch[1];
    headerIndex = 1;
  } else {
    delimiter = detectCsvDelimiter(nonEmptyRows[0]);
  }

  const headerRow = nonEmptyRows[headerIndex];
  if (!headerRow) return [];

  const headers = parseCsvRow(headerRow, delimiter).map((header) => String(header || '').trim());

  return nonEmptyRows.slice(headerIndex + 1).map((row) => {
    const values = parseCsvRow(row, delimiter);
    return headers.reduce((acc, header, index) => {
      acc[header] = values[index] ?? '';
      return acc;
    }, {});
  });
};

const prepareRecordForExport = (job) =>
  IMPORT_EXPORT_FIELDS.reduce((acc, field) => {
    const value = getNestedValue(job, field.key);

    if (field.isArray) {
      acc[field.label] = Array.isArray(value) ? value.join('\n') : '';
      return acc;
    }

    if (field.key === 'applicationDeadline') {
      acc[field.label] = value ? moment(value).format('YYYY-MM-DD') : '';
      return acc;
    }

    acc[field.label] = value ?? '';
    return acc;
  }, {});

const normalizeImportedRecord = (rawRecord) => {
  const record = {};
  const originalValues = {};

  Object.entries(rawRecord || {}).forEach(([rawKey, rawValue]) => {
    const normalizedKey = String(rawKey || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const targetKey = IMPORT_ALIASES[normalizedKey];
    originalValues[normalizedKey] = typeof rawValue === 'string' ? rawValue.trim() : rawValue;
    if (!targetKey) return;

    const value = typeof rawValue === 'string' ? rawValue.trim() : rawValue;
    const field = IMPORT_EXPORT_FIELDS.find((item) => item.key === targetKey);

    if (field?.isArray) {
      setNestedValue(record, targetKey, splitArrayField(value));
      return;
    }

    if (['fixedPrice', 'salary.min', 'salary.max'].includes(targetKey)) {
      if (value === '' || value === null || value === undefined) return;
      const numberValue =
        targetKey === 'fixedPrice' ? parseNumericAmount(value) : Number(value);
      if (Number.isFinite(numberValue)) {
        setNestedValue(record, targetKey, numberValue);
      }
      return;
    }

    if (targetKey === 'applicationDeadline') {
      if (!value) return;
      const parsed = moment(value, [moment.ISO_8601, 'YYYY-MM-DD', 'DD-MM-YYYY', 'MM/DD/YYYY'], true);
      setNestedValue(record, targetKey, parsed.isValid() ? parsed.toISOString() : String(value));
      return;
    }

    if (value !== '' && value !== undefined) {
      setNestedValue(record, targetKey, value);
    }
  });

  if (!String(record.type || '').trim()) {
    record.type = 'Full-time';
  }

  if (!String(record.category || '').trim()) {
    record.category = 'General';
  }

  if (!String(record.status || '').trim()) {
    record.status = 'Active';
  }

  if (!String(record.description || '').trim()) {
    const descriptionParts = [
      record.title ? `Role: ${record.title}` : '',
      record.company ? `Company: ${record.company}` : '',
      record.location ? `Location: ${record.location}` : '',
      originalValues.salary ? `Salary: ${originalValues.salary}` : '',
      originalValues.minctclpa ? `Min CTC LPA: ${originalValues.minctclpa}` : '',
      originalValues.maxctclpa ? `Max CTC LPA: ${originalValues.maxctclpa}` : '',
      record.qualification ? `Qualification: ${record.qualification}` : '',
      record.experience ? `Experience: ${record.experience}` : '',
      originalValues.workmodes ? `Work Modes: ${originalValues.workmodes}` : '',
      originalValues.urgencylevel ? `Urgency: ${originalValues.urgencylevel}` : '',
      originalValues.timing ? `Timing: ${originalValues.timing}` : '',
      originalValues.openings ? `Openings: ${originalValues.openings}` : '',
      originalValues.accommodation ? `Accommodation: ${originalValues.accommodation}` : '',
    ].filter(Boolean);

    record.description = descriptionParts.join(' | ');
  }

  const maleCount = parseNumericAmount(originalValues.male);
  const femaleCount = parseNumericAmount(originalValues.female);

  if (!String(record.genderRequirement || '').trim()) {
    if (maleCount && femaleCount) {
      record.genderRequirement = 'Both';
    } else if (maleCount) {
      record.genderRequirement = 'Male';
    } else if (femaleCount) {
      record.genderRequirement = 'Female';
    }
  }

  const hasRequiredFields = ['title', 'location']
    .every((key) => String(record[key] || '').trim());

  return hasRequiredFields ? record : null;
};

const buildCsvFromJobs = (jobList) => {
  const exportedRows = jobList.map(prepareRecordForExport);
  const headers = IMPORT_EXPORT_FIELDS.map((field) => field.label);
  const lines = [headers.join(',')];

  exportedRows.forEach((row) => {
    lines.push(headers.map((header) => escapeCsvValue(row[header])).join(','));
  });

  return `\uFEFF${lines.join('\r\n')}`;
};

const downloadTextFile = (content, filename, mimeType) => {
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

const isMongoObjectId = (value) => /^[a-fA-F0-9]{24}$/.test(String(value || '').trim());

const getStoredAuthUser = () => {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const buildOwnershipPayload = ({ includeClientId = true } = {}) => {
  const user = getStoredAuthUser();
  const ownerId = [user?._id, user?.id, user?.userId].find((value) => isMongoObjectId(value));

  if (!ownerId) return {};

  return {
    ...(includeClientId ? { clientId: ownerId } : {}),
    ownerId,
    createdBy: ownerId,
    postedBy: ownerId,
  };
};

const buildImportedOwnershipPayload = (record, ownershipPayload, { includeClientId = true } = {}) => {
  const basePayload = {
    ...ownershipPayload,
    ...record,
  };

  if (!includeClientId) {
    delete basePayload.clientId;
    return basePayload;
  }

  const fileClientId = isMongoObjectId(record?.clientId) ? String(record.clientId).trim() : '';
  const fallbackClientId = isMongoObjectId(ownershipPayload?.clientId)
    ? String(ownershipPayload.clientId).trim()
    : '';
  const resolvedClientId = fileClientId || fallbackClientId;

  return {
    ...basePayload,
    ...(resolvedClientId ? { clientId: resolvedClientId } : {}),
  };
};

const Jobs = ({
  pageTitle = 'Client Requirements',
  addButtonLabel = 'Add New Job',
  api = jobsAPI,
  entityLabel = 'Job',
  allowDeleteAll = true,
  includeClientId = true,
}) => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    company: '',
    location: '',
    type: '',
    category: '',
  });
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [form] = Form.useForm();
  const fileInputRef = useRef(null);
  const ownershipPayload = useMemo(() => buildOwnershipPayload({ includeClientId }), [includeClientId]);

  // Fetch jobs
  const fetchJobs = useCallback(async (page = 1, pageSize = 10) => {
    setLoading(true);
    try {
      const response = await api.getAll({
        page,
        limit: pageSize,
      });

      if (response.data.success) {
        setJobs(response.data.jobs);
        setPagination({
          current: response.data.currentPage,
          pageSize: pageSize,
          total: response.data.total ?? (Array.isArray(response.data.jobs) ? response.data.jobs.length : 0),
        });
      }
    } catch (error) {
      console.error('Fetch Jobs Error:', error);
      message.error(error?.response?.data?.message || `Failed to fetch ${entityLabel.toLowerCase()}s`);
    } finally {
      setLoading(false);
    }
  }, [api, entityLabel]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const filteredJobs = useMemo(() => {
    const search = String(filters.search || '').trim();
    const searchLower = search.toLowerCase();
    const isObjectIdSearch = /^[a-fA-F0-9]{24}$/.test(search);

    const companyFilter = String(filters.company || '').trim().toLowerCase();
    const locationFilter = String(filters.location || '').trim().toLowerCase();
    const typeFilter = String(filters.type || '').trim().toLowerCase();
    const categoryFilter = String(filters.category || '').trim().toLowerCase();

    return (jobs || []).filter((job) => {
      if (!job) return false;

      if (companyFilter) {
        const v = String(job.company || '').toLowerCase();
        if (!v.includes(companyFilter)) return false;
      }
      if (locationFilter) {
        const v = String(job.location || '').toLowerCase();
        if (!v.includes(locationFilter)) return false;
      }
      if (typeFilter) {
        const v = String(job.type || '').toLowerCase();
        if (!v.includes(typeFilter)) return false;
      }
      if (categoryFilter) {
        const v = String(job.category || '').toLowerCase();
        if (!v.includes(categoryFilter)) return false;
      }

      if (!search) return true;

      if (isObjectIdSearch) return String(job._id || '') === search;

      const haystack = [
        getEnhancedJobPublicId(job),
        job.genderRequirement,
        job.qualification,
        job.experience,
        job.ageRequirement,
        job.title,
        job.company,
        job.location,
        job.type,
        job.category,
        job.status,
      ]
        .filter(Boolean)
        .map((v) => String(v).toLowerCase())
        .join(' | ');

      return haystack.includes(searchLower);
    });
  }, [filters, jobs]);

  const filterOptions = useMemo(() => {
    const uniq = (arr) => Array.from(new Set(arr.filter(Boolean).map((v) => String(v).trim()).filter(Boolean))).sort();
    return {
      companies: uniq((jobs || []).map((j) => j?.company)),
      locations: uniq((jobs || []).map((j) => j?.location)),
      types: uniq((jobs || []).map((j) => j?.type)),
      categories: uniq((jobs || []).map((j) => j?.category)),
    };
  }, [jobs]);

  // Handle table change (pagination, sorting, filtering)
  const handleTableChange = (newPagination) => {
    setPagination((prev) => ({
      ...prev,
      current: newPagination.current,
      pageSize: newPagination.pageSize,
    }));
  };

  // Open modal for create/edit
  const openModal = (job = null) => {
    setEditingJob(job);
    setIsModalOpen(true);
    
    if (job) {
      form.setFieldsValue({
        ...job,
        applicationDeadline: job.applicationDeadline ? moment(job.applicationDeadline) : null,
      });
    } else {
      form.resetFields();
    }
  };

  // Close modal
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingJob(null);
    form.resetFields();
  };

  // Handle form submit
  const handleSubmit = async (values) => {
    try {
      const jobData = {
        ...values,
        applicationDeadline: values.applicationDeadline
          ? values.applicationDeadline.toISOString()
          : null,
      };

      if (editingJob) {
        // Update existing job
        const response = await api.update(editingJob._id, jobData);
        if (response.data.success) {
          message.success(`${entityLabel} updated successfully!`);
          fetchJobs(pagination.current, pagination.pageSize);
          closeModal();
        }
      } else {
        // Create new job
        const response = await api.create({
          ...jobData,
          ...ownershipPayload,
        });
        if (response.data.success) {
          message.success(`${entityLabel} created successfully!`);
          fetchJobs(1, pagination.pageSize);
          closeModal();
        }
      }
    } catch (error) {
      console.error('Submit Error:', error);
      message.error(error.response?.data?.message || 'Operation failed');
    }
  };

  // Handle delete
  const handleDelete = async (id) => {
    try {
      const response = await api.delete(id);
      if (response.data.success) {
        message.success(`${entityLabel} deleted successfully!`);
        fetchJobs(pagination.current, pagination.pageSize);
      }
    } catch (error) {
      console.error('Delete Error:', error);
      message.error(`Failed to delete ${entityLabel.toLowerCase()}`);
    }
  };

  const handleDeleteAll = async () => {
    if (typeof api.deleteAll !== 'function') return;

    try {
      const response = await api.deleteAll();
      if (response.data.success) {
        message.success(
          response.data.deletedCount
            ? `${response.data.deletedCount} ${entityLabel.toLowerCase()}s deleted successfully!`
            : `All ${entityLabel.toLowerCase()}s deleted successfully!`
        );
        setPagination((prev) => ({ ...prev, current: 1, total: 0 }));
        fetchJobs(1, pagination.pageSize);
      }
    } catch (error) {
      console.error('Delete All Error:', error);
      message.error(error.response?.data?.message || `Failed to delete all ${entityLabel.toLowerCase()}s`);
    }
  };

  const handleExport = (format) => {
    const exportRows = filteredJobs;
    if (!exportRows.length) {
      message.warning(`No ${entityLabel.toLowerCase()}s available to export`);
      return;
    }

    const safeEntityName = entityLabel.toLowerCase();
    const timestamp = moment().format('YYYYMMDD-HHmmss');

    if (format === 'json') {
      downloadTextFile(
        JSON.stringify(exportRows.map(prepareRecordForExport), null, 2),
        `${safeEntityName}s-${timestamp}.json`,
        'application/json;charset=utf-8'
      );
      return;
    }

    downloadTextFile(
      buildCsvFromJobs(exportRows),
      `${safeEntityName}s-${timestamp}.csv`,
      'text/csv;charset=utf-8'
    );
  };

  const handleFileImport = async (event) => {
    const file = event?.target?.files?.[0];
    event.target.value = '';
    if (!file) return;

    setImporting(true);

    try {
      const text = await file.text();
      const isJson = file.name.toLowerCase().endsWith('.json');
      const rows = isJson ? JSON.parse(text) : parseCsvText(text);
      const sourceRows = Array.isArray(rows) ? rows : [rows];
      const normalizedRows = sourceRows.map(normalizeImportedRecord).filter(Boolean);

      if (!normalizedRows.length) {
        message.error(`No valid ${entityLabel.toLowerCase()} records found in file`);
        return;
      }

      const results = await Promise.allSettled(
        normalizedRows.map((record) =>
          api.create(buildImportedOwnershipPayload(record, ownershipPayload, { includeClientId }))
        )
      );

      const successCount = results.filter((result) => result.status === 'fulfilled').length;
      const failureCount = results.length - successCount;

      if (successCount) {
        message.success(
          `${successCount} ${entityLabel.toLowerCase()}${successCount > 1 ? 's' : ''} imported successfully`
        );
        fetchJobs(1, pagination.pageSize);
      }

      if (failureCount) {
        message.warning(
          `${failureCount} record${failureCount > 1 ? 's were' : ' was'} skipped or failed during import`
        );
      }
    } catch (error) {
      console.error('Import Error:', error);
      message.error(`Failed to import ${entityLabel.toLowerCase()} data`);
    } finally {
      setImporting(false);
    }
  };

  const columns = [
    {
      title: 'S.No.',
      key: 'serialNumber',
      width: 80,
      render: (_, __, index) => (
        ((pagination.current - 1) * pagination.pageSize) + index + 1
      ),
    },
    {
      title: 'Job ID',
      key: 'publicId',
      width: 250,
      render: (_, record) => {
        const publicId = getEnhancedJobPublicId(record);
        return (
          <Space direction="vertical" size={0}>
            <Text code copyable={{ text: publicId }}>
              {publicId}
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {getJobMetaLine(record)}
            </Text>
          </Space>
        );
      },
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      width: 200,
    },
    {
      title: 'Company',
      dataIndex: 'company',
      key: 'company',
      width: 150,
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
      width: 150,
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type) => <Tag color="blue">{type}</Tag>,
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      width: 120,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => (
        <Tag color={status === 'Active' ? 'green' : status === 'Closed' ? 'red' : 'default'}>
          {status}
        </Tag>
      ),
    },
    {
      title: 'Views',
      dataIndex: 'viewCount',
      key: 'viewCount',
      width: 80,
      render: (count) => (
        <Space>
          <MdVisibility />
          {count}
        </Space>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            icon={<MdEdit />}
            size="small"
            onClick={() => openModal(record)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Delete this job?"
            description="Are you sure you want to delete this job?"
            onConfirm={() => handleDelete(record._id)}
            okText="Yes"
            cancelText="No"
          >
            <Button danger icon={<MdDelete />} size="small">
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div
        className="page-header"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        data-tour="jobs-actions"
      >
        <h1>{pageTitle}</h1>
        <Space wrap>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.json,application/json,text/csv"
            style={{ display: 'none' }}
            onChange={handleFileImport}
          />
          <Dropdown
            menu={{
              items: [
                {
                  key: 'import',
                  label: 'Import CSV / JSON',
                  icon: <MdUpload />,
                },
                {
                  key: 'export-csv',
                  label: 'Export CSV',
                  icon: <MdDownload />,
                },
                {
                  key: 'export-json',
                  label: 'Export JSON',
                  icon: <MdDownload />,
                },
              ],
              onClick: ({ key }) => {
                if (key === 'import') {
                  fileInputRef.current?.click();
                  return;
                }

                if (key === 'export-csv') {
                  handleExport('csv');
                  return;
                }

                if (key === 'export-json') {
                  handleExport('json');
                }
              },
            }}
            trigger={['click']}
          >
            <Button icon={<MdArrowDropDown />} loading={importing}>
              Import / Export
            </Button>
          </Dropdown>
          {allowDeleteAll && (
            <Popconfirm
              title={`Delete all ${entityLabel.toLowerCase()}s?`}
              description={`This will permanently remove every ${entityLabel.toLowerCase()} from this section.`}
              onConfirm={handleDeleteAll}
              okText="Delete All"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
            >
              <Button danger icon={<MdDelete />}>
                Delete All
              </Button>
            </Popconfirm>
          )}
          <Button type="primary" icon={<MdAdd />} onClick={() => openModal()}>
            {addButtonLabel}
          </Button>
        </Space>
      </div>

      <Card style={{ marginBottom: 16 }} data-tour="jobs-filters">
        <Space wrap>
          <Search
            placeholder="Search by short code, title, company, location, qualification, or type"
            onSearch={(value) => {
              setFilters((prev) => ({ ...prev, search: value ? String(value).trim() : '' }));
              setPagination((prev) => ({ ...prev, current: 1 }));
            }}
            onChange={(e) => {
              const value = e?.target?.value ?? '';
              if (value !== '') return;
              setFilters((prev) => ({ ...prev, search: '' }));
              setPagination((prev) => ({ ...prev, current: 1 }));
            }}
            allowClear
            style={{ width: 420 }}
          />
          <Select
            value={filters.company || undefined}
            placeholder="Company"
            allowClear
            showSearch
            optionFilterProp="label"
            style={{ width: 200 }}
            options={filterOptions.companies.map((v) => ({ value: v, label: v }))}
            onChange={(value) => {
              setFilters((prev) => ({ ...prev, company: value || '' }));
              setPagination((prev) => ({ ...prev, current: 1 }));
            }}
          />
          <Select
            value={filters.location || undefined}
            placeholder="Location"
            allowClear
            showSearch
            optionFilterProp="label"
            style={{ width: 200 }}
            options={filterOptions.locations.map((v) => ({ value: v, label: v }))}
            onChange={(value) => {
              setFilters((prev) => ({ ...prev, location: value || '' }));
              setPagination((prev) => ({ ...prev, current: 1 }));
            }}
          />
          <Select
            value={filters.type || undefined}
            placeholder="Type"
            allowClear
            showSearch
            optionFilterProp="label"
            style={{ width: 160 }}
            options={filterOptions.types.map((v) => ({ value: v, label: v }))}
            onChange={(value) => {
              setFilters((prev) => ({ ...prev, type: value || '' }));
              setPagination((prev) => ({ ...prev, current: 1 }));
            }}
          />
          <Select
            value={filters.category || undefined}
            placeholder="Category"
            allowClear
            showSearch
            optionFilterProp="label"
            style={{ width: 200 }}
            options={filterOptions.categories.map((v) => ({ value: v, label: v }))}
            onChange={(value) => {
              setFilters((prev) => ({ ...prev, category: value || '' }));
              setPagination((prev) => ({ ...prev, current: 1 }));
            }}
          />
          <Button
            onClick={() => {
              setFilters({ search: '', company: '', location: '', type: '', category: '' });
              setPagination((prev) => ({ ...prev, current: 1 }));
            }}
          >
            Clear Filters
          </Button>
        </Space>
      </Card>

      <Card data-tour="jobs-table">
        <Table
          columns={columns}
          dataSource={filteredJobs}
          rowKey="_id"
          loading={loading}
          pagination={{
            ...pagination,
            total: filteredJobs.length,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total) => `Total ${total} jobs`,
          }}
          onChange={handleTableChange}
          scroll={{ x: 1500 }}
        />
      </Card>

      <Modal
        title={editingJob ? `Edit ${entityLabel}` : `Add New ${entityLabel}`}
        open={isModalOpen}
        onCancel={closeModal}
        footer={null}
        width={800}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label="Job Title"
            name="title"
            rules={[{ required: true, message: 'Please enter job title' }]}
          >
            <Input placeholder="e.g., Senior Frontend Developer" />
          </Form.Item>

          <Form.Item
            label="Company"
            name="company"
            rules={[{ required: true, message: 'Please enter company name' }]}
          >
            <Input placeholder="e.g., Tech Corp" />
          </Form.Item>

          <Form.Item
            label="Location"
            name="location"
            rules={[{ required: true, message: 'Please enter location' }]}
          >
            <Input placeholder="e.g., New York, NY / Remote" />
          </Form.Item>

          <Form.Item
            label="Job Type"
            name="type"
            rules={[{ required: true, message: 'Please select job type' }]}
          >
            <Select placeholder="Select job type">
              <Option value="Full-time">Full-time</Option>
              <Option value="Part-time">Part-time</Option>
              <Option value="Contract">Contract</Option>
              <Option value="Freelance">Freelance</Option>
              <Option value="Internship">Internship</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Experience Level"
            name="experience"
            rules={[{ required: true, message: 'Please enter experience level' }]}
          >
            <Input placeholder="e.g., Fresher / 1-2 years / 3-5 years" />
          </Form.Item>

          <Form.Item
            label="Gender Requirement"
            name="genderRequirement"
          >
            <Select placeholder="Select gender requirement" allowClear>
              <Option value="Any">Any</Option>
              <Option value="Male">Male</Option>
              <Option value="Female">Female</Option>
              <Option value="Both">Both</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Qualification"
            name="qualification"
          >
            <Input placeholder="e.g., 10th / 12th / Graduate / B.Tech" />
          </Form.Item>

          <Form.Item
            label="Category"
            name="category"
            rules={[{ required: true, message: 'Please enter category' }]}
          >
            <Input placeholder="e.g., Software Development, Marketing" />
          </Form.Item>

          <Form.Item label="Salary Range">
            <Space>
              <Form.Item name={['salary', 'min']} noStyle>
                <InputNumber placeholder="Min" style={{ width: 150 }} />
              </Form.Item>
              <span>to</span>
              <Form.Item name={['salary', 'max']} noStyle>
                <InputNumber placeholder="Max" style={{ width: 150 }} />
              </Form.Item>
              <Form.Item name={['salary', 'currency']} noStyle initialValue="USD">
                <Select style={{ width: 100 }}>
                  <Option value="USD">USD</Option>
                  <Option value="EUR">EUR</Option>
                  <Option value="GBP">GBP</Option>
                  <Option value="INR">INR</Option>
                </Select>
              </Form.Item>
            </Space>
          </Form.Item>

          <Form.Item
            label="Fixed Price"
            name="fixedPrice"
          >
            <InputNumber placeholder="e.g., 15000" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            label="Age Requirement"
            name="ageRequirement"
          >
            <Input placeholder="e.g., 18-25" />
          </Form.Item>

          <Form.Item
            label="Job Description"
            name="description"
            rules={[{ required: true, message: 'Please enter job description' }]}
          >
            <TextArea rows={4} placeholder="Enter detailed job description" />
          </Form.Item>

          <Form.Item
            label="Requirements (one per line)"
            name="requirements"
            getValueFromEvent={(e) => e.target.value.split('\n').filter(Boolean)}
            getValueProps={(value) => ({ value: value ? value.join('\n') : '' })}
          >
            <TextArea
              rows={4}
              placeholder="Bachelor's degree in Computer Science&#10;3+ years of React experience&#10;Strong problem-solving skills"
            />
          </Form.Item>

          <Form.Item
            label="Responsibilities (one per line)"
            name="responsibilities"
            getValueFromEvent={(e) => e.target.value.split('\n').filter(Boolean)}
            getValueProps={(value) => ({ value: value ? value.join('\n') : '' })}
          >
            <TextArea
              rows={4}
              placeholder="Develop and maintain web applications&#10;Collaborate with cross-functional teams&#10;Code reviews and mentoring"
            />
          </Form.Item>

          <Form.Item
            label="Skills (one per line)"
            name="skills"
            getValueFromEvent={(e) => e.target.value.split('\n').filter(Boolean)}
            getValueProps={(value) => ({ value: value ? value.join('\n') : '' })}
          >
            <TextArea rows={3} placeholder="React&#10;JavaScript&#10;Node.js" />
          </Form.Item>

          <Form.Item label="Application Deadline" name="applicationDeadline">
            <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
          </Form.Item>

          <Form.Item label="Contact Email" name="contactEmail">
            <Input placeholder="hr@company.com" type="email" />
          </Form.Item>

          <Form.Item
            label="Status"
            name="status"
            initialValue="Active"
            rules={[{ required: true }]}
          >
            <Select>
              <Option value="Active">Active</Option>
              <Option value="Inactive">Inactive</Option>
              <Option value="Closed">Closed</Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingJob ? `Update ${entityLabel}` : `Create ${entityLabel}`}
              </Button>
              <Button onClick={closeModal}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Jobs;
