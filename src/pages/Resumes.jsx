import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, Col, Input, Row, Space, Statistic, Table, Tag, message } from 'antd';
import { MdDownload, MdRefresh } from 'react-icons/md';
import { applicationsAPI } from '../services/api';
import { getApplicationJobTitle } from '../utils/adminRecords';

const { Search } = Input;

const hasResume = (record) => Boolean(record?.resumeData || record?.resumePath || record?.hasCustomResume);

const getResumeType = (record) => {
  if (record?.hasCustomResume) return { label: 'Uploaded', color: 'green' };
  if (record?.resumePath) return { label: 'Linked', color: 'blue' };
  if (record?.resumeData) return { label: 'Created', color: 'gold' };
  return { label: 'Missing', color: 'default' };
};

const getResumeDate = (record) => record?.submittedAt || record?.updatedAt || record?.createdAt || null;

const Resumes = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ search: '' });
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });

  const fetchItems = useCallback(async (page = 1, pageSize = 20, currentFilters = filters, signal) => {
    setLoading(true);
    try {
      const params = { page, limit: pageSize, hasResume: true, uniqueCandidates: true };
      if (currentFilters.search) params.search = currentFilters.search;

      const res = await applicationsAPI.getAll(params, { signal });
      if (res.data.success) {
        setItems(res.data.applications || []);
        setPagination({
          current: res.data.currentPage || page,
          pageSize,
          total: res.data.total || 0,
        });
      } else {
        message.error('Failed to fetch resumes');
      }
    } catch (error) {
      if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') return;
      console.error(error);
      message.error(error?.response?.data?.message || 'Failed to fetch resumes');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const controller = new AbortController();
    fetchItems(1, pagination.pageSize, filters, controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDownload = useCallback(async (record) => {
    try {
      if (record?.resumeData) {
        await applicationsAPI.downloadResume(record._id, record.fullName || record.email || 'Applicant');
        return;
      }

      if (record?.resumePath) {
        window.open(record.resumePath, '_blank', 'noopener,noreferrer');
        return;
      }

      message.error('Resume not available');
    } catch (error) {
      console.error(error);
      message.error(error?.response?.data?.message || 'Failed to download resume');
    }
  }, []);

  const stats = useMemo(() => ({
    total: items.length,
    uploaded: items.filter((item) => item?.hasCustomResume).length,
    linked: items.filter((item) => !item?.hasCustomResume && item?.resumePath).length,
    created: items.filter((item) => !item?.hasCustomResume && !item?.resumePath && item?.resumeData).length,
  }), [items]);

  const columns = useMemo(() => [
    {
      title: 'Applicant',
      key: 'applicant',
      width: 240,
      render: (_, record) => record?.fullName || record?.email || '-',
    },
    {
      title: 'Applied For',
      key: 'appliedFor',
      width: 230,
      render: (_, record) => getApplicationJobTitle(record),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      width: 240,
      render: (value) => value || '-',
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      width: 160,
      render: (value) => value || '-',
    },
    {
      title: 'Resume Type',
      key: 'resumeType',
      width: 130,
      render: (_, record) => {
        const type = getResumeType(record);
        return <Tag color={type.color}>{type.label}</Tag>;
      },
    },
    {
      title: 'Status',
      key: 'status',
      width: 120,
      render: (_, record) => (
        <Tag color={hasResume(record) ? 'green' : 'red'}>{hasResume(record) ? 'Available' : 'Missing'}</Tag>
      ),
    },
    {
      title: 'Latest',
      key: 'latest',
      width: 190,
      render: (_, record) => {
        const value = getResumeDate(record);
        return value ? new Date(value).toLocaleString('en-IN') : '-';
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 140,
      render: (_, record) => (
        <Button
          size="small"
          icon={<MdDownload />}
          disabled={!hasResume(record)}
          onClick={() => handleDownload(record)}
        >
          Download
        </Button>
      ),
    },
  ], [handleDownload]);

  const handleTableChange = (nextPagination) => {
    fetchItems(nextPagination.current, nextPagination.pageSize, filters);
  };

  const handleSearch = (value) => {
    const newFilters = { ...filters, search: value ? String(value).trim() : '' };
    setFilters(newFilters);
    fetchItems(1, pagination.pageSize, newFilters);
  };

  return (
    <div>
      <div className="page-header">
        <h1>Resumes</h1>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={12} lg={6}>
          <Card className="admin-surface-card" size="small">
            <Statistic title="Latest Resumes" value={stats.total} />
          </Card>
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <Card className="admin-surface-card" size="small">
            <Statistic title="Uploaded" value={stats.uploaded} />
          </Card>
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <Card className="admin-surface-card" size="small">
            <Statistic title="Linked" value={stats.linked} />
          </Card>
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <Card className="admin-surface-card" size="small">
            <Statistic title="Created" value={stats.created} />
          </Card>
        </Col>
      </Row>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Search
            placeholder="Search by name, email, phone, city, job, or id"
            onSearch={handleSearch}
            style={{ width: 360 }}
            allowClear
          />
          <Button icon={<MdRefresh />} onClick={() => fetchItems(pagination.current, pagination.pageSize, filters)}>
            Refresh
          </Button>
        </Space>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={items}
          rowKey="_id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total) => `Total ${total} resumes`,
          }}
          onChange={handleTableChange}
          scroll={{ x: 1500 }}
        />
      </Card>
    </div>
  );
};

export default Resumes;
