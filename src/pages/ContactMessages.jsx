import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, Drawer, Descriptions, Input, message, Popconfirm, Space, Table, Tag, Typography } from 'antd';
import { MdDelete, MdDone, MdEmail, MdRefresh, MdVisibility } from 'react-icons/md';
import { adminAPI } from '../services/api';

const { Search } = Input;
const { Text } = Typography;

const getName = (record) => record?.name || record?.fullName || '—';
const getEmail = (record) => record?.email || '—';
const getPhone = (record) => record?.phone || record?.mobile || '—';
const getSubject = (record) => record?.subject || '—';
const getMessage = (record) => record?.message || record?.msg || record?.description || '—';

const ContactMessages = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ search: '' });
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  const fetchItems = useCallback(async (page = 1, pageSize = 20, currentFilters = filters, signal) => {
    setLoading(true);
    try {
      const params = { page, limit: pageSize };
      if (currentFilters.search) params.search = currentFilters.search;

      const res = await adminAPI.getContactMessages(params, { signal });
      if (res.data.success) {
        setItems(res.data.items || []);
        setPagination({
          current: res.data.currentPage || page,
          pageSize,
          total: res.data.total || 0,
        });
      } else {
        message.error('Failed to fetch contact messages');
      }
    } catch (error) {
      if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') return;
      console.error(error);
      message.error(error?.response?.data?.message || 'Failed to fetch contact messages');
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
      const res = await adminAPI.deleteContactMessage(id);
      if (res.data.success) {
        message.success('Deleted');
        fetchItems(pagination.current, pagination.pageSize, filters);
        if (selected?._id === id) {
          setDrawerOpen(false);
          setSelected(null);
        }
      } else {
        message.error('Delete failed');
      }
    } catch (error) {
      console.error(error);
      message.error(error?.response?.data?.message || 'Delete failed');
    }
  }, [fetchItems, filters, pagination, selected?._id]);

  const handleMarkRead = useCallback(async (id) => {
    try {
      const res = await adminAPI.markContactMessageRead(id);
      if (res.data.success) {
        message.success('Marked as read');
        fetchItems(pagination.current, pagination.pageSize, filters);
      } else {
        message.error('Update failed');
      }
    } catch (error) {
      console.error(error);
      message.error(error?.response?.data?.message || 'Update failed');
    }
  }, [fetchItems, filters, pagination]);

  const columns = useMemo(() => [
    {
      title: 'From',
      key: 'from',
      width: 240,
      render: (_, record) => getName(record),
    },
    {
      title: 'Email',
      key: 'email',
      width: 260,
      render: (_, record) => (
        <Space>
          <MdEmail />
          {getEmail(record)}
        </Space>
      ),
    },
    {
      title: 'Subject',
      key: 'subject',
      width: 260,
      render: (_, record) => getSubject(record),
    },
    {
      title: 'Status',
      key: 'isRead',
      width: 120,
      render: (_, record) => (
        <Tag color={record?.isRead ? 'green' : 'gold'}>{record?.isRead ? 'Read' : 'New'}</Tag>
      ),
    },
    {
      title: 'Received',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 190,
      render: (v) => (v ? new Date(v).toLocaleString('en-IN') : '—'),
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 220,
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<MdVisibility />}
            onClick={() => {
              setSelected(record);
              setDrawerOpen(true);
            }}
          >
            View
          </Button>
          <Button
            size="small"
            icon={<MdDone />}
            disabled={Boolean(record?.isRead)}
            onClick={() => handleMarkRead(record._id)}
          >
            Mark Read
          </Button>
          <Popconfirm
            title="Delete this message?"
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
  ], [handleDelete, handleMarkRead]);

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
        <h1>Contact Messages</h1>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Search
            placeholder="Search by name/email/subject or paste _id"
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
            showTotal: (total) => `Total ${total} messages`,
          }}
          onChange={handleTableChange}
          scroll={{ x: 1400 }}
        />
      </Card>

      <Drawer
        title={selected ? `Message — ${getName(selected)}` : ''}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={620}
        extra={
          selected && (
            <Space>
              <Button icon={<MdDone />} disabled={Boolean(selected?.isRead)} onClick={() => handleMarkRead(selected._id)}>
                Mark Read
              </Button>
              <Popconfirm
                title="Delete this message?"
                okText="Delete"
                okButtonProps={{ danger: true }}
                onConfirm={() => handleDelete(selected._id)}
              >
                <Button danger icon={<MdDelete />}>
                  Delete
                </Button>
              </Popconfirm>
            </Space>
          )
        }
      >
        {selected && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="ID">
              <Text code copyable={{ text: String(selected._id) }}>
                {String(selected._id)}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Name">{getName(selected)}</Descriptions.Item>
            <Descriptions.Item label="Email">{getEmail(selected)}</Descriptions.Item>
            <Descriptions.Item label="Phone">{getPhone(selected)}</Descriptions.Item>
            <Descriptions.Item label="Subject">{getSubject(selected)}</Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={selected?.isRead ? 'green' : 'gold'}>{selected?.isRead ? 'Read' : 'New'}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Message">{getMessage(selected)}</Descriptions.Item>
            <Descriptions.Item label="Received">
              {selected?.createdAt ? new Date(selected.createdAt).toLocaleString('en-IN') : '—'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </div>
  );
};

export default ContactMessages;
