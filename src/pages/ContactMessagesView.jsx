import { useCallback, useEffect, useMemo, useState } from 'react';
import { Avatar, Button, Card, Col, Descriptions, Drawer, Input, Row, Space, Statistic, Table, Tag, Typography, message } from 'antd';
import { MdEmail, MdMail, MdRefresh, MdVisibility } from 'react-icons/md';
import { adminAPI } from '../services/api';
import { getUserEmail, getUserName, getUserPhone } from '../utils/adminRecords';

const { Search, TextArea } = Input;
const { Text } = Typography;

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

  const stats = useMemo(() => ({
    total: items.length,
    withEmail: items.filter((item) => item?.email).length,
    withPhone: items.filter((item) => item?.phone).length,
    companies: items.filter((item) => item?.companyName).length,
  }), [items]);

  const columns = useMemo(
    () => [
      {
        title: 'Name',
        key: 'from',
        width: 260,
        render: (_, record) => (
          <Space>
            <Avatar icon={<MdMail />} className="admin-avatar" />
            <div className="admin-table-title">{getUserName(record)}</div>
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
        title: 'Phone',
        key: 'phone',
        width: 180,
        render: (_, record) => getUserPhone(record),
      },
      {
        title: 'Type',
        key: 'role',
        width: 160,
        render: (_, record) => <Tag color={record?.role === 'admin' ? 'geekblue' : 'default'}>{record?.role || 'contact'}</Tag>,
      },
      {
        title: 'Company / City',
        key: 'meta',
        width: 220,
        render: (_, record) => record?.companyName || record?.city || 'N/A',
      },
      {
        title: 'Source',
        key: 'sourceLabel',
        width: 220,
        render: (_, record) => record?.sourceLabel || 'N/A',
      },
      {
        title: 'Received',
        dataIndex: 'updatedAt',
        key: 'updatedAt',
        width: 190,
        render: (value, record) => {
          const timestamp = value || record?.createdAt;
          return timestamp ? new Date(timestamp).toLocaleString('en-IN') : 'N/A';
        },
      },
      {
        title: 'Actions',
        key: 'actions',
        width: 120,
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
          </Space>
        ),
      },
    ],
    []
  );

  const handleSearch = (value) => {
    const newFilters = { ...filters, search: value ? String(value).trim() : '' };
    setFilters(newFilters);
    fetchItems(1, pagination.pageSize, newFilters);
  };

  return (
    <div>
      <div className="page-header page-header-row">
        <h1>All Contacts</h1>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={12} lg={8}>
          <Card className="admin-surface-card" size="small">
            <Statistic title="Total Contacts" value={stats.total} prefix={<MdMail />} />
          </Card>
        </Col>
        <Col xs={12} sm={12} lg={8}>
          <Card className="admin-surface-card" size="small">
            <Statistic title="With Email" value={stats.withEmail} />
          </Card>
        </Col>
        <Col xs={12} sm={12} lg={8}>
          <Card className="admin-surface-card" size="small">
            <Statistic title="With Phone" value={stats.withPhone} />
          </Card>
        </Col>
      </Row>

      <Card className="admin-surface-card" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Search
            placeholder="Search by name, email, phone, city, company, or source"
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
          locale={{ emptyText: 'No contact information found.' }}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
                showTotal: (total) => `Total ${total} contacts`,
          }}
          onChange={(nextPagination) => fetchItems(nextPagination.current, nextPagination.pageSize, filters)}
          scroll={{ x: 1600 }}
        />
      </Card>

      <Drawer
        title={selected ? `Contact - ${getUserName(selected)}` : ''}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={620}
      >
        {selected && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="ID">
              <Text code copyable={{ text: String(selected.recordId || selected._id) }}>
                {String(selected.recordId || selected._id)}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Name">{getUserName(selected)}</Descriptions.Item>
            <Descriptions.Item label="Email">{getUserEmail(selected)}</Descriptions.Item>
            <Descriptions.Item label="Phone">{getUserPhone(selected)}</Descriptions.Item>
            <Descriptions.Item label="Type">{selected?.role || 'contact'}</Descriptions.Item>
            <Descriptions.Item label="Company">{selected?.companyName || selected?.subject || 'N/A'}</Descriptions.Item>
            <Descriptions.Item label="City">{selected?.city || 'N/A'}</Descriptions.Item>
            <Descriptions.Item label="Source">{selected?.sourceLabel || 'N/A'}</Descriptions.Item>
            <Descriptions.Item label="Message">{selected?.message || 'N/A'}</Descriptions.Item>
            <Descriptions.Item label="Updated">
              {selected?.updatedAt || selected?.createdAt
                ? new Date(selected.updatedAt || selected.createdAt).toLocaleString('en-IN')
                : 'N/A'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </div>
  );
};

export default ContactMessagesView;
