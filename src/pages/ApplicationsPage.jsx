
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, Table, Button, Space, Tag, Input, message, Drawer, Descriptions, Row, Col, Statistic, Typography, Select } from 'antd';
import { MdDownload, MdVisibility, MdPeople, MdHourglassEmpty, MdWork, MdCheckCircle, MdCancel } from 'react-icons/md';
import { applicationsAPI } from '../services/api';

const { Text } = Typography;
const { Search } = Input;

const STATUS_COLORS = {
  pending: 'gold',
  reviewing: 'blue',
  shortlisted: 'cyan',
  hired: 'green',
  rejected: 'red',
};

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'reviewing', label: 'Reviewing' },
  { value: 'shortlisted', label: 'Shortlisted' },
  { value: 'hired', label: 'Hired' },
  { value: 'rejected', label: 'Rejected' },
];

const normalizeCode = (value, maxLen) => {
  const cleaned = String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '');
  if (!cleaned) return 'NA';
  return cleaned.slice(0, maxLen);
};

const getShortId = (id) => {
  const value = String(id || '');
  if (!value) return '—';
  return value.length > 8 ? value.slice(-8) : value;
};

const getApplicationPublicId = (app) => {
  const suffix = getShortId(app?._id);
  const name = String(app?.fullName || '').trim();
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('') || 'NA';

  const city = normalizeCode(app?.currentCity, 3);
  const qual = normalizeCode(app?.qualification, 3);
  const initCode = normalizeCode(initials, 2);

  // Example: APP-JAI-BAC-DK-5AFD2C1A
  return `APP-${city}-${qual}-${initCode}-${suffix}`;
};

