import { useCallback, useEffect, useMemo, useState } from 'react';
import { Avatar, Button, Card, Descriptions, Input, Popconfirm, Space, Table, Tag, message } from 'antd';
import { MdDelete, MdPerson, MdRefresh } from 'react-icons/md';
import { adminAPI } from '../services/api';
import { getUserCity, getUserEmail, getUserName, getUserPhone } from '../utils/adminRecords';
import { buildRecordDetails } from '../utils/recordDetails';

const { Search } = Input;
const hiddenKeys = ['_id', '__v'];

const CandidateProfilesView = () => {
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
        message.error('Failed to fetch candidate profiles.');
      }
    } catch (error) {
      if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') return;
      console.error(error);
      message.error(error?.response?.data?.message || 'Failed to fetch candidate profiles.');
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
      const res = await adminAPI.deleteCandidateProfile(id);
      if (res.data.success) {
        message.success('Candidate profile deleted.');
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
        title: 'Candidate',
        key: 'name',
        width: 280,
        render: (_, record) => (
          <Space>
            <Avatar icon={<MdPerson />} className="admin-avatar" />
            <div>
              <div className="admin-table-title">{getUserName(record)}</div>
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
        title: 'City',
        key: 'city',
        width: 180,
        render: (_, record) => getUserCity(record),
      },
      {
        title: 'Updated',
        dataIndex: 'updatedAt',
        key: 'updatedAt',
        width: 190,
        render: (value) => (value ? new Date(value).toLocaleString('en-IN') : 'N/A'),
      },
      {
        title: 'Status',
        key: 'status',
        width: 120,
        render: (_, record) => {
          const active = record?.isActive;
          if (active === undefined) return <Tag>Unknown</Tag>;
          return <Tag color={active === false ? 'red' : 'green'}>{active === false ? 'Inactive' : 'Active'}</Tag>;
        },
      },
      {
        title: 'Actions',
        key: 'actions',
        fixed: 'right',
        width: 120,
        render: (_, record) => (
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
        <h1>Candidate Profiles</h1>
      </div>

      <Card className="admin-surface-card" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Search
            placeholder="Search by name, email, phone, city, or paste _id"
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
            showTotal: (total) => `Total ${total} profiles`,
          }}
          onChange={(nextPagination) => fetchItems(nextPagination.current, nextPagination.pageSize, filters)}
          scroll={{ x: 1100 }}
        />
      </Card>
    </div>
  );
};

export default CandidateProfilesView;
