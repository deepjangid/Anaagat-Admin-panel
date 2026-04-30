import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Button,
  Card,
  Col,
  Descriptions,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Space,
  Statistic,
  Table,
  Typography,
  message,
} from 'antd';
import { MdAdd, MdBusiness, MdDelete, MdEdit, MdRefresh, MdVisibility } from 'react-icons/md';
import { adminAPI } from '../services/api';
import { getCompanyName, getUserCity, getUserEmail, getUserPhone } from '../utils/adminRecords';
import { buildRecordDetails } from '../utils/recordDetails';

const { Search, TextArea } = Input;
const { Link } = Typography;
const hiddenKeys = ['_id', '__v'];

const buildClientPayload = (values) => ({
  companyName: String(values.companyName || '').trim(),
  company: String(values.companyName || '').trim(),
  name: String(values.contactName || '').trim(),
  contactName: String(values.contactName || '').trim(),
  email: String(values.email || '').trim().toLowerCase(),
  phone: String(values.phone || '').trim(),
  mobile: String(values.phone || '').trim(),
  location: String(values.location || '').trim(),
  city: String(values.location || '').trim(),
  website: String(values.website || '').trim(),
  industry: String(values.industry || '').trim(),
  requirements: String(values.requirements || '').trim(),
  description: String(values.requirements || '').trim(),
});

