import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, Table, Space, Input, Button, Popconfirm, message, Tag } from 'antd';
import { MdDelete, MdRefresh } from 'react-icons/md';
import { adminAPI } from '../services/api';

const { Search } = Input;

const getDisplayName = (record) => record?.fullName || record?.name || '—';
const getDisplayEmail = (record) => record?.email || '—';
const getDisplayPhone = (record) => record?.phone || record?.mobile || '—';
const getDisplayCity = (record) => record?.currentCity || record?.city || record?.location || '—';

const CandidateProfiles = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ search: '' });
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });

  const fetchItems = useCallback(async (page = 1, pageSize = 20, currentFilters = filters, signal) => {
    setLoading(true);
    try {
      const params = { page, limit: pageSize };
      if (currentFilters.search) params.search = currentFilters.search;

      const res = await adminAPI.getCandidateProfiles(params, { signal });
      if (res.data.success) {
        setItems(res.data.items || []);
        setPagination({
          current: res.data.currentPage || page,
          pageSize,
          total: res.data.total || 0,
        });
      } else {
        message.error('Failed to fetch candidate profiles');
      }
    } catch (error) {
      if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') return;
      console.error(error);
      message.error(error?.response?.data?.message || 'Failed to fetch candidate profiles');
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

  const handleDelete = useCallback(async (id) => {
    try {
      const res = await adminAPI.deleteCandidateProfile(id);
      if (res.data.success) {
        message.success('Deleted');
        fetchItems(pagination.current, pagination.pageSize, filters);
      } else {
        message.error('Delete failed');
      }
    } catch (error) {
      console.error(error);
      message.error(error?.response?.data?.message || 'Delete failed');
    }
  }, [fetchItems, filters, pagination]);

  const columns = useMemo(() => [
    {
      title: 'Name',
      key: 'name',
      width: 240,
      render: (_, record) => getDisplayName(record),
    },
    {
      title: 'Email',
      key: 'email',
      width: 260,
      render: (_, record) => getDisplayEmail(record),
    },
    {
      title: 'Phone',
      key: 'phone',
      width: 160,
      render: (_, record) => getDisplayPhone(record),
    },
    {
      title: 'City',
      key: 'city',
      width: 160,
      render: (_, record) => getDisplayCity(record),
    },
    {
      title: 'Updated',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 190,
      render: (v) => (v ? new Date(v).toLocaleString('en-IN') : '—'),
    },
    {
      title: 'Status',
      key: 'status',
      width: 120,
      render: (_, record) => {
        const active = record?.isActive;
        if (active === undefined) return <Tag>NA</Tag>;
        return <Tag color={active === false ? 'red' : 'green'}>{active === false ? 'Inactive' : 'Active'}</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 120,
      render: (_, record) => (
        <Space>
          <Popconfirm
            title="Delete this profile?"
            okText="Delete"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(record._id)}
          >
            <Button danger size="small" icon={<MdDelete />}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ], [handleDelete]);

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
        <h1>Candidate Profiles</h1>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Search
            placeholder="Search by name/email/phone/city or paste _id"
            onSearch={handleSearch}
            style={{ width: 340 }}
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
            showTotal: (total) => `Total ${total} profiles`,
          }}
          onChange={handleTableChange}
          scroll={{ x: 1200 }}
        />
      </Card>
    </div>
  );
};

export default CandidateProfiles;
