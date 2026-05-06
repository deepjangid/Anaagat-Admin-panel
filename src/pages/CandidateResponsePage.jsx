import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Drawer, Empty, Input, Pagination, Select, Space, Tag, Typography, message } from 'antd';
import { MdDownload, MdEdit, MdEmail, MdLocationOn, MdMap, MdPerson, MdPhone, MdRefresh, MdSchedule } from 'react-icons/md';
import { applicationsAPI } from '../services/api';
import {
  getApplicationClientName,
  getApplicationJobSourceLabel,
  getApplicationJobTitle,
  getApplicationName,
  getUserEmail,
  getUserPhone,
  hasApplicationResume,
} from '../utils/adminRecords';

const { Search, TextArea } = Input;
const { Text, Paragraph } = Typography;

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'shortlisted', label: 'Shortlisted' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
];

const EDIT_STATUS_OPTIONS = STATUS_OPTIONS.filter((item) => item.value);

const STATUS_COLORS = {
  pending: 'gold',
  shortlisted: 'blue',
  accepted: 'green',
  rejected: 'red',
};

const INTERVIEW_MODE_OPTIONS = [
  { value: 'In Person', label: 'In Person' },
  { value: 'Google Meet', label: 'Google Meet' },
  { value: 'Zoom', label: 'Zoom' },
  { value: 'Phone Call', label: 'Phone Call' },
  { value: 'Hybrid', label: 'Hybrid' },
];

const UI_STORAGE_KEY = 'candidate-response-ui';

const DEFAULT_UI = {
  layout: 'centered',
  spacing: 'compact',
  tone: 'teal',
};

const DEFAULT_PAGINATION = {
  current: 1,
  pageSize: 12,
  total: 0,
};

const getEmptyDetails = () => ({
  interviewMode: '',
  interviewDate: '',
  interviewTime: '',
  interviewLocation: '',
  googleMapUrl: '',
  contactPerson: '',
  contactPhone: '',
  contactEmail: '',
  reportingNotes: '',
  documentsRequired: '',
  additionalInstructions: '',
});

const getDraftFromRecord = (record) => ({
  status: record.status || 'pending',
  adminMessage: record.adminMessage || '',
  candidateResponseDetails: {
    ...getEmptyDetails(),
    ...(record.candidateResponseDetails || {}),
  },
});

