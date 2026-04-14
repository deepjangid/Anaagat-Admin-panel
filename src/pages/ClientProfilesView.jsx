import { useCallback, useEffect, useMemo, useState } from 'react';
import { Avatar, Button, Card, Descriptions, Input, Popconfirm, Space, Table, message } from 'antd';
import { MdBusiness, MdDelete, MdRefresh } from 'react-icons/md';
import { adminAPI } from '../services/api';
import { getCompanyName, getUserCity, getUserEmail, getUserPhone } from '../utils/adminRecords';
import { buildRecordDetails } from '../utils/recordDetails';

const { Search } = Input;
const hiddenKeys = ['_id', '__v'];

const ClientProfilesView = () => {
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

  const columns = useMemo(
    () => [
      {
        title: 'Client',
        key: 'company',
        width: 300,
        render: (_, record) => (
          <Space>
            <Avatar icon={<MdBusiness />} className="admin-avatar" />
            <div>
              <div className="admin-table-title">{getCompanyName(record)}</div>
              <div className="admin-table-subtitle">{getUserEmail(record)}</div>
            </div>
          </Space>
        ),
      },
      {
        title: 'Phone',
        key: 'phone',
        width: 170,
        render: (_, record) => getUserPhone(record),
      },
      {
        title: 'Location',
        key: 'location',
        width: 180,
        render: (_, record) => getUserCity(record),
      },
      {
        title: 'Created',
        dataIndex: 'createdAt',
        key: 'createdAt',
        width: 190,
        render: (value) => (value ? new Date(value).toLocaleString('en-IN') : 'N/A'),
      },
      {
        title: 'Actions',
        key: 'actions',
        fixed: 'right',
        width: 120,
        render: (_, record) => (
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
        ),
      },
    ],
    [handleDelete]
  );

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

      <Card className="admin-surface-card" style={{ marginBottom: 16 }}>
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

      <Card className="admin-surface-card">
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
          onChange={(nextPagination) => fetchItems(nextPagination.current, nextPagination.pageSize, filters)}
          scroll={{ x: 1100 }}
        />
      </Card>
    </div>
  );
};

export default ClientProfilesView;
