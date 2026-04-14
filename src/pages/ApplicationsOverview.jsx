import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, Col, Descriptions, Drawer, Input, Row, Select, Space, Statistic, Table, Tag, Typography, message } from 'antd';
import { MdCancel, MdCheckCircle, MdDownload, MdHourglassEmpty, MdPeople, MdRefresh, MdVisibility, MdWork } from 'react-icons/md';
import { applicationsAPI } from '../services/api';
import {
  getApplicationExperienceSummary,
  getApplicationJobTitle,
  getApplicationName,
  getUserCity,
  getUserEmail,
  getUserPhone,
  hasApplicationResume,
} from '../utils/adminRecords';

const { Search } = Input;
const { Text } = Typography;

const STATUS_COLORS = {
  pending: 'gold',
  reviewing: 'blue',
  shortlisted: 'cyan',
  hired: 'green',
  rejected: 'red',
};

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
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
  if (!value) return 'NA';
  return value.length > 8 ? value.slice(-8) : value;
};

const getApplicationPublicId = (app) => {
  const suffix = getShortId(app?._id);
  const initials = String(getApplicationName(app))
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('');

  return `APP-${normalizeCode(getUserCity(app), 3)}-${normalizeCode(app?.qualification, 3)}-${normalizeCode(initials, 2)}-${suffix}`;
};

const ApplicationsOverview = () => {
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
        setApplications(res.data.applications || []);
        setPagination({
          current: res.data.currentPage || page,
          pageSize,
          total: res.data.total || 0,
        });
      }
    } catch (error) {
      if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') return;
      console.error(error);
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
  }, [fetchApplications, fetchStats, filters, pagination.pageSize]);

  const columns = useMemo(
    () => [
      {
        title: 'App ID',
        key: 'publicId',
        width: 190,
        render: (_, record) => {
          const publicId = getApplicationPublicId(record);
          return <Text code copyable={{ text: publicId }}>{publicId}</Text>;
        },
      },
      {
        title: 'Candidate',
        key: 'candidate',
        width: 250,
        render: (_, record) => (
          <div>
            <div className="admin-table-title">{getApplicationName(record)}</div>
            <div className="admin-table-subtitle">{getUserEmail(record)}</div>
          </div>
        ),
      },
      {
        title: 'Applied For',
        key: 'jobTitle',
        width: 230,
        render: (_, record) => getApplicationJobTitle(record),
      },
      {
        title: 'Phone',
        key: 'phone',
        width: 150,
        render: (_, record) => getUserPhone(record),
      },
      {
        title: 'City',
        key: 'city',
        width: 140,
        render: (_, record) => getUserCity(record),
      },
      {
        title: 'Experience',
        key: 'experience',
        width: 150,
        render: (_, record) => <Tag color={Array.isArray(record?.experience) && record.experience.length ? 'geekblue' : 'default'}>{getApplicationExperienceSummary(record)}</Tag>,
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        width: 120,
        render: (status) => <Tag color={STATUS_COLORS[String(status || '').toLowerCase()] || 'default'}>{status || 'N/A'}</Tag>,
      },
      {
        title: 'Resume',
        key: 'resume',
        width: 110,
        render: (_, record) => <Tag color={hasApplicationResume(record) ? 'green' : 'default'}>{hasApplicationResume(record) ? 'Available' : 'Missing'}</Tag>,
      },
      {
        title: 'Submitted',
        dataIndex: 'submittedAt',
        key: 'submittedAt',
        width: 190,
        render: (date, record) => {
          const value = date || record?.createdAt;
          return value ? new Date(value).toLocaleString('en-IN') : 'N/A';
        },
      },
      {
        title: 'Actions',
        key: 'actions',
        fixed: 'right',
        width: 170,
        render: (_, record) => (
          <Space>
            <Button
              icon={<MdVisibility />}
              size="small"
              onClick={() => {
                setSelectedApplication(record);
                setDrawerOpen(true);
              }}
            >
              View
            </Button>
            <Button
              icon={<MdDownload />}
              size="small"
              disabled={!hasApplicationResume(record)}
              onClick={() => applicationsAPI.downloadResume(record._id, getApplicationName(record))}
            >
              Resume
            </Button>
          </Space>
        ),
      },
    ],
    []
  );

  const handleSearch = (value) => {
    setFilters((prev) => ({ ...prev, search: value ? String(value).trim() : '' }));
  };

  const handleStatusFilter = (value) => {
    setFilters((prev) => ({ ...prev, status: value || '' }));
  };

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
          ].map((item) => (
            <Col xs={12} sm={8} lg={4} key={item.title}>
              <Card className="admin-surface-card" size="small">
                <Statistic
                  title={item.title}
                  value={item.value || 0}
                  prefix={<span style={{ color: item.color }}>{item.icon}</span>}
                  valueStyle={{ color: item.color, fontSize: 22 }}
                  loading={statsLoading}
                />
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Card className="admin-surface-card" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Search
            placeholder="Search by applicant, email, phone, city, applied role, or paste _id"
            onSearch={handleSearch}
            style={{ width: 360 }}
            allowClear
          />
          <Select value={filters.status} style={{ width: 180 }} onChange={handleStatusFilter} options={STATUS_OPTIONS} />
          <Button icon={<MdRefresh />} onClick={() => fetchApplications(pagination.current, pagination.pageSize, filters)}>
            Refresh
          </Button>
        </Space>
      </Card>

      <Card className="admin-surface-card">
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
          onChange={(nextPagination) => fetchApplications(nextPagination.current, nextPagination.pageSize, filters)}
          scroll={{ x: 1720 }}
        />
      </Card>

      <Drawer
        title={selectedApplication ? `Application - ${getApplicationName(selectedApplication)}` : ''}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={620}
        extra={
          selectedApplication && (
            <Button
              icon={<MdDownload />}
              disabled={!hasApplicationResume(selectedApplication)}
              onClick={() => applicationsAPI.downloadResume(selectedApplication._id, getApplicationName(selectedApplication))}
            >
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
            <Descriptions.Item label="Candidate">{getApplicationName(selectedApplication)}</Descriptions.Item>
            <Descriptions.Item label="Applied For">{getApplicationJobTitle(selectedApplication)}</Descriptions.Item>
            <Descriptions.Item label="Email">{getUserEmail(selectedApplication)}</Descriptions.Item>
            <Descriptions.Item label="Phone">{getUserPhone(selectedApplication)}</Descriptions.Item>
            <Descriptions.Item label="Qualification">{selectedApplication.qualification || 'N/A'}</Descriptions.Item>
            <Descriptions.Item label="College">{selectedApplication.college || 'N/A'}</Descriptions.Item>
            <Descriptions.Item label="City">{getUserCity(selectedApplication)}</Descriptions.Item>
            <Descriptions.Item label="Experience">{getApplicationExperienceSummary(selectedApplication)}</Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={STATUS_COLORS[String(selectedApplication.status || '').toLowerCase()] || 'default'}>
                {selectedApplication.status || 'N/A'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Submitted">
              {selectedApplication.submittedAt || selectedApplication.createdAt
                ? new Date(selectedApplication.submittedAt || selectedApplication.createdAt).toLocaleString('en-IN')
                : 'N/A'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </div>
  );
};

export default ApplicationsOverview;
