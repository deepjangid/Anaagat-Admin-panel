import { useCallback, useEffect, useMemo, useState } from 'react';
import { Avatar, Button, Card, Descriptions, Drawer, Input, Popconfirm, Space, Table, Tag, Typography, message } from 'antd';
import { MdDelete, MdDone, MdEmail, MdMail, MdRefresh, MdVisibility } from 'react-icons/md';
import { adminAPI } from '../services/api';
import { getMessagePreview, getSubject, getUserEmail, getUserName, getUserPhone } from '../utils/adminRecords';

const { Search } = Input;
const { Text, Paragraph } = Typography;

const ContactMessagesView = () => {
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
        message.error('Failed to fetch contact messages.');
      }
    } catch (error) {
      if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') return;
      console.error(error);
      message.error(error?.response?.data?.message || 'Failed to fetch contact messages.');
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
      const res = await adminAPI.deleteContactMessage(id);
      if (res.data.success) {
        message.success('Message deleted.');
        fetchItems(pagination.current, pagination.pageSize, filters);
        if (selected?._id === id) {
          setSelected(null);
          setDrawerOpen(false);
        }
      } else {
        message.error('Delete failed.');
      }
    } catch (error) {
      console.error(error);
      message.error(error?.response?.data?.message || 'Delete failed.');
    }
  }, [fetchItems, filters, pagination, selected?._id]);

  const handleMarkRead = useCallback(async (id) => {
    try {
      const res = await adminAPI.markContactMessageRead(id);
      if (res.data.success) {
        message.success('Marked as read.');
        setItems((prev) => prev.map((item) => (item._id === id ? { ...item, isRead: true } : item)));
        setSelected((prev) => (prev && prev._id === id ? { ...prev, isRead: true } : prev));
      } else {
        message.error('Update failed.');
      }
    } catch (error) {
      console.error(error);
      message.error(error?.response?.data?.message || 'Update failed.');
    }
  }, []);

  const columns = useMemo(
    () => [
      {
        title: 'From',
        key: 'from',
        width: 280,
        render: (_, record) => (
          <Space>
            <Avatar icon={<MdMail />} className="admin-avatar" />
            <div>
              <div className="admin-table-title">{getUserName(record)}</div>
              <div className="admin-table-subtitle">{getUserPhone(record)}</div>
            </div>
          </Space>
        ),
      },
      {
        title: 'Email',
        key: 'email',
        width: 260,
        render: (_, record) => (
          <Space>
            <MdEmail />
            <span>{getUserEmail(record)}</span>
          </Space>
        ),
      },
      {
        title: 'Subject',
        key: 'subject',
        width: 220,
        render: (_, record) => getSubject(record),
      },
      {
        title: 'Message',
        key: 'message',
        width: 320,
        render: (_, record) => <span className="admin-clamp-two">{getMessagePreview(record)}</span>,
      },
      {
        title: 'Status',
        key: 'status',
        width: 120,
        render: (_, record) => <Tag color={record?.isRead ? 'green' : 'gold'}>{record?.isRead ? 'Read' : 'New'}</Tag>,
      },
      {
        title: 'Received',
        dataIndex: 'createdAt',
        key: 'createdAt',
        width: 190,
        render: (value) => (value ? new Date(value).toLocaleString('en-IN') : 'N/A'),
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
            <Button size="small" icon={<MdDone />} disabled={Boolean(record?.isRead)} onClick={() => handleMarkRead(record._id)}>
              Read
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
    ],
    [handleDelete, handleMarkRead]
  );

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

      <Card className="admin-surface-card" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Search
            placeholder="Search by name, email, phone, subject, or paste _id"
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
          pagination={{
            ...pagination,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total) => `Total ${total} messages`,
          }}
          onChange={(nextPagination) => fetchItems(nextPagination.current, nextPagination.pageSize, filters)}
          scroll={{ x: 1600 }}
        />
      </Card>

      <Drawer
        title={selected ? `Message - ${getUserName(selected)}` : ''}
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
            <Descriptions.Item label="Name">{getUserName(selected)}</Descriptions.Item>
            <Descriptions.Item label="Email">{getUserEmail(selected)}</Descriptions.Item>
            <Descriptions.Item label="Phone">{getUserPhone(selected)}</Descriptions.Item>
            <Descriptions.Item label="Subject">{getSubject(selected)}</Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={selected?.isRead ? 'green' : 'gold'}>{selected?.isRead ? 'Read' : 'New'}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Message">
              <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>{getMessagePreview(selected)}</Paragraph>
            </Descriptions.Item>
            <Descriptions.Item label="Received">
              {selected?.createdAt ? new Date(selected.createdAt).toLocaleString('en-IN') : 'N/A'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </div>
  );
};

export default ContactMessagesView;