const CandidateResponsePage = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState('');
  const [drafts, setDrafts] = useState({});
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [uiSettings, setUiSettings] = useState(DEFAULT_UI);
  const [pagination, setPagination] = useState(DEFAULT_PAGINATION);
  const [filters, setFilters] = useState({ status: '', search: '' });
  const currentPage = pagination.current;
  const currentPageSize = pagination.pageSize;

  const syncDrafts = useCallback((records) => {
    setDrafts((prev) => {
      const next = { ...prev };
      for (const record of records) {
        const id = String(record._id);
        if (!next[id]) next[id] = getDraftFromRecord(record);
      }
      return next;
    });
  }, []);

  const fetchApplications = useCallback(async (
    page = DEFAULT_PAGINATION.current,
    pageSize = DEFAULT_PAGINATION.pageSize,
    currentFilters = filters,
    signal
  ) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: pageSize,
      };

      if (currentFilters.status) params.status = currentFilters.status;
      if (currentFilters.search) params.search = currentFilters.search;

      const res = await applicationsAPI.getAll(params, { signal });
      if (res.data.success) {
        const rows = Array.isArray(res.data.applications) ? res.data.applications : [];
        setApplications(rows);
        setPagination({
          current: res.data.currentPage || page,
          pageSize,
          total: res.data.total || 0,
        });
        syncDrafts(rows);
      }
    } catch (error) {
      if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') return;
      console.error(error);
      message.error(error?.response?.data?.message || 'Failed to load candidate responses');
    } finally {
      setLoading(false);
    }
  }, [filters, syncDrafts]);

  useEffect(() => {
    const controller = new AbortController();
    fetchApplications(currentPage, currentPageSize, filters, controller.signal);
    return () => controller.abort();
  }, [currentPage, currentPageSize, fetchApplications, filters]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(UI_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      setUiSettings((prev) => ({ ...prev, ...(parsed || {}) }));
    } catch {
      // ignore broken local settings
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(UI_STORAGE_KEY, JSON.stringify(uiSettings));
    } catch {
      // ignore storage failures
    }
  }, [uiSettings]);

  const updateDraft = (id, patch) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || getDraftFromRecord({})),
        ...patch,
      },
    }));
  };

  const updateDetailField = (id, field, value) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || getDraftFromRecord({})),
        candidateResponseDetails: {
          ...getEmptyDetails(),
          ...(prev[id]?.candidateResponseDetails || {}),
          [field]: value,
        },
      },
    }));
  };

  const openResponseForm = (record) => {
    setSelectedApplication(record);
    setDrafts((prev) => ({
      ...prev,
      [String(record._id)]: prev[String(record._id)] || getDraftFromRecord(record),
    }));
  };

  const closeResponseForm = () => {
    setSelectedApplication(null);
  };

  const handleUpdate = async (record) => {
    const id = String(record._id);
    const draft = drafts[id] || getDraftFromRecord(record);

    setSavingId(id);
    try {
      const res = await applicationsAPI.update(record._id, {
        status: draft.status,
        adminMessage: draft.adminMessage,
        candidateResponseDetails: draft.candidateResponseDetails,
      });

      if (res.data.success) {
        const updated = res.data.application;
        setApplications((prev) => prev.map((item) => (item._id === updated._id ? updated : item)));
        setSelectedApplication((prev) => (prev?._id === updated._id ? updated : prev));
        updateDraft(id, getDraftFromRecord(updated));
        message.success('Candidate response updated');
      }
    } catch (error) {
      console.error(error);
      message.error(error?.response?.data?.message || 'Failed to update candidate response');
    } finally {
      setSavingId('');
    }
  };

  const handleSearch = (value) => {
    setPagination((prev) => ({ ...prev, current: 1 }));
    setFilters((prev) => ({ ...prev, search: String(value || '').trim() }));
  };

  const handleStatusFilter = (value) => {
    setPagination((prev) => ({ ...prev, current: 1 }));
    setFilters((prev) => ({ ...prev, status: value || '' }));
  };

  const handlePageChange = (page, pageSize) => {
    setPagination((prev) => ({
      ...prev,
      current: page,
      pageSize,
    }));
  };

  return (
    <div
      className={`candidate-response-page ui-layout-${uiSettings.layout} ui-spacing-${uiSettings.spacing} ui-tone-${uiSettings.tone}`}
    >
      <div className="page-header">
        <h1>Candidate Response</h1>
        <p>Reply to job applicants here with a clean interview brief. Add status, response message, schedule, location, Google map link, contact person, and reporting instructions.</p>
      </div>

      <Card className="admin-surface-card" style={{ marginBottom: 20 }} data-tour="candidate-response-toolbar">
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Alert
            type="info"
            showIcon
            message="Optimized for larger candidate lists"
            description="This page now loads paginated application batches instead of rendering a large fixed list at once."
          />

          <div className="response-toolbar">
            <Space wrap>
              <Search
                placeholder="Search candidate, email, phone, role, or application ID"
                allowClear
                onSearch={handleSearch}
                style={{ width: 320 }}
              />
              <Select
                value={filters.status}
                style={{ width: 180 }}
                options={STATUS_OPTIONS}
                onChange={handleStatusFilter}
              />
              <Button
                icon={<MdRefresh />}
                onClick={() => fetchApplications(currentPage, currentPageSize, filters)}
                loading={loading}
              >
                Refresh
              </Button>
            </Space>
          </div>
        </Space>
      </Card>

      <div className="response-card-list" data-tour="candidate-response-list">
        {applications.length === 0 && !loading ? (
          <Card className="admin-surface-card">
            <Empty description="No applications found yet" />
          </Card>
        ) : null}

        {applications.map((record) => {
          const id = String(record._id);
          const candidateName = getApplicationName(record);

          return (
            <Card
              key={id}
              className="admin-surface-card response-thread-card"
              loading={loading}
              onClick={() => openResponseForm(record)}
            >
              <div className="response-chat-card">
                <div className="response-chat-avatar ma"></div>

                <div className="response-chat-main">
                  <div className="response-chat-header">
                    <div className="response-thread-name">{candidateName}</div>
                    <div className="response-chat-right">
                      <Tag color={STATUS_COLORS[String(record.status || 'pending').toLowerCase()] || 'default'}>
                        {record.status || 'Pending'}
                      </Tag>
                    </div>
                  </div>

                  <div className="response-chat-subhead flex gap-2">
                    <span>{getApplicationJobTitle(record)}</span>
                    <span>{getApplicationClientName(record)}</span>
                  </div>

                  <div className="response-thread-details">
                    <Text type="secondary">{getUserEmail(record)}</Text>
                    <Text type="secondary">{getUserPhone(record)}</Text>
                  </div>

                  <Paragraph className="response-chat-preview" ellipsis={{ rows: 1 }}>
                    {record.adminMessage || 'No admin response has been sent yet.'}
                  </Paragraph>
                </div>
              </div>

              <Space wrap>
                <Button
                  icon={<MdEdit />}
                  type="primary"
                  onClick={(event) => {
                    event.stopPropagation();
                    openResponseForm(record);
                  }}
                >
                  Open Response Form
                </Button>
                <Button
                  icon={<MdDownload />}
                  disabled={!hasApplicationResume(record)}
                  onClick={(event) => {
                    event.stopPropagation();
                    applicationsAPI.downloadResume(record._id, getApplicationName(record));
                  }}
                >
                  Resume
                </Button>
              </Space>
            </Card>
          );
        })}
      </div>

      <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
        <Pagination
          current={pagination.current}
          pageSize={pagination.pageSize}
          total={pagination.total}
          showSizeChanger
          pageSizeOptions={['12', '24', '48', '96']}
          showTotal={(total) => `Total ${total} candidates`}
          onChange={handlePageChange}
        />
      </div>

      <Drawer
        title={selectedApplication ? `Candidate Response - ${getApplicationName(selectedApplication)}` : 'Candidate Response'}
        open={Boolean(selectedApplication)}
        onClose={closeResponseForm}
        width={760}
        destroyOnHidden
      >
        {selectedApplication && (() => {
          const id = String(selectedApplication._id);
          const draft = drafts[id] || getDraftFromRecord(selectedApplication);
          const details = draft.candidateResponseDetails || getEmptyDetails();

          return (
            <div className="response-thread-panel response-drawer-panel">
              <div className="response-thread-top">
                <div>
                  <div className="response-thread-name">{getApplicationName(selectedApplication)}</div>
                  <div className="response-thread-meta">
                    <span>{getApplicationJobTitle(selectedApplication)}</span>
                    <span>{getApplicationClientName(selectedApplication)}</span>
                    <Tag color={getApplicationJobSourceLabel(selectedApplication) === 'Admin Job' ? 'geekblue' : 'purple'}>
                      {getApplicationJobSourceLabel(selectedApplication)}
                    </Tag>
                  </div>
                </div>
                <Tag color={STATUS_COLORS[String(selectedApplication.status || 'pending').toLowerCase()] || 'default'}>
                  {selectedApplication.status || 'Pending'}
                </Tag>
              </div>

              <div className="response-thread-details">
                <Text type="secondary">{getUserEmail(selectedApplication)}</Text>
                <Text type="secondary">{getUserPhone(selectedApplication)}</Text>
              </div>

              <div className="response-thread-form">
                <div className="response-thread-field">
                  <Text strong>Status</Text>
                  <Select
                    value={draft.status}
                    options={EDIT_STATUS_OPTIONS}
                    onChange={(value) => updateDraft(id, { status: value })}
                  />
                </div>

                <div className="response-thread-field">
                  <Text strong>Interview Mode</Text>
                  <Select
                    value={details.interviewMode}
                    options={INTERVIEW_MODE_OPTIONS}
                    placeholder="Select mode"
                    onChange={(value) => updateDetailField(id, 'interviewMode', value)}
                  />
                </div>
              </div>

              <div className="response-thread-field response-thread-field-wide">
                <Text strong>Candidate Message</Text>
                <TextArea
                  rows={4}
                  value={draft.adminMessage}
                  onChange={(event) => updateDraft(id, { adminMessage: event.target.value })}
                  placeholder="Write the message the candidate should see in their dashboard."
                />
              </div>

              <div className="response-details-grid">
                <div className="response-detail-card">
                  <div className="response-detail-label"><MdSchedule /> Interview Date</div>
                  <Input
                    type="date"
                    value={details.interviewDate}
                    onChange={(event) => updateDetailField(id, 'interviewDate', event.target.value)}
                  />
                </div>
                <div className="response-detail-card">
                  <div className="response-detail-label"><MdSchedule /> Interview Time</div>
                  <Input
                    type="time"
                    value={details.interviewTime}
                    onChange={(event) => updateDetailField(id, 'interviewTime', event.target.value)}
                  />
                </div>
                <div className="response-detail-card response-detail-card-wide">
                  <div className="response-detail-label"><MdLocationOn /> Interview Location</div>
                  <Input
                    value={details.interviewLocation}
                    onChange={(event) => updateDetailField(id, 'interviewLocation', event.target.value)}
                    placeholder="Office address or interview venue"
                  />
                </div>
                <div className="response-detail-card response-detail-card-wide">
                  <div className="response-detail-label"><MdMap /> Google Map Location</div>
                  <Input
                    value={details.googleMapUrl}
                    onChange={(event) => updateDetailField(id, 'googleMapUrl', event.target.value)}
                    placeholder="Paste Google Maps link"
                  />
                </div>
                <div className="response-detail-card">
                  <div className="response-detail-label"><MdPerson /> Contact Person Name</div>
                  <Input
                    value={details.contactPerson}
                    onChange={(event) => updateDetailField(id, 'contactPerson', event.target.value)}
                    placeholder="HR or interviewer name"
                  />
                </div>
                <div className="response-detail-card">
                  <div className="response-detail-label"><MdPhone /> Contact Phone</div>
                  <Input
                    value={details.contactPhone}
                    onChange={(event) => updateDetailField(id, 'contactPhone', event.target.value)}
                    placeholder="Phone number"
                  />
                </div>
                <div className="response-detail-card response-detail-card-wide">
                  <div className="response-detail-label"><MdEmail /> Contact Email</div>
                  <Input
                    value={details.contactEmail}
                    onChange={(event) => updateDetailField(id, 'contactEmail', event.target.value)}
                    placeholder="Contact email"
                  />
                </div>
                <div className="response-detail-card response-detail-card-wide">
                  <div className="response-detail-label">Reporting Notes</div>
                  <TextArea
                    rows={3}
                    value={details.reportingNotes}
                    onChange={(event) => updateDetailField(id, 'reportingNotes', event.target.value)}
                    placeholder="Gate number, floor, reception instructions, arrival time"
                  />
                </div>
                <div className="response-detail-card response-detail-card-wide">
                  <div className="response-detail-label">Documents Required</div>
                  <TextArea
                    rows={3}
                    value={details.documentsRequired}
                    onChange={(event) => updateDetailField(id, 'documentsRequired', event.target.value)}
                    placeholder="Resume, ID proof, certificates, portfolio, laptop"
                  />
                </div>
                <div className="response-detail-card response-detail-card-wide">
                  <div className="response-detail-label">Additional Instructions</div>
                  <TextArea
                    rows={3}
                    value={details.additionalInstructions}
                    onChange={(event) => updateDetailField(id, 'additionalInstructions', event.target.value)}
                    placeholder="Dress code, round details, online meeting rules, anything important for candidate"
                  />
                </div>
              </div>

              <Space wrap>
                <Button
                  type="primary"
                  loading={savingId === id}
                  onClick={() => handleUpdate(selectedApplication)}
                >
                  Save Response
                </Button>
                <Button
                  icon={<MdDownload />}
                  disabled={!hasApplicationResume(selectedApplication)}
                  onClick={() => applicationsAPI.downloadResume(selectedApplication._id, getApplicationName(selectedApplication))}
                >
                  Resume
                </Button>
              </Space>
            </div>
          );
        })()}
      </Drawer>
    </div>
  );
};

export default CandidateResponsePage;
