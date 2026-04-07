import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, Table, Button, Space, Tag, Input, message, Drawer, Descriptions, Row, Col, Statistic, Typography } from 'antd';
import { MdPeople, MdVisibility } from 'react-icons/md';
import { adminAPI } from '../services/api';

const { Text } = Typography;
const { Search } = Input;

const getDisplayName = (candidate) => {
  if (candidate?.name) return candidate.name;
  if (candidate?.email) return String(candidate.email).split('@')[0] || candidate.email;
  return 'Candidate';
};

const getShortId = (id) => {
  const value = String(id || '');
  if (!value) return '—';
  return value.length > 8 ? value.slice(-8) : value;
};

// ─── Status config ────────────────────────────────────────────────────────────


// ─── Component ────────────────────────────────────────────────────────────────
const Applications = () => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ total: 0 });
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [searchText, setSearchText] = useState('');

  // Drawer for viewing detail
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  // ─── Data fetching ──────────────────────────────────────────────────────────
  const fetchApplications = useCallback(async (page = 1, pageSize = pagination.pageSize, search = searchText, signal) => {
    setLoading(true);
    try {
      const res = await adminAPI.getUsers(
        { page, limit: pageSize, role: 'candidate', search },
        { signal }
      );
      const data = res?.data || {};
      if (data.success) {
        const rows = Array.isArray(data.users) ? data.users : [];
        setCandidates(rows);
        const total = Number(data.total ?? rows.length) || 0;
        setStats({ total });
        setPagination({
          current: Number(data.currentPage ?? page) || page,
          pageSize: Number(data.limit ?? pageSize) || pageSize,
          total,
        });
      }
    } catch (error) {
      console.error(error);
      if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') return;
      message.error(error?.response?.data?.message || 'Failed to fetch candidates');
    } finally {
      setLoading(false);
    }
  }, [pagination.pageSize, searchText]);

  useEffect(() => {
    const controller = new AbortController();
    fetchApplications(1, pagination.pageSize, searchText, controller.signal);
    return () => controller.abort();
  }, [fetchApplications, pagination.pageSize, searchText]);

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const handleTableChange = (newPagination) => {
    fetchApplications(newPagination.current, newPagination.pageSize, searchText);
  };

  const handleSearch = (value) => {
    const next = value ? String(value).trim() : '';
    setSearchText(next);
    fetchApplications(1, pagination.pageSize, next);
  };

  const handleViewDetail = (record) => {
    setSelectedCandidate(record);
    setDrawerOpen(true);
  };



  // ─── Table columns ───────────────────────────────────────────────────────────
  const columns = useMemo(() => [
    {
      title: 'ID',
      dataIndex: '_id',
      key: '_id',
      width: 120,
      render: (id) => (
        <Text code copyable={{ text: String(id) }}>
          {getShortId(id)}
        </Text>
      ),
    },
    {
      title: 'Candidate',
      dataIndex: 'email',
      key: 'candidate',
      width: 260,
      render: (email, record) => (
        <div>
          <div style={{ fontWeight: 600 }}>{getDisplayName(record)}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>{email || '—'}</Text>
        </div>
      ),
    },
    {
      title: 'Mobile',
      dataIndex: 'mobile',
      key: 'mobile',
      width: 150,
      render: (mobile) => mobile || '—',
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      width: 120,
      render: (role) => <Tag color={role === 'candidate' ? 'blue' : 'default'}>{role || '—'}</Tag>,
    },
    {
      title: 'Joined',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 190,
      render: (date) => (date ? new Date(date).toLocaleString('en-IN') : '—'),
    },
    {
      title: 'Actions',
      dataIndex: '_id',
      key: 'actions',
      fixed: 'right',
      width: 110,
      render: (id, record) => (
        <Button icon={<MdVisibility />} size="small" title={id} onClick={() => handleViewDetail(record)}>
          View
        </Button>
      ),
    },
  ], []);

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div
        className="page-header"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}
      >
        <h1>Candidates</h1>
      </div>

      {/* Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small">
            <Statistic title="Total Candidates" value={stats.total || 0} prefix={<MdPeople />} valueStyle={{ fontSize: 22 }} />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Search
            placeholder="Search by name/email/mobile..."
            onSearch={handleSearch}
            style={{ width: 260 }}
            allowClear
          />
          <Button onClick={() => fetchApplications(pagination.current, pagination.pageSize, searchText)}>Refresh</Button>
        </Space>
      </Card>

      {/* Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={candidates}
          rowKey="_id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            showTotal: (total) => `Total ${total} candidates`,
          }}
          onChange={handleTableChange}
          scroll={{ x: 900 }}
        />
      </Card>

      {/* Detail Drawer */}
      <Drawer
        title={selectedCandidate ? `Candidate — ${getDisplayName(selectedCandidate)}` : ''}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={520}
      >
        {selectedCandidate && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="ID">
              <Text code copyable={{ text: String(selectedCandidate._id) }}>
                {String(selectedCandidate._id)}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Name">{getDisplayName(selectedCandidate)}</Descriptions.Item>
            <Descriptions.Item label="Email">{selectedCandidate.email || '—'}</Descriptions.Item>
            <Descriptions.Item label="Mobile">{selectedCandidate.mobile || '—'}</Descriptions.Item>
            <Descriptions.Item label="Role">{selectedCandidate.role || '—'}</Descriptions.Item>
            <Descriptions.Item label="Created">
              {selectedCandidate.createdAt ? new Date(selectedCandidate.createdAt).toLocaleString('en-IN') : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Updated">
              {selectedCandidate.updatedAt ? new Date(selectedCandidate.updatedAt).toLocaleString('en-IN') : '—'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </div>
  );
};

export default Applications;