const ClientProfilesView = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ search: '' });
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [form] = Form.useForm();

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

  const handleOpenDetails = useCallback((record) => {
    setSelectedRecord(record);
    setDetailsOpen(true);
  }, []);

  const handleOpenEditor = useCallback((record = null) => {
    setEditingRecord(record);
    if (record) {
      form.setFieldsValue({
        companyName: record?.companyName || record?.company || '',
        contactName: record?.contactName || record?.name || '',
        email: record?.email || '',
        phone: record?.phone || record?.mobile || '',
        location: record?.location || record?.city || '',
        website: record?.website || '',
        industry: record?.industry || '',
        requirements: record?.requirements || record?.description || '',
      });
    } else {
      form.resetFields();
    }
    setEditorOpen(true);
  }, [form]);

  const handleCloseEditor = useCallback(() => {
    setEditorOpen(false);
    setEditingRecord(null);
    form.resetFields();
  }, [form]);

  const handleSave = useCallback(async (values) => {
    setSaving(true);
    try {
      const payload = buildClientPayload(values);
      const res = editingRecord?._id
        ? await adminAPI.updateClientProfile(editingRecord._id, payload)
        : await adminAPI.createClientProfile(payload);

      if (res.data.success) {
        message.success(editingRecord?._id ? 'Client profile updated.' : 'Client profile created.');
        handleCloseEditor();
        fetchItems(editingRecord ? pagination.current : 1, pagination.pageSize, filters);
      } else {
        message.error('Save failed.');
      }
    } catch (error) {
      console.error(error);
      message.error(error?.response?.data?.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  }, [editingRecord, fetchItems, filters, handleCloseEditor, pagination]);

  const stats = useMemo(() => ({
    total: pagination.total,
    withEmail: items.filter((item) => item?.email).length,
    withPhone: items.filter((item) => item?.phone || item?.mobile).length,
    withWebsite: items.filter((item) => item?.website).length,
  }), [items, pagination.total]);

  const columns = useMemo(
    () => [
      {
        title: 'Client',
        key: 'company',
        width: 280,
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
        title: 'Contact',
        key: 'contact',
        width: 170,
        render: (_, record) => record?.contactName || record?.name || 'N/A',
      },
      {
        title: 'Phone',
        key: 'phone',
        width: 160,
        render: (_, record) => getUserPhone(record),
      },
      {
        title: 'Location',
        key: 'location',
        width: 170,
        render: (_, record) => getUserCity(record),
      },
      {
        title: 'Website',
        key: 'website',
        width: 180,
        render: (_, record) => record?.website || 'N/A',
      },
      {
        title: 'Industry',
        key: 'industry',
        width: 150,
        render: (_, record) => record?.industry || 'N/A',
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
        width: 230,
        render: (_, record) => (
          <Space>
            <Button size="small" icon={<MdVisibility />} onClick={() => handleOpenDetails(record)}>
              View
            </Button>
            <Button size="small" icon={<MdEdit />} onClick={() => handleOpenEditor(record)}>
              Edit
            </Button>
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
    ],
    [handleDelete, handleOpenDetails, handleOpenEditor]
  );

  const handleSearch = (value) => {
    const newFilters = { ...filters, search: value ? String(value).trim() : '' };
    setFilters(newFilters);
    fetchItems(1, pagination.pageSize, newFilters);
  };

  return (
    <div>
      <div className="page-header page-header-row">
        <h1>Client Profiles</h1>
        <Button type="primary" icon={<MdAdd />} onClick={() => handleOpenEditor()}>
          Add Client
        </Button>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={12} lg={6}>
          <Card className="admin-surface-card" size="small">
            <Statistic title="Total Clients" value={stats.total} prefix={<MdBusiness />} />
          </Card>
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <Card className="admin-surface-card" size="small">
            <Statistic title="With Email" value={stats.withEmail} />
          </Card>
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <Card className="admin-surface-card" size="small">
            <Statistic title="With Phone" value={stats.withPhone} />
          </Card>
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <Card className="admin-surface-card" size="small">
            <Statistic title="With Website" value={stats.withWebsite} />
          </Card>
        </Col>
      </Row>

      <Card className="admin-surface-card" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Search
            placeholder="Search by company, contact, email, phone, location, or paste _id"
            onSearch={handleSearch}
            style={{ width: 380 }}
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
            showTotal: (total) => `Total ${total} clients`,
          }}
          onChange={(nextPagination) => fetchItems(nextPagination.current, nextPagination.pageSize, filters)}
          scroll={{ x: 1500 }}
        />
      </Card>

      <Modal
        title={editingRecord ? `Edit Client: ${getCompanyName(editingRecord)}` : 'Add Client'}
        open={editorOpen}
        onCancel={handleCloseEditor}
        footer={null}
        width={760}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Company Name" name="companyName" rules={[{ required: true, message: 'Please enter company name' }]}>
                <Input placeholder="Company name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Contact Name" name="contactName">
                <Input placeholder="Primary contact name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Email" name="email" rules={[{ required: true, message: 'Please enter email' }]}>
                <Input placeholder="contact@company.com" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Phone" name="phone">
                <Input placeholder="Phone number" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Location" name="location">
                <Input placeholder="City or location" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Website" name="website">
                <Input placeholder="https://company.com" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="Industry" name="industry">
                <Input placeholder="Industry or business domain" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="Requirements / Notes" name="requirements">
                <TextArea rows={4} placeholder="Client requirement summary or notes" />
              </Form.Item>
            </Col>
          </Row>
          <Space>
            <Button type="primary" htmlType="submit" loading={saving}>
              {editingRecord ? 'Update Client' : 'Create Client'}
            </Button>
            <Button onClick={handleCloseEditor}>Cancel</Button>
          </Space>
        </Form>
      </Modal>

      <Modal
        title={selectedRecord ? `Client Details: ${getCompanyName(selectedRecord)}` : 'Client Details'}
        open={detailsOpen}
        onCancel={() => {
          setDetailsOpen(false);
          setSelectedRecord(null);
        }}
        footer={null}
        width={900}
      >
        {selectedRecord ? (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Card size="small" title="Client Overview">
              <Descriptions bordered size="small" column={2}>
                <Descriptions.Item label="Company">{getCompanyName(selectedRecord)}</Descriptions.Item>
                <Descriptions.Item label="Contact">{selectedRecord?.contactName || selectedRecord?.name || 'N/A'}</Descriptions.Item>
                <Descriptions.Item label="Email">{getUserEmail(selectedRecord)}</Descriptions.Item>
                <Descriptions.Item label="Phone">{getUserPhone(selectedRecord)}</Descriptions.Item>
                <Descriptions.Item label="Location">{getUserCity(selectedRecord)}</Descriptions.Item>
                <Descriptions.Item label="Industry">{selectedRecord?.industry || 'N/A'}</Descriptions.Item>
                <Descriptions.Item label="Website">
                  {selectedRecord?.website ? (
                    <Link href={selectedRecord.website} target="_blank" rel="noreferrer">
                      {selectedRecord.website}
                    </Link>
                  ) : 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Created">
                  {selectedRecord?.createdAt ? new Date(selectedRecord.createdAt).toLocaleString('en-IN') : 'N/A'}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <Card size="small" title="All Client Data">
              <Descriptions bordered size="small" column={2}>
                {buildRecordDetails(selectedRecord, hiddenKeys).map((item) => (
                  <Descriptions.Item key={item.key} label={item.label}>
                    {String(item.value).startsWith('http://') || String(item.value).startsWith('https://') ? (
                      <Link href={String(item.value)} target="_blank" rel="noreferrer">
                        {String(item.value)}
                      </Link>
                    ) : (
                      item.value
                    )}
                  </Descriptions.Item>
                ))}
              </Descriptions>
            </Card>
          </Space>
        ) : null}
      </Modal>
    </div>
  );
};

export default ClientProfilesView;
