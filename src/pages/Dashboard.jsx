import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, message } from 'antd';
import { MdPeople, MdWork, MdVerifiedUser } from 'react-icons/md';
import { adminAPI } from '../services/api';

const Dashboard = () => {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    usersCount: 0,
    adminCount: 0,
    activeUsers: 0,
    totalJobs: 0,
    activeJobs: 0,
    closedJobs: 0,
  });
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  const fetchDashboard = useCallback(async (page, pageSize, signal) => {
    setLoading(true);
    try {
      const res = await adminAPI.getDashboard({ page, limit: pageSize }, { signal });
      const data = res?.data || {};

      const totalUsers = Number(data.totalUsers ?? data.usersCount ?? 0) || 0;

      setStats({
        totalUsers,
        usersCount: totalUsers,
        adminCount: Number(data.adminCount ?? 0) || 0,
        activeUsers: Number(data.activeUsers ?? 0) || 0,
        totalJobs: Number(data.totalJobs ?? 0) || 0,
        activeJobs: Number(data.activeJobs ?? 0) || 0,
        closedJobs: Number(data.closedJobs ?? 0) || 0,
      });

      setUsers(Array.isArray(data.users) ? data.users : []);

      setPagination({
        current: Number(data.usersPage ?? page) || page,
        pageSize: Number(data.usersLimit ?? pageSize) || pageSize,
        total: totalUsers,
      });
    } catch (error) {
      // Ignore abort/cancel
      if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') return;
      console.error('Dashboard fetch error:', error);
      message.error(error?.response?.data?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchDashboard(1, 20, controller.signal);
    return () => controller.abort();
  }, [fetchDashboard]);

  const tableColumns = useMemo(() => [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      width: 220,
      render: (name) => name || <span style={{ color: '#999' }}>—</span>,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      width: 260,
      render: (email) => email || <span style={{ color: '#999' }}>—</span>,
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      width: 120,
      render: (role) => <Tag color={role === 'admin' ? 'geekblue' : 'default'}>{role || 'user'}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 120,
      render: (isActive) => (
        <Tag color={isActive === false ? 'red' : 'green'}>{isActive === false ? 'Inactive' : 'Active'}</Tag>
      ),
    },
    {
      title: 'Joined',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 200,
      render: (createdAt) => (createdAt ? new Date(createdAt).toLocaleString('en-IN') : <span style={{ color: '#999' }}>—</span>),
    },
  ], []);

  const handleTableChange = (newPagination) => {
    const controller = new AbortController();
    fetchDashboard(newPagination.current, newPagination.pageSize, controller.signal);
  };

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
      </div>

      {/* Statistics Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Users"
              value={stats.totalUsers || stats.usersCount || 0}
              prefix={<MdPeople />}
              className="stats-card"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Active Users"
              value={stats.activeUsers || 0}
              prefix={<MdVerifiedUser />}
              className="stats-card"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Jobs"
              value={stats.totalJobs || 0}
              prefix={<MdWork />}
              className="stats-card"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Active Jobs"
              value={stats.activeJobs || 0}
              prefix={<MdWork />}
              className="stats-card"
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24}>
          <Card title="Latest Users" bordered={false}>
            <Table
              columns={tableColumns}
              dataSource={users}
              rowKey="_id"
              loading={loading}
              pagination={{
                ...pagination,
                showSizeChanger: true,
                pageSizeOptions: ['10', '20', '50', '100'],
                showTotal: (total) => `Total ${total} users`,
              }}
              onChange={handleTableChange}
              scroll={{ x: 980 }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
