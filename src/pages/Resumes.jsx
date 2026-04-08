import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, Input, message, Space, Table, Tag, Typography } from 'antd';
import { MdDownload, MdRefresh } from 'react-icons/md';
import { applicationsAPI } from '../services/api';

const { Search } = Input;
const { Text } = Typography;

const hasResume = (record) => Boolean(record?.resumeData || record?.resumePath || record?.hasCustomResume);

const Resumes = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ search: '' });
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });

  const fetchItems = useCallback(async (page = 1, pageSize = 20, currentFilters = filters, signal) => {
    setLoading(true);
    try {
      const params = { page, limit: pageSize, hasResume: true };
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

  const columns = useMemo(() => [
    {
      title: 'Applicant',
      key: 'applicant',
      width: 260,
      render: (_, record) => record?.fullName || record?.email || '—',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      width: 260,
      render: (v) => v || '—',
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      width: 170,
      render: (v) => v || '—',
    },
    {
      title: 'Status',
      key: 'resume',
      width: 120,
      render: (_, record) => (
        <Tag color={hasResume(record) ? 'green' : 'red'}>{hasResume(record) ? 'Available' : 'Missing'}</Tag>
      ),
    },
    {
      title: 'Submitted',
      dataIndex: 'submittedAt',
      key: 'submittedAt',
      width: 190,
      render: (v) => (v ? new Date(v).toLocaleString('en-IN') : '—'),
    },
    {
      title: 'ID',
      dataIndex: '_id',
      key: '_id',
      width: 220,
      render: (id) => (
        <Text code copyable={{ text: String(id || '') }}>
          {String(id || '')}
        </Text>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 140,
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<MdDownload />}
            disabled={!hasResume(record)}
            onClick={() => applicationsAPI.downloadResume(record._id, record.fullName || record.email || 'Applicant')}
          >
            Download
          </Button>
        </Space>
      ),
    },
  ], []);

  const handleTableChange = (newPagination) => {
    fetchItems(newPagination.current, newPagination.pageSize, filters);
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

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Search
            placeholder="Search by name/email/phone/city or paste _id"
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

