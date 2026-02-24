import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Select,
  Input,
  message,
  Popconfirm,
  Descriptions,
  Drawer,
  Typography,
  Row,
  Col,
  Statistic,
  Badge,
} from 'antd';
import {
  MdSearch,
  MdDelete,
  MdVisibility,
  MdDownload,
  MdPeople,
  MdHourglassEmpty,
  MdCheckCircle,
  MdCancel,
  MdWork,
} from 'react-icons/md';
import { applicationsAPI } from '../services/api';

const { Option } = Select;
const { Text, Paragraph } = Typography;
const { Search } = Input;

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending:     { color: 'gold',   label: 'Pending' },
  reviewing:   { color: 'blue',   label: 'Reviewing' },
  shortlisted: { color: 'cyan',   label: 'Shortlisted' },
  hired:       { color: 'green',  label: 'Hired' },
  rejected:    { color: 'red',    label: 'Rejected' },
};

const STATUS_OPTIONS = Object.entries(STATUS_CONFIG).map(([value, { label }]) => ({
  value,
  label,
}));

// ─── Component ────────────────────────────────────────────────────────────────
const Applications = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [filters, setFilters] = useState({ status: '', search: '' });

  // Drawer for viewing detail
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [notes, setNotes] = useState('');
  const [notesLoading, setNotesLoading] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  // ─── Data fetching ──────────────────────────────────────────────────────────
  const fetchApplications = useCallback(async (page = 1, pageSize = 10, currentFilters = filters) => {
    setLoading(true);
    try {
      const params = { page, limit: pageSize };
      if (currentFilters.status) params.status = currentFilters.status;
      if (currentFilters.search) params.search = currentFilters.search;

      const res = await applicationsAPI.getAll(params);
      if (res.data.success) {
        setApplications(res.data.applications);
        setPagination({
          current: res.data.currentPage,
          pageSize,
          total: res.data.total,
        });
      }
    } catch (error) {
      console.error(error);
      message.error('Failed to fetch applications');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const res = await applicationsAPI.getStats();
      if (res.data.success) setStats(res.data.stats);
    } catch (error) {
      console.error(error);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
    fetchStats();
  }, []);

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const handleTableChange = (newPagination) => {
    fetchApplications(newPagination.current, newPagination.pageSize);
  };

  const handleStatusFilter = (value) => {
    const newFilters = { ...filters, status: value };
    setFilters(newFilters);
    fetchApplications(1, pagination.pageSize, newFilters);
  };

  const handleSearch = (value) => {
    const newFilters = { ...filters, search: value };
    setFilters(newFilters);
    fetchApplications(1, pagination.pageSize, newFilters);
  };

  const handleViewDetail = (record) => {
    setSelectedApp(record);
    setNotes(record.notes || '');
    setDrawerOpen(true);
  };

  const handleStatusUpdate = async (id, status) => {
    setStatusUpdating(true);
    try {
      const res = await applicationsAPI.updateStatus(id, status);
      if (res.data.success) {
        message.success(`Status updated to "${STATUS_CONFIG[status].label}"`);
        // Update in table & drawer
        setApplications((prev) =>
          prev.map((a) => (a._id === id ? { ...a, status } : a))
        );
        if (selectedApp?._id === id) {
          setSelectedApp((prev) => ({ ...prev, status }));
        }
        fetchStats();
      }
    } catch (error) {
      message.error('Failed to update status');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedApp) return;
    setNotesLoading(true);
    try {
      const res = await applicationsAPI.updateNotes(selectedApp._id, notes);
      if (res.data.success) {
        message.success('Notes saved');
        setApplications((prev) =>
          prev.map((a) => (a._id === selectedApp._id ? { ...a, notes } : a))
        );
      }
    } catch (error) {
      message.error('Failed to save notes');
    } finally {
      setNotesLoading(false);
    }
  };

  const handleDownloadResume = async (record) => {
    try {
      await applicationsAPI.downloadResume(record._id, record.fullName);
      message.success('Resume downloaded');
    } catch (error) {
      message.error('Failed to download resume');
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await applicationsAPI.delete(id);
      if (res.data.success) {
        message.success('Application deleted');
        fetchApplications(pagination.current, pagination.pageSize);
        fetchStats();
        if (selectedApp?._id === id) setDrawerOpen(false);
      }
    } catch (error) {
      message.error('Failed to delete application');
    }
  };

  // ─── Table columns ───────────────────────────────────────────────────────────
  const columns = [
    {
      title: 'Applicant',
      key: 'applicant',
      width: 200,
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 600 }}>{r.fullName}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>{r.email}</Text>
        </div>
      ),
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      width: 130,
    },
    {
      title: 'Qualification',
      dataIndex: 'qualification',
      key: 'qualification',
      width: 150,
    },
    {
      title: 'City',
      dataIndex: 'currentCity',
      key: 'currentCity',
      width: 120,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status, record) => (
        <Select
          value={status}
          size="small"
          style={{ width: 130 }}
          onChange={(val) => handleStatusUpdate(record._id, val)}
          loading={statusUpdating}
        >
          {STATUS_OPTIONS.map((opt) => (
            <Option key={opt.value} value={opt.value}>
              <Tag color={STATUS_CONFIG[opt.value].color} style={{ margin: 0 }}>
                {opt.label}
              </Tag>
            </Option>
          ))}
        </Select>
      ),
    },
    {
      title: 'Submitted',
      dataIndex: 'submittedAt',
      key: 'submittedAt',
      width: 120,
      render: (date) => new Date(date).toLocaleDateString('en-IN'),
    },
    {
      title: 'Resume',
      key: 'resume',
      width: 80,
      render: (_, record) => (
        <Button
          type="link"
          icon={<MdDownload />}
          size="small"
          onClick={() => handleDownloadResume(record)}
          title="Download Resume"
        />
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 120,
      render: (_, record) => (
        <Space>
          <Button
            icon={<MdVisibility />}
            size="small"
            onClick={() => handleViewDetail(record)}
          >
            View
          </Button>
          <Popconfirm
            title="Delete this application?"
            onConfirm={() => handleDelete(record._id)}
            okText="Yes"
            cancelText="No"
          >
            <Button danger icon={<MdDelete />} size="small" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div
        className="page-header"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}
      >
        <h1>Applications</h1>
      </div>

      {/* Stats */}
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          {[
            { title: 'Total',       value: stats.total,       icon: <MdPeople />,        color: '#1890ff' },
            { title: 'Pending',     value: stats.pending,     icon: <MdHourglassEmpty />, color: '#faad14' },
            { title: 'Shortlisted', value: stats.shortlisted, icon: <MdWork />,           color: '#13c2c2' },
            { title: 'Hired',       value: stats.hired,       icon: <MdCheckCircle />,    color: '#52c41a' },
            { title: 'Rejected',    value: stats.rejected,    icon: <MdCancel />,         color: '#ff4d4f' },
          ].map((s) => (
            <Col xs={12} sm={8} lg={4} key={s.title}>
              <Card size="small">
                <Statistic
                  title={s.title}
                  value={s.value}
                  prefix={<span style={{ color: s.color }}>{s.icon}</span>}
                  valueStyle={{ color: s.color, fontSize: 22 }}
                  loading={statsLoading}
                />
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Filters */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Search
            placeholder="Search by name or email..."
            onSearch={handleSearch}
            style={{ width: 260 }}
            allowClear
          />
          <Select
            placeholder="Filter by status"
            style={{ width: 160 }}
            allowClear
            onChange={handleStatusFilter}
          >
            {STATUS_OPTIONS.map((opt) => (
              <Option key={opt.value} value={opt.value}>
                <Tag color={STATUS_CONFIG[opt.value].color}>{opt.label}</Tag>
              </Option>
            ))}
          </Select>
          <Button onClick={() => fetchApplications()}>Refresh</Button>
        </Space>
      </Card>

      {/* Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={applications}
          rowKey="_id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            showTotal: (total) => `Total ${total} applications`,
          }}
          onChange={handleTableChange}
          scroll={{ x: 1100 }}
        />
      </Card>

      {/* Detail Drawer */}
      <Drawer
        title={selectedApp ? `Application — ${selectedApp.fullName}` : ''}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={560}
        extra={
          selectedApp && (
            <Space>
              <Button
                icon={<MdDownload />}
                onClick={() => handleDownloadResume(selectedApp)}
              >
                Resume
              </Button>
              <Popconfirm
                title="Delete this application?"
                onConfirm={() => handleDelete(selectedApp._id)}
                okText="Yes"
                cancelText="No"
              >
                <Button danger icon={<MdDelete />}>Delete</Button>
              </Popconfirm>
            </Space>
          )
        }
      >
        {selectedApp && (
          <>
            {/* Status selector in drawer */}
            <Card size="small" style={{ marginBottom: 16 }}>
              <Space>
                <Text strong>Status:</Text>
                <Select
                  value={selectedApp.status}
                  style={{ width: 160 }}
                  onChange={(val) => handleStatusUpdate(selectedApp._id, val)}
                  loading={statusUpdating}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <Option key={opt.value} value={opt.value}>
                      <Tag color={STATUS_CONFIG[opt.value].color} style={{ margin: 0 }}>
                        {opt.label}
                      </Tag>
                    </Option>
                  ))}
                </Select>
              </Space>
            </Card>

            {/* Personal Info */}
            <Descriptions column={1} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Full Name">{selectedApp.fullName}</Descriptions.Item>
              <Descriptions.Item label="Email">{selectedApp.email}</Descriptions.Item>
              <Descriptions.Item label="Phone">{selectedApp.phone}</Descriptions.Item>
              <Descriptions.Item label="City">{selectedApp.currentCity}</Descriptions.Item>
              <Descriptions.Item label="Qualification">{selectedApp.qualification}</Descriptions.Item>
              <Descriptions.Item label="College">{selectedApp.college}</Descriptions.Item>
              <Descriptions.Item label="Resume Type">
                <Badge
                  color={selectedApp.hasCustomResume ? 'green' : 'blue'}
                  text={selectedApp.hasCustomResume ? 'Uploaded by applicant' : 'Auto-generated'}
                />
              </Descriptions.Item>
              <Descriptions.Item label="Submitted">
                {new Date(selectedApp.submittedAt).toLocaleString('en-IN')}
              </Descriptions.Item>
            </Descriptions>

            {/* Experience */}
            {selectedApp.experience?.length > 0 && (
              <Card title="Work Experience" size="small" style={{ marginBottom: 16 }}>
                {selectedApp.experience.map((exp, i) => (
                  <div key={i} style={{ marginBottom: i < selectedApp.experience.length - 1 ? 12 : 0 }}>
                    <Text strong>{exp.jobProfile}</Text>
                    <br />
                    <Text type="secondary">{exp.companyName}</Text>
                  </div>
                ))}
              </Card>
            )}

            {/* Admin Notes */}
            <Card title="Admin Notes" size="small">
              <Input.TextArea
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add internal notes about this applicant..."
                style={{ marginBottom: 8 }}
              />
              <Button type="primary" size="small" loading={notesLoading} onClick={handleSaveNotes}>
                Save Notes
              </Button>
            </Card>
          </>
        )}
      </Drawer>
    </div>
  );
};

export default Applications;