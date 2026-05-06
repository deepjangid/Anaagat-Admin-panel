import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, Col, Row, Statistic, Table, Tag, message } from 'antd';
import { MdBusiness, MdDescription, MdMail, MdPeople, MdPerson, MdVerifiedUser, MdWork } from 'react-icons/md';
import { adminAPI } from '../services/api';
import { getUserEmail, getUserName } from '../utils/adminRecords';

const DashboardPanel = () => {
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
    candidateProfiles: 0,
    clientProfiles: 0,
    contactMessages: 0,
    resumes: 0,
  });
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });

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
        candidateProfiles: Number(data.candidateProfiles ?? 0) || 0,
        clientProfiles: Number(data.clientProfiles ?? 0) || 0,
        contactMessages: Number(data.contactMessages ?? 0) || 0,
        resumes: Number(data.resumes ?? 0) || 0,
      });
      setUsers(Array.isArray(data.users) ? data.users : []);
      setPagination({
        current: Number(data.usersPage ?? page) || page,
        pageSize: Number(data.usersLimit ?? pageSize) || pageSize,
        total: totalUsers,
      });
    } catch (error) {
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

  const columns = useMemo(
    () => [
      {
        title: 'Name',
        key: 'name',
        width: 220,
        render: (_, record) => getUserName(record),
      },
      {
        title: 'Email',
        key: 'email',
        width: 260,
        render: (_, record) => getUserEmail(record),
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
        render: (createdAt) => (createdAt ? new Date(createdAt).toLocaleString('en-IN') : 'N/A'),
      },
    ],
    []
  );

  return (
    <div>
      <div className="page-header" data-tour="dashboard-hero">
        <div className="page-header-row">
          <div>
            <h1>Dashboard</h1>
            <p>Track admin activity, platform stats, and quick operational health from one place.</p>
          </div>
        </div>
      </div>

      <Row gutter={[16, 16]} data-tour="dashboard-stats">
        <Col xs={24} sm={12} lg={6}>
          <Card className="admin-surface-card">
            <Statistic title="Total Users" value={stats.totalUsers || stats.usersCount || 0} prefix={<MdPeople />} className="stats-card" />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="admin-surface-card">
            <Statistic title="Active Users" value={stats.activeUsers || 0} prefix={<MdVerifiedUser />} className="stats-card" />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="admin-surface-card">
            <Statistic title="Total Jobs" value={stats.totalJobs || 0} prefix={<MdWork />} className="stats-card" />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="admin-surface-card">
            <Statistic title="Active Jobs" value={stats.activeJobs || 0} prefix={<MdWork />} className="stats-card" />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="admin-surface-card">
            <Statistic title="Candidate Profiles" value={stats.candidateProfiles || 0} prefix={<MdPerson />} className="stats-card" />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="admin-surface-card">
            <Statistic title="Client Profiles" value={stats.clientProfiles || 0} prefix={<MdBusiness />} className="stats-card" />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="admin-surface-card">
            <Statistic title="Contact Messages" value={stats.contactMessages || 0} prefix={<MdMail />} className="stats-card" />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="admin-surface-card">
            <Statistic title="Resumes" value={stats.resumes || 0} prefix={<MdDescription />} className="stats-card" />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24}>
          <Card title="Latest Users" bordered={false} className="admin-surface-card" data-tour="dashboard-users-table">
            <Table
              columns={columns}
              dataSource={users}
              rowKey="_id"
              loading={loading}
              pagination={{
                ...pagination,
                showSizeChanger: true,
                pageSizeOptions: ['10', '20', '50', '100'],
                showTotal: (total) => `Total ${total} users`,
              }}
              onChange={(nextPagination) => {
                const controller = new AbortController();
                fetchDashboard(nextPagination.current, nextPagination.pageSize, controller.signal);
              }}
              scroll={{ x: 980 }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardPanel;
