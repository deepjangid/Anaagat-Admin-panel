import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Drawer, Empty, Input, Select, Space, Tag, Typography, message } from 'antd';
import { MdDownload, MdEdit, MdEmail, MdLocationOn, MdMap, MdPerson, MdPhone, MdRefresh, MdSchedule, MdTune } from 'react-icons/md';
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

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'shortlisted', label: 'Shortlisted' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
];

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

const CandidateResponsePage = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState('');
  const [drafts, setDrafts] = useState({});
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [uiDrawerOpen, setUiDrawerOpen] = useState(false);
  const [uiSettings, setUiSettings] = useState(DEFAULT_UI);

  const syncDrafts = useCallback((records) => {
    setDrafts((prev) => {
      const next = { ...prev };
      for (const record of records) {
        const id = String(record._id);
        next[id] = next[id] || {
          status: record.status || 'pending',
          adminMessage: record.adminMessage || '',
          candidateResponseDetails: {
            ...getEmptyDetails(),
            ...(record.candidateResponseDetails || {}),
          },
        };
      }
      return next;
    });
  }, []);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await applicationsAPI.getAll({ limit: 100 });
      if (res.data.success) {
        const rows = Array.isArray(res.data.applications) ? res.data.applications : [];
        setApplications(rows);
        syncDrafts(rows);
      }
    } catch (error) {
      console.error(error);
      message.error(error?.response?.data?.message || 'Failed to load candidate responses');
    } finally {
      setLoading(false);
    }
  }, [syncDrafts]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

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
        status: prev[id]?.status || 'pending',
        adminMessage: prev[id]?.adminMessage || '',
        candidateResponseDetails: prev[id]?.candidateResponseDetails || getEmptyDetails(),
        ...patch,
      },
    }));
  };

  const updateDetailField = (id, field, value) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: {
        status: prev[id]?.status || 'pending',
        adminMessage: prev[id]?.adminMessage || '',
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
  };

  const closeResponseForm = () => {
    setSelectedApplication(null);
  };

  const updateUiSetting = (key, value) => {
    setUiSettings((prev) => ({ ...prev, [key]: value }));
  };

  const resetUiSettings = () => {
    setUiSettings(DEFAULT_UI);
  };

  const handleUpdate = async (record) => {
    const id = String(record._id);
    const draft = drafts[id] || {
      status: record.status || 'pending',
      adminMessage: record.adminMessage || '',
      candidateResponseDetails: {
        ...getEmptyDetails(),
        ...(record.candidateResponseDetails || {}),
      },
    };

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
        updateDraft(id, {
          status: updated.status || 'pending',
          adminMessage: updated.adminMessage || '',
          candidateResponseDetails: {
            ...getEmptyDetails(),
            ...(updated.candidateResponseDetails || {}),
          },
        });
        message.success('Candidate response updated');
      }
    } catch (error) {
      console.error(error);
      message.error(error?.response?.data?.message || 'Failed to update candidate response');
    } finally {
      setSavingId('');
    }
  };

  return (
    <div
      className={`candidate-response-page ui-layout-${uiSettings.layout} ui-spacing-${uiSettings.spacing} ui-tone-${uiSettings.tone}`}
    >
      <div className="page-header">
        <h1>Candidate Response</h1>
        <p>Reply to job applicants here with a clean interview brief. Add status, response message, schedule, location, Google map link, contact person, and reporting instructions.</p>
      </div>

      <Card className="admin-surface-card" style={{ marginBottom: 20 }}>
        <div className="response-toolbar">
          <Alert
            type="info"
            showIcon
            message="Each card works like a conversation thread for one application."
            description="Mark whether the application belongs to an admin job or client job, then send all important interview information the candidate needs."
          />
          <Space wrap>
            <Button icon={<MdTune />} onClick={() => setUiDrawerOpen(true)}>
              Customize UI
            </Button>
            <Button icon={<MdRefresh />} onClick={fetchApplications} loading={loading}>
              Refresh
            </Button>
          </Space>
        </div>
      </Card>

      <div className="response-card-list">
        {applications.length === 0 && !loading ? (
          <Card className="admin-surface-card">
            <Empty description="No applications found yet" />
          </Card>
        ) : null}

        {applications.map((record) => {
          const id = String(record._id);
          const candidateName = getApplicationName(record);
          const initial = String(candidateName || '?').trim().charAt(0).toUpperCase() || '?';

          return (
            <Card
              key={id}
              className="admin-surface-card response-thread-card"
              loading={loading}
              onClick={() => openResponseForm(record)}
            >
              <div className="response-chat-card">
                <div className="response-chat-avatar">{initial}</div>

                <div className="response-chat-main">
                  <div className="response-chat-header">
                    <div className="response-thread-name">{candidateName}</div>
                    <div className="response-chat-right">
                      <Tag color={STATUS_COLORS[String(record.status || 'pending').toLowerCase()] || 'default'}>
                        {record.status || 'Pending'}
                      </Tag>
                    </div>
                  </div>

                  <div className="response-chat-subhead">
                    <span>{getApplicationJobTitle(record)}</span>
                    <span>{getApplicationClientName(record)}</span>
                    <Tag color={getApplicationJobSourceLabel(record) === 'Admin Job' ? 'geekblue' : 'purple'}>
                      {getApplicationJobSourceLabel(record)}
                    </Tag>
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
                <Button icon={<MdEdit />} type="primary" onClick={() => openResponseForm(record)}>
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

      <Drawer
        title={selectedApplication ? `Candidate Response - ${getApplicationName(selectedApplication)}` : 'Candidate Response'}
        open={Boolean(selectedApplication)}
        onClose={closeResponseForm}
        width={760}
        destroyOnHidden
      >
        {selectedApplication && (() => {
          const id = String(selectedApplication._id);
          const draft = drafts[id] || {
            status: selectedApplication.status || 'pending',
            adminMessage: selectedApplication.adminMessage || '',
            candidateResponseDetails: {
              ...getEmptyDetails(),
              ...(selectedApplication.candidateResponseDetails || {}),
            },
          };
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
                    options={STATUS_OPTIONS}
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
                  <div className="response-detail-label"><MdPerson /> Contact Person</div>
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

      <Drawer
        title="Customize UI"
        open={uiDrawerOpen}
        onClose={() => setUiDrawerOpen(false)}
        width={360}
      >
        <div className="response-thread-panel response-ui-panel">
          <div className="response-thread-field">
            <Text strong>Card Layout</Text>
            <Select
              value={uiSettings.layout}
              options={[
                { value: 'centered', label: 'Centered' },
                { value: 'wide', label: 'Wide' },
                { value: 'full', label: 'Full Width' },
              ]}
              onChange={(value) => updateUiSetting('layout', value)}
            />
          </div>

          <div className="response-thread-field">
            <Text strong>Spacing</Text>
            <Select
              value={uiSettings.spacing}
              options={[
                { value: 'compact', label: 'Compact' },
                { value: 'comfortable', label: 'Comfortable' },
              ]}
              onChange={(value) => updateUiSetting('spacing', value)}
            />
          </div>

          <div className="response-thread-field">
            <Text strong>Color Tone</Text>
            <Select
              value={uiSettings.tone}
              options={[
                { value: 'teal', label: 'Teal' },
                { value: 'sand', label: 'Sand' },
                { value: 'slate', label: 'Slate' },
              ]}
              onChange={(value) => updateUiSetting('tone', value)}
            />
          </div>

          <Button onClick={resetUiSettings}>
            Reset Default
          </Button>
        </div>
      </Drawer>
    </div>
  );
};

export default CandidateResponsePage;
