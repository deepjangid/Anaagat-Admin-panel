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
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { MdAdd, MdDelete, MdDescription, MdEdit, MdPerson, MdRefresh, MdVisibility } from 'react-icons/md';
import { adminAPI, applicationsAPI } from '../services/api';
import { getUserCity, getUserEmail, getUserName, getUserPhone } from '../utils/adminRecords';
import { buildRecordDetails } from '../utils/recordDetails';

const { Search } = Input;
const { Link, Text } = Typography;
const { Option } = Select;
const hiddenKeys = ['_id', '__v'];
const EMPTY = 'N/A';

const getPreferenceValue = (record) =>
  record?.preferences ||
  record?.preference ||
  record?.jobPreferences ||
  record?.candidatePreferences ||
  record?.preferredLocation ||
  record?.currentLocation ||
  null;

const formatValue = (value) => {
  if (value === null || value === undefined || value === '') return EMPTY;
  if (Array.isArray(value)) return value.length ? value.join(', ') : EMPTY;
  if (typeof value === 'object') return JSON.stringify(value);
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
};

const buildPreferenceItems = (record) => {
  const preferences = getPreferenceValue(record);

  if (!preferences || typeof preferences !== 'object' || Array.isArray(preferences)) {
    return [{ label: 'Preferences', value: formatValue(preferences) }];
  }

  return [
    { label: 'Preferred Location', value: formatValue(preferences.preferredLocation) },
    { label: 'Preferred Industry', value: formatValue(preferences.preferredIndustry) },
    { label: 'Preferred Role', value: formatValue(preferences.preferredRole) },
    { label: 'Work Modes', value: formatValue(preferences.workModes) },
  ].filter((item) => item.value !== EMPTY);
};

const getPreferredLocation = (record) =>
  record?.preferredLocation ||
  record?.currentLocation ||
  getPreferenceValue(record)?.preferredLocation ||
  EMPTY;

const getPreferredIndustry = (record) =>
  record?.preferredIndustry ||
  getPreferenceValue(record)?.preferredIndustry ||
  EMPTY;

const getPreferredRole = (record) =>
  record?.preferredRole ||
  record?.desiredRole ||
  record?.jobRole ||
  getPreferenceValue(record)?.preferredRole ||
  EMPTY;

const getWorkModes = (record) => {
  const value =
    record?.workModes ||
    record?.workMode ||
    getPreferenceValue(record)?.workModes ||
    getPreferenceValue(record)?.workMode;

  if (Array.isArray(value)) return value.length ? value.join(', ') : EMPTY;
  return formatValue(value);
};

const buildCandidatePayload = (values) => {
  const workModes = Array.isArray(values.workModes)
    ? values.workModes.map((item) => String(item).trim()).filter(Boolean)
    : [];

  return {
    fullName: String(values.fullName || '').trim(),
    name: String(values.fullName || '').trim(),
    email: String(values.email || '').trim().toLowerCase(),
    phone: String(values.phone || '').trim(),
    mobile: String(values.phone || '').trim(),
    currentCity: String(values.currentCity || '').trim(),
    city: String(values.currentCity || '').trim(),
    isActive: values.isActive !== false,
    preferredLocation: String(values.preferredLocation || '').trim(),
    preferredIndustry: String(values.preferredIndustry || '').trim(),
    preferredRole: String(values.preferredRole || '').trim(),
    workModes,
    summary: String(values.summary || '').trim(),
    about: String(values.summary || '').trim(),
    resumePath: String(values.resumePath || '').trim(),
    preferences: {
      preferredLocation: String(values.preferredLocation || '').trim(),
      preferredIndustry: String(values.preferredIndustry || '').trim(),
      preferredRole: String(values.preferredRole || '').trim(),
      workModes,
    },
  };
};

