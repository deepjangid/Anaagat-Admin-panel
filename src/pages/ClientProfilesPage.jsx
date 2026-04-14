import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, Descriptions, Input, Popconfirm, Space, Table, message } from 'antd';
import { MdDelete, MdRefresh } from 'react-icons/md';
import { adminAPI } from '../services/api';
import { buildRecordDetails } from '../utils/recordDetails';

const { Search } = Input;

const getCompany = (record) => record?.companyName || record?.company || record?.name || '—';
const getEmail = (record) => record?.email || '—';
const getPhone = (record) => record?.phone || record?.mobile || '—';
const getLocation = (record) => record?.location || record?.city || record?.address || '—';

const hiddenKeys = ['_id', '__v'];

const ClientProfilesPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ search: '' });
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });

  const fetchItems = useCallback(async (page = 1, pageSize = 20, currentFilters = filters, signal) => {
    setLoading(true);
    try {
      const params = { page, limit: pageSize };
      if (currentFilters.search) params.search = currentFilters.search;

      const res = await adminAPI.getClientProfiles(params, { signal });
      if (res.data.success) {
        setItems(res.data.items || []);
        setPagination({
          current: res.data.currentPage || page,
          pageSize,
          total: res.data.total || 0,
        });
      } else {
        message.error('Failed to fetch client profiles.');
      }
    } catch (error) {
      if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') return;
      console.error(error);
      message.error(error?.response?.data?.message || 'Failed to fetch client profiles.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const controller = new AbortController();
    fetchItems(1, pagination.pageSize, filters, controller.signal);
    return () => controller.abort();
  }, [fetchItems, filters, pagination.pageSize]);

  const handleDelete = useCallback(async (id) => {
    try {
      const res = await adminAPI.deleteClientProfile(id);
      if (res.data.success) {
        message.success('Client profile deleted.');
        fetchItems(pagination.current, pagination.pageSize, filters);
      } else {
        message.error('Delete failed.');
      }
    } catch (error) {
      console.error(error);
      message.error(error?.response?.data?.message || 'Delete failed.');
    }
  }, [fetchItems, filters, pagination]);

  const columns = useMemo(() => [
    {
      title: 'Company',
      key: 'company',
      width: 260,
      render: (_, record) => getCompany(record),
    },
    {
      title: 'Email',
      key: 'email',
      width: 260,
      render: (_, record) => getEmail(record),
    },
    {
      title: 'Phone',
      key: 'phone',
      width: 160,
      render: (_, record) => getPhone(record),
    },
    {
      title: 'Location',
      key: 'location',
      width: 200,
      render: (_, record) => getLocation(record),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 190,
      render: (value) => (value ? new Date(value).toLocaleString('en-IN') : '—'),
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 120,
      render: (_, record) => (
        <Space>
          <Popconfirm
            title="Delete this client?"
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
        <h1>Client Profiles</h1>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Search
            placeholder="Search by company, email, phone, location, or paste _id"
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
          expandable={{
            expandedRowRender: (record) => (
              <Descriptions bordered size="small" column={2}>
                {buildRecordDetails(record, hiddenKeys).map((item) => (
                  <Descriptions.Item key={item.key} label={item.label}>
                    {item.value}
                  </Descriptions.Item>
                ))}
              </Descriptions>
            ),
          }}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total) => `Total ${total} clients`,
          }}
          onChange={handleTableChange}
          scroll={{ x: 1100 }}
        />
      </Card>
    </div>
  );
};

export default ClientProfilesPage;