const ApplicationsPage = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [filters, setFilters] = useState({ status: '', search: '' });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);

  const fetchApplications = useCallback(async (page = 1, pageSize = 10, currentFilters = filters, signal) => {
    setLoading(true);
    try {
      const params = { page, limit: pageSize };
      if (currentFilters.status) params.status = currentFilters.status;
      if (currentFilters.search) params.search = currentFilters.search;

      const res = await applicationsAPI.getAll(params, { signal });
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
      if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') return;
      message.error(error?.response?.data?.message || 'Failed to fetch applications');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchStats = useCallback(async (signal) => {
    setStatsLoading(true);
    try {
      const res = await applicationsAPI.getStats({ signal });
      if (res.data.success) setStats(res.data.stats);
    } catch (error) {
      console.error(error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchApplications(1, pagination.pageSize, filters, controller.signal);
    fetchStats(controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTableChange = (newPagination) => {
    fetchApplications(newPagination.current, newPagination.pageSize, filters);
  };

  const handleStatusFilter = (value) => {
    const newFilters = { ...filters, status: value || '' };
    setFilters(newFilters);
    fetchApplications(1, pagination.pageSize, newFilters);
  };

  const handleSearch = (value) => {
    const newFilters = { ...filters, search: value ? String(value).trim() : '' };
    setFilters(newFilters);
    fetchApplications(1, pagination.pageSize, newFilters);
  };

  const handleViewDetail = (record) => {
    setSelectedApplication(record);
    setDrawerOpen(true);
  };

  const columns = useMemo(() => [
    {
      title: 'App ID',
      key: 'publicId',
      width: 170,
      render: (_, record) => {
        const publicId = getApplicationPublicId(record);
        return (
          <Text code copyable={{ text: publicId }}>
            {publicId}
          </Text>
        );
      },
    },
    {
      title: 'Name',
      dataIndex: 'fullName',
      key: 'fullName',
      width: 220,
      render: (fullName) => fullName || '—',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      width: 240,
      render: (email) => email || '—',
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      width: 140,
      render: (phone) => phone || '—',
    },
    {
      title: 'Qualification',
      dataIndex: 'qualification',
      key: 'qualification',
      width: 170,
      render: (qualification) => qualification || '—',
    },
    {
      title: 'College',
      dataIndex: 'college',
      key: 'college',
      width: 160,
      render: (college) => college || '—',
    },
    {
      title: 'City',
      dataIndex: 'currentCity',
      key: 'currentCity',
      width: 120,
      render: (city) => city || '—',
    },
    {
      title: 'Fresher/Exp',
      key: 'experience',
      width: 140,
      render: (_, record) => {
        const count = Array.isArray(record.experience) ? record.experience.length : 0;
        return <Tag color={count > 0 ? 'geekblue' : 'default'}>{count > 0 ? `Experienced (${count})` : 'Fresher'}</Tag>;
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => <Tag color={STATUS_COLORS[String(status || '').toLowerCase()] || 'default'}>{status || '—'}</Tag>,
    },
    {
      title: 'Submitted',
      dataIndex: 'submittedAt',
      key: 'submittedAt',
      width: 180,
      render: (date) => (date ? new Date(date).toLocaleString('en-IN') : '—'),
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 170,
      render: (_, record) => (
        <Space>
          <Button icon={<MdVisibility />} size="small" onClick={() => handleViewDetail(record)}>
            View
          </Button>
          <Button icon={<MdDownload />} size="small" onClick={() => applicationsAPI.downloadResume(record._id, record.fullName || record.email || 'Applicant')}>
            Resume
          </Button>
        </Space>
      ),
    },
  ], []);

  return (
    <div>
      <div className="page-header">
        <h1>Applications</h1>
      </div>

      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          {[
            { title: 'Total', value: stats.total, icon: <MdPeople />, color: '#1890ff' },
            { title: 'Pending', value: stats.pending, icon: <MdHourglassEmpty />, color: '#faad14' },
            { title: 'Shortlisted', value: stats.shortlisted, icon: <MdWork />, color: '#13c2c2' },
            { title: 'Hired', value: stats.hired, icon: <MdCheckCircle />, color: '#52c41a' },
            { title: 'Rejected', value: stats.rejected, icon: <MdCancel />, color: '#ff4d4f' },
          ].map((s) => (
            <Col xs={12} sm={8} lg={4} key={s.title}>
              <Card size="small">
                <Statistic
                  title={s.title}
                  value={s.value || 0}
                  prefix={<span style={{ color: s.color }}>{s.icon}</span>}
                  valueStyle={{ color: s.color, fontSize: 22 }}
                  loading={statsLoading}
                />
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Search
            placeholder="Search by name/email/phone/city or paste _id"
            onSearch={handleSearch}
            style={{ width: 320 }}
            allowClear
          />
          <Select
            value={filters.status}
            style={{ width: 180 }}
            onChange={handleStatusFilter}
            options={STATUS_OPTIONS}
          />
          <Button onClick={() => fetchApplications(pagination.current, pagination.pageSize, filters)}>Refresh</Button>
        </Space>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={applications}
          rowKey="_id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total) => `Total ${total} applications`,
          }}
          onChange={handleTableChange}
          scroll={{ x: 1600 }}
        />
      </Card>

      <Drawer
        title={selectedApplication ? `Application — ${selectedApplication.fullName || selectedApplication.email || ''}` : ''}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={560}
        extra={
          selectedApplication && (
            <Button icon={<MdDownload />} onClick={() => applicationsAPI.downloadResume(selectedApplication._id, selectedApplication.fullName || selectedApplication.email || 'Applicant')}>
              Resume
            </Button>
          )
        }
      >
        {selectedApplication && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="App ID">
              <Text code copyable={{ text: getApplicationPublicId(selectedApplication) }}>
                {getApplicationPublicId(selectedApplication)}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="ID">
              <Text code copyable={{ text: String(selectedApplication._id) }}>
                {String(selectedApplication._id)}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Full Name">{selectedApplication.fullName || '—'}</Descriptions.Item>
            <Descriptions.Item label="Email">{selectedApplication.email || '—'}</Descriptions.Item>
            <Descriptions.Item label="Phone">{selectedApplication.phone || '—'}</Descriptions.Item>
            <Descriptions.Item label="Qualification">{selectedApplication.qualification || '—'}</Descriptions.Item>
            <Descriptions.Item label="College">{selectedApplication.college || '—'}</Descriptions.Item>
            <Descriptions.Item label="City">{selectedApplication.currentCity || '—'}</Descriptions.Item>
            <Descriptions.Item label="Status">{selectedApplication.status || '—'}</Descriptions.Item>
            <Descriptions.Item label="Submitted">
              {selectedApplication.submittedAt ? new Date(selectedApplication.submittedAt).toLocaleString('en-IN') : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Experience">
              {Array.isArray(selectedApplication.experience) && selectedApplication.experience.length > 0
                ? `${selectedApplication.experience.length} entries`
                : 'Fresher'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </div>
  );
};

export default ApplicationsPage;