const CandidateProfilesView = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [resumeRecord, setResumeRecord] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [filters, setFilters] = useState({ search: '' });
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [form] = Form.useForm();

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

  const findMatchingResume = useCallback(async (record) => {
    const email = String(record?.email || '').trim().toLowerCase();
    const phone = String(record?.phone || record?.mobile || '').trim();
    const queries = [email, phone].filter(Boolean);

    if (!queries.length) {
      setResumeRecord(null);
      return;
    }

    setResumeLoading(true);
    try {
      let matchedResume = null;

      for (const query of queries) {
        const res = await applicationsAPI.getAll({ page: 1, limit: 20, hasResume: true, search: query });
        const applications = Array.isArray(res?.data?.applications) ? res.data.applications : [];

        matchedResume =
          applications.find((item) => String(item?.email || '').trim().toLowerCase() === email) ||
          applications.find((item) => String(item?.phone || '').trim() === phone) ||
          applications[0] ||
          null;

        if (matchedResume) break;
      }

      setResumeRecord(matchedResume);
    } catch (error) {
      console.error(error);
      setResumeRecord(null);
      message.error(error?.response?.data?.message || 'Failed to fetch resume details.');
    } finally {
      setResumeLoading(false);
    }
  }, []);

  const handleOpenDetails = useCallback((record) => {
    setSelectedRecord(record);
    setDetailsOpen(true);
    setResumeRecord(null);
    findMatchingResume(record);
  }, [findMatchingResume]);

  const handleCloseDetails = useCallback(() => {
    setDetailsOpen(false);
    setSelectedRecord(null);
    setResumeRecord(null);
    setResumeLoading(false);
  }, []);

  const handleOpenEditor = useCallback((record = null) => {
    setEditingRecord(record);
    if (record) {
      form.setFieldsValue({
        fullName: record?.fullName || record?.name || '',
        email: record?.email || '',
        phone: record?.phone || record?.mobile || '',
        currentCity: record?.currentCity || record?.city || record?.location || '',
        preferredLocation: record?.preferredLocation || getPreferenceValue(record)?.preferredLocation || '',
        preferredIndustry: record?.preferredIndustry || getPreferenceValue(record)?.preferredIndustry || '',
        preferredRole: record?.preferredRole || record?.desiredRole || getPreferenceValue(record)?.preferredRole || '',
        workModes: record?.workModes || getPreferenceValue(record)?.workModes || [],
        summary: record?.summary || record?.about || '',
        resumePath: record?.resumePath || '',
        isActive: record?.isActive !== false,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ isActive: true, workModes: [] });
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
      const payload = buildCandidatePayload(values);
      const res = editingRecord?._id
        ? await adminAPI.updateCandidateProfile(editingRecord._id, payload)
        : await adminAPI.createCandidateProfile(payload);

      if (res.data.success) {
        message.success(editingRecord?._id ? 'Candidate profile updated.' : 'Candidate profile created.');
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
    total: items.length,
    active: items.filter((item) => item?.isActive !== false).length,
    withResume: items.filter((item) => item?.resumePath).length,
    withPreferences: items.filter((item) =>
      [getPreferredLocation(item), getPreferredIndustry(item), getPreferredRole(item), getWorkModes(item)].some((value) => value !== EMPTY)
    ).length,
  }), [items]);

  const columns = useMemo(
    () => [
      {
        title: 'Candidate',
        key: 'name',
        width: 260,
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
        title: 'Preferred Role',
        key: 'preferredRole',
        width: 170,
        render: (_, record) => getPreferredRole(record),
      },
      {
        title: 'Preferred Location',
        key: 'preferredLocation',
        width: 170,
        render: (_, record) => getPreferredLocation(record),
      },
      {
        title: 'Phone',
        key: 'phone',
        width: 140,
        render: (_, record) => getUserPhone(record),
      },
      {
        title: 'Work Mode',
        key: 'workMode',
        width: 150,
        render: (_, record) => getWorkModes(record),
      },
      {
        title: 'Updated',
        dataIndex: 'updatedAt',
        key: 'updatedAt',
        width: 170,
        render: (value) => (value ? new Date(value).toLocaleString('en-IN') : 'N/A'),
      },
      {
        title: 'Resume',
        key: 'resume',
        width: 110,
        render: (_, record) => (
          <Tag color={record?.resumePath ? 'green' : 'default'}>
            {record?.resumePath ? 'Linked' : 'Missing'}
          </Tag>
        ),
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
        <h1>Candidate Profiles</h1>
        <Button type="primary" icon={<MdAdd />} onClick={() => handleOpenEditor()}>
          Add Candidate
        </Button>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={12} lg={6}>
          <Card className="admin-surface-card" size="small">
            <Statistic title="Total Profiles" value={stats.total} prefix={<MdPerson />} />
          </Card>
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <Card className="admin-surface-card" size="small">
            <Statistic title="Active Profiles" value={stats.active} />
          </Card>
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <Card className="admin-surface-card" size="small">
            <Statistic title="With Preferences" value={stats.withPreferences} />
          </Card>
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <Card className="admin-surface-card" size="small">
            <Statistic title="Resume Linked" value={stats.withResume} />
          </Card>
        </Col>
      </Row>

      <Card className="admin-surface-card" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Search
            placeholder="Search by name, email, phone, city, role, or paste _id"
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
            showTotal: (total) => `Total ${total} profiles`,
          }}
          onChange={(nextPagination) => fetchItems(nextPagination.current, nextPagination.pageSize, filters)}
          scroll={{ x: 1500 }}
        />
      </Card>

      <Modal
        title={editingRecord ? `Edit Candidate: ${getUserName(editingRecord)}` : 'Add Candidate'}
        open={editorOpen}
        onCancel={handleCloseEditor}
        footer={null}
        width={760}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Full Name" name="fullName" rules={[{ required: true, message: 'Please enter full name' }]}>
                <Input placeholder="Candidate full name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Email" name="email" rules={[{ required: true, message: 'Please enter email' }]}>
                <Input placeholder="name@example.com" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Phone" name="phone">
                <Input placeholder="Phone number" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Current City" name="currentCity">
                <Input placeholder="Current city" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Preferred Role" name="preferredRole">
                <Input placeholder="Preferred role" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Preferred Industry" name="preferredIndustry">
                <Input placeholder="Preferred industry" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Preferred Location" name="preferredLocation">
                <Input placeholder="Preferred location" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Work Modes" name="workModes">
                <Select mode="multiple" placeholder="Select work modes">
                  <Option value="Remote">Remote</Option>
                  <Option value="Hybrid">Hybrid</Option>
                  <Option value="On-site">On-site</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Resume Link" name="resumePath">
                <Input placeholder="https://..." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Status" name="isActive" initialValue={true}>
                <Select>
                  <Option value>Active</Option>
                  <Option value={false}>Inactive</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="Summary" name="summary">
                <Input.TextArea rows={4} placeholder="Short candidate summary" />
              </Form.Item>
            </Col>
          </Row>
          <Space>
            <Button type="primary" htmlType="submit" loading={saving}>
              {editingRecord ? 'Update Candidate' : 'Create Candidate'}
            </Button>
            <Button onClick={handleCloseEditor}>Cancel</Button>
          </Space>
        </Form>
      </Modal>

      <Modal
        title={selectedRecord ? `Candidate Details: ${getUserName(selectedRecord)}` : 'Candidate Details'}
        open={detailsOpen}
        onCancel={handleCloseDetails}
        footer={null}
        width={960}
      >
        {selectedRecord ? (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Card size="small" title="Candidate Overview">
              <Descriptions bordered size="small" column={2}>
                <Descriptions.Item label="Name">{getUserName(selectedRecord)}</Descriptions.Item>
                <Descriptions.Item label="Email">{getUserEmail(selectedRecord)}</Descriptions.Item>
                <Descriptions.Item label="Phone">{getUserPhone(selectedRecord)}</Descriptions.Item>
                <Descriptions.Item label="City">{getUserCity(selectedRecord)}</Descriptions.Item>
                <Descriptions.Item label="Preferred Role">{getPreferredRole(selectedRecord)}</Descriptions.Item>
                <Descriptions.Item label="Preferred Industry">{getPreferredIndustry(selectedRecord)}</Descriptions.Item>
                <Descriptions.Item label="Preferred Location">{getPreferredLocation(selectedRecord)}</Descriptions.Item>
                <Descriptions.Item label="Work Modes">{getWorkModes(selectedRecord)}</Descriptions.Item>
                <Descriptions.Item label="Updated">
                  {selectedRecord?.updatedAt ? new Date(selectedRecord.updatedAt).toLocaleString('en-IN') : EMPTY}
                </Descriptions.Item>
                <Descriptions.Item label="Status">
                  {selectedRecord?.isActive === undefined ? 'Unknown' : selectedRecord.isActive === false ? 'Inactive' : 'Active'}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <Card size="small" title="Preferences">
              <Descriptions bordered size="small" column={2}>
                {(buildPreferenceItems(selectedRecord).length
                  ? buildPreferenceItems(selectedRecord)
                  : [{ label: 'Preferences', value: EMPTY }]
                ).map((item) => (
                  <Descriptions.Item key={item.label} label={item.label}>
                    {item.value}
                  </Descriptions.Item>
                ))}
              </Descriptions>
            </Card>

            <Card size="small" title="Resume">
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                {resumeRecord ? (
                  <>
                    <Text>
                      Resume found for{' '}
                      <Text strong>{resumeRecord?.fullName || resumeRecord?.email || getUserName(selectedRecord)}</Text>
                    </Text>
                    <Text type="secondary">
                      Application ID: {resumeRecord?._id || 'N/A'}
                    </Text>
                    <Button
                      type="primary"
                      icon={<MdDescription />}
                      onClick={() =>
                        applicationsAPI.downloadResume(
                          resumeRecord._id,
                          resumeRecord.fullName || resumeRecord.email || getUserName(selectedRecord)
                        )
                      }
                    >
                      Download Resume
                    </Button>
                  </>
                ) : (
                  <Text type="secondary">
                    {resumeLoading
                      ? 'Checking for a matching resume...'
                      : 'No linked resume was found for this candidate profile.'}
                  </Text>
                )}
                {!resumeRecord && selectedRecord?.resumePath ? (
                  <Link href={selectedRecord.resumePath} target="_blank" rel="noreferrer">
                    Open Resume Link
                  </Link>
                ) : null}
              </Space>
            </Card>

            <Card size="small" title="All Candidate Data">
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

export default CandidateProfilesView;
