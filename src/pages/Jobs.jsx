import { useMemo, useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  DatePicker,
  message,
  Popconfirm,
  Typography,
} from 'antd';
import { MdAdd, MdEdit, MdDelete, MdVisibility } from 'react-icons/md';
import { jobsAPI } from '../services/api';
import moment from 'moment';

const { TextArea } = Input;
const { Search } = Input;
const { Option } = Select;
const { Text } = Typography;

const normalizeCode = (value, maxLen) => {
  const cleaned = String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '');
  if (!cleaned) return 'NA';
  return cleaned.slice(0, maxLen);
};

const getShortId = (id) => {
  const value = String(id || '');
  if (!value) return '—';
  return value.length > 8 ? value.slice(-8) : value;
};

const getJobPublicId = (job) => {
  const suffix = getShortId(job?._id);
  const company = normalizeCode(job?.company, 3);
  const location = normalizeCode(job?.location, 3);
  const type = normalizeCode(job?.type, 2);
  const category = normalizeCode(job?.category, 3);
  return `JOB-${company}-${location}-${type}-${category}-${suffix}`;
};

const Jobs = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    company: '',
    location: '',
    type: '',
    category: '',
  });
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [form] = Form.useForm();

  // Fetch jobs
  const fetchJobs = async (page = 1, pageSize = 10) => {
    setLoading(true);
    try {
      const response = await jobsAPI.getAll({
        page,
        limit: pageSize,
      });

      if (response.data.success) {
        setJobs(response.data.jobs);
        setPagination({
          current: response.data.currentPage,
          pageSize: pageSize,
          total: response.data.total ?? (Array.isArray(response.data.jobs) ? response.data.jobs.length : 0),
        });
      }
    } catch (error) {
      console.error('Fetch Jobs Error:', error);
      message.error('Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const filteredJobs = useMemo(() => {
    const search = String(filters.search || '').trim();
    const searchLower = search.toLowerCase();
    const isObjectIdSearch = /^[a-fA-F0-9]{24}$/.test(search);

    const companyFilter = String(filters.company || '').trim().toLowerCase();
    const locationFilter = String(filters.location || '').trim().toLowerCase();
    const typeFilter = String(filters.type || '').trim().toLowerCase();
    const categoryFilter = String(filters.category || '').trim().toLowerCase();

    return (jobs || []).filter((job) => {
      if (!job) return false;

      if (companyFilter) {
        const v = String(job.company || '').toLowerCase();
        if (!v.includes(companyFilter)) return false;
      }
      if (locationFilter) {
        const v = String(job.location || '').toLowerCase();
        if (!v.includes(locationFilter)) return false;
      }
      if (typeFilter) {
        const v = String(job.type || '').toLowerCase();
        if (!v.includes(typeFilter)) return false;
      }
      if (categoryFilter) {
        const v = String(job.category || '').toLowerCase();
        if (!v.includes(categoryFilter)) return false;
      }

      if (!search) return true;

      if (isObjectIdSearch) return String(job._id || '') === search;

      const haystack = [
        getJobPublicId(job),
        job.title,
        job.company,
        job.location,
        job.type,
        job.category,
        job.status,
      ]
        .filter(Boolean)
        .map((v) => String(v).toLowerCase())
        .join(' | ');

      return haystack.includes(searchLower);
    });
  }, [filters, jobs]);

  const filterOptions = useMemo(() => {
    const uniq = (arr) => Array.from(new Set(arr.filter(Boolean).map((v) => String(v).trim()).filter(Boolean))).sort();
    return {
      companies: uniq((jobs || []).map((j) => j?.company)),
      locations: uniq((jobs || []).map((j) => j?.location)),
      types: uniq((jobs || []).map((j) => j?.type)),
      categories: uniq((jobs || []).map((j) => j?.category)),
    };
  }, [jobs]);

  // Handle table change (pagination, sorting, filtering)
  const handleTableChange = (newPagination) => {
    setPagination((prev) => ({
      ...prev,
      current: newPagination.current,
      pageSize: newPagination.pageSize,
    }));
  };

  // Open modal for create/edit
  const openModal = (job = null) => {
    setEditingJob(job);
    setIsModalOpen(true);
    
    if (job) {
      form.setFieldsValue({
        ...job,
        applicationDeadline: job.applicationDeadline ? moment(job.applicationDeadline) : null,
      });
    } else {
      form.resetFields();
    }
  };

  // Close modal
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingJob(null);
    form.resetFields();
  };

  // Handle form submit
  const handleSubmit = async (values) => {
    try {
      const jobData = {
        ...values,
        applicationDeadline: values.applicationDeadline
          ? values.applicationDeadline.toISOString()
          : null,
      };

      if (editingJob) {
        // Update existing job
        const response = await jobsAPI.update(editingJob._id, jobData);
        if (response.data.success) {
          message.success('Job updated successfully!');
          fetchJobs(pagination.current, pagination.pageSize);
          closeModal();
        }
      } else {
        // Create new job
        const response = await jobsAPI.create(jobData);
        if (response.data.success) {
          message.success('Job created successfully!');
          fetchJobs(1, pagination.pageSize);
          closeModal();
        }
      }
    } catch (error) {
      console.error('Submit Error:', error);
      message.error(error.response?.data?.message || 'Operation failed');
    }
  };

  // Handle delete
  const handleDelete = async (id) => {
    try {
      const response = await jobsAPI.delete(id);
      if (response.data.success) {
        message.success('Job deleted successfully!');
        fetchJobs(pagination.current, pagination.pageSize);
      }
    } catch (error) {
      console.error('Delete Error:', error);
      message.error('Failed to delete job');
    }
  };

  const columns = [
    {
      title: 'Job ID',
      key: 'publicId',
      width: 220,
      render: (_, record) => {
        const publicId = getJobPublicId(record);
        return (
          <Text code copyable={{ text: publicId }}>
            {publicId}
          </Text>
        );
      },
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      width: 200,
    },
    {
      title: 'Company',
      dataIndex: 'company',
      key: 'company',
      width: 150,
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
      width: 150,
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type) => <Tag color="blue">{type}</Tag>,
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      width: 120,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => (
        <Tag color={status === 'Active' ? 'green' : status === 'Closed' ? 'red' : 'default'}>
          {status}
        </Tag>
      ),
    },
    {
      title: 'Views',
      dataIndex: 'viewCount',
      key: 'viewCount',
      width: 80,
      render: (count) => (
        <Space>
          <MdVisibility />
          {count}
        </Space>
      ),
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
      width: 150,
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            icon={<MdEdit />}
            size="small"
            onClick={() => openModal(record)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Delete this job?"
            description="Are you sure you want to delete this job?"
            onConfirm={() => handleDelete(record._id)}
            okText="Yes"
            cancelText="No"
          >
            <Button danger icon={<MdDelete />} size="small">
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div
        className="page-header"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <h1>Job Requirements</h1>
        <Button type="primary" icon={<MdAdd />} onClick={() => openModal()}>
          Add New Job
        </Button>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Search
            placeholder="Search by Job ID/title/company/location/type/category or paste _id"
            onSearch={(value) => {
              setFilters((prev) => ({ ...prev, search: value ? String(value).trim() : '' }));
              setPagination((prev) => ({ ...prev, current: 1 }));
            }}
            onChange={(e) => {
              const value = e?.target?.value ?? '';
              if (value !== '') return;
              setFilters((prev) => ({ ...prev, search: '' }));
              setPagination((prev) => ({ ...prev, current: 1 }));
            }}
            allowClear
            style={{ width: 420 }}
          />
          <Select
            value={filters.company || undefined}
            placeholder="Company"
            allowClear
            showSearch
            optionFilterProp="label"
            style={{ width: 200 }}
            options={filterOptions.companies.map((v) => ({ value: v, label: v }))}
            onChange={(value) => {
              setFilters((prev) => ({ ...prev, company: value || '' }));
              setPagination((prev) => ({ ...prev, current: 1 }));
            }}
          />
          <Select
            value={filters.location || undefined}
            placeholder="Location"
            allowClear
            showSearch
            optionFilterProp="label"
            style={{ width: 200 }}
            options={filterOptions.locations.map((v) => ({ value: v, label: v }))}
            onChange={(value) => {
              setFilters((prev) => ({ ...prev, location: value || '' }));
              setPagination((prev) => ({ ...prev, current: 1 }));
            }}
          />
          <Select
            value={filters.type || undefined}
            placeholder="Type"
            allowClear
            showSearch
            optionFilterProp="label"
            style={{ width: 160 }}
            options={filterOptions.types.map((v) => ({ value: v, label: v }))}
            onChange={(value) => {
              setFilters((prev) => ({ ...prev, type: value || '' }));
              setPagination((prev) => ({ ...prev, current: 1 }));
            }}
          />
          <Select
            value={filters.category || undefined}
            placeholder="Category"
            allowClear
            showSearch
            optionFilterProp="label"
            style={{ width: 200 }}
            options={filterOptions.categories.map((v) => ({ value: v, label: v }))}
            onChange={(value) => {
              setFilters((prev) => ({ ...prev, category: value || '' }));
              setPagination((prev) => ({ ...prev, current: 1 }));
            }}
          />
          <Button
            onClick={() => {
              setFilters({ search: '', company: '', location: '', type: '', category: '' });
              setPagination((prev) => ({ ...prev, current: 1 }));
            }}
          >
            Clear Filters
          </Button>
        </Space>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={filteredJobs}
          rowKey="_id"
          loading={loading}
          pagination={{
            ...pagination,
            total: filteredJobs.length,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total) => `Total ${total} jobs`,
          }}
          onChange={handleTableChange}
          scroll={{ x: 1700 }}
        />
      </Card>

      <Modal
        title={editingJob ? 'Edit Job' : 'Add New Job'}
        open={isModalOpen}
        onCancel={closeModal}
        footer={null}
        width={800}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label="Job Title"
            name="title"
            rules={[{ required: true, message: 'Please enter job title' }]}
          >
            <Input placeholder="e.g., Senior Frontend Developer" />
          </Form.Item>

          <Form.Item
            label="Company"
            name="company"
            rules={[{ required: true, message: 'Please enter company name' }]}
          >
            <Input placeholder="e.g., Tech Corp" />
          </Form.Item>

          <Form.Item
            label="Location"
            name="location"
            rules={[{ required: true, message: 'Please enter location' }]}
          >
            <Input placeholder="e.g., New York, NY / Remote" />
          </Form.Item>

          <Form.Item
            label="Job Type"
            name="type"
            rules={[{ required: true, message: 'Please select job type' }]}
          >
            <Select placeholder="Select job type">
              <Option value="Full-time">Full-time</Option>
              <Option value="Part-time">Part-time</Option>
              <Option value="Contract">Contract</Option>
              <Option value="Freelance">Freelance</Option>
              <Option value="Internship">Internship</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Experience Level"
            name="experience"
            rules={[{ required: true, message: 'Please enter experience level' }]}
          >
            <Input placeholder="e.g., 3-5 years" />
          </Form.Item>

          <Form.Item
            label="Category"
            name="category"
            rules={[{ required: true, message: 'Please enter category' }]}
          >
            <Input placeholder="e.g., Software Development, Marketing" />
          </Form.Item>

          <Form.Item label="Salary Range">
            <Space>
              <Form.Item name={['salary', 'min']} noStyle>
                <InputNumber placeholder="Min" style={{ width: 150 }} />
              </Form.Item>
              <span>to</span>
              <Form.Item name={['salary', 'max']} noStyle>
                <InputNumber placeholder="Max" style={{ width: 150 }} />
              </Form.Item>
              <Form.Item name={['salary', 'currency']} noStyle initialValue="USD">
                <Select style={{ width: 100 }}>
                  <Option value="USD">USD</Option>
                  <Option value="EUR">EUR</Option>
                  <Option value="GBP">GBP</Option>
                  <Option value="INR">INR</Option>
                </Select>
              </Form.Item>
            </Space>
          </Form.Item>

          <Form.Item
            label="Job Description"
            name="description"
            rules={[{ required: true, message: 'Please enter job description' }]}
          >
            <TextArea rows={4} placeholder="Enter detailed job description" />
          </Form.Item>

          <Form.Item
            label="Requirements (one per line)"
            name="requirements"
            getValueFromEvent={(e) => e.target.value.split('\n').filter(Boolean)}
            getValueProps={(value) => ({ value: value ? value.join('\n') : '' })}
          >
            <TextArea
              rows={4}
              placeholder="Bachelor's degree in Computer Science&#10;3+ years of React experience&#10;Strong problem-solving skills"
            />
          </Form.Item>

          <Form.Item
            label="Responsibilities (one per line)"
            name="responsibilities"
            getValueFromEvent={(e) => e.target.value.split('\n').filter(Boolean)}
            getValueProps={(value) => ({ value: value ? value.join('\n') : '' })}
          >
            <TextArea
              rows={4}
              placeholder="Develop and maintain web applications&#10;Collaborate with cross-functional teams&#10;Code reviews and mentoring"
            />
          </Form.Item>

          <Form.Item
            label="Skills (one per line)"
            name="skills"
            getValueFromEvent={(e) => e.target.value.split('\n').filter(Boolean)}
            getValueProps={(value) => ({ value: value ? value.join('\n') : '' })}
          >
            <TextArea rows={3} placeholder="React&#10;JavaScript&#10;Node.js" />
          </Form.Item>

          <Form.Item label="Application Deadline" name="applicationDeadline">
            <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
          </Form.Item>

          <Form.Item label="Contact Email" name="contactEmail">
            <Input placeholder="hr@company.com" type="email" />
          </Form.Item>

          <Form.Item
            label="Status"
            name="status"
            initialValue="Active"
            rules={[{ required: true }]}
          >
            <Select>
              <Option value="Active">Active</Option>
              <Option value="Inactive">Inactive</Option>
              <Option value="Closed">Closed</Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingJob ? 'Update Job' : 'Create Job'}
              </Button>
              <Button onClick={closeModal}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Jobs;
