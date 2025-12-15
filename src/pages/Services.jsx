import { Card, Table, Button, Space, Tag, Modal, Form, Input, Upload, message, Select } from 'antd';
import { MdAdd, MdEdit, MdDelete, MdUpload } from 'react-icons/md';
import { useState } from 'react';

const { TextArea } = Input;
const { Option } = Select;

const Services = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();

  const columns = [
    {
      title: 'Icon',
      dataIndex: 'icon',
      key: 'icon',
      render: (icon) => (
        <div style={{ fontSize: 32, color: '#1890ff' }}>{icon}</div>
      ),
    },
    {
      title: 'Service Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (category) => <Tag color="blue">{category}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'Active' ? 'green' : 'default'}>{status}</Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button type="primary" icon={<MdEdit />} size="small">
            Edit
          </Button>
          <Button danger icon={<MdDelete />} size="small">
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  const data = [
    {
      key: '1',
      icon: '🎨',
      name: 'Web Design',
      description: 'Custom website design tailored to your brand',
      category: 'Design',
      status: 'Active',
    },
    {
      key: '2',
      icon: '💻',
      name: 'Web Development',
      description: 'Full-stack web application development',
      category: 'Development',
      status: 'Active',
    },
    {
      key: '3',
      icon: '📱',
      name: 'Mobile App Development',
      description: 'Native and cross-platform mobile apps',
      category: 'Development',
      status: 'Active',
    },
    {
      key: '4',
      icon: '🚀',
      name: 'Digital Marketing',
      description: 'SEO, SEM, and social media marketing',
      category: 'Marketing',
      status: 'Active',
    },
    {
      key: '5',
      icon: '☁️',
      name: 'Cloud Solutions',
      description: 'Cloud hosting and infrastructure setup',
      category: 'Infrastructure',
      status: 'Inactive',
    },
  ];

  const handleSubmit = (values) => {
    console.log('Form values:', values);
    message.success('Service added successfully!');
    setIsModalOpen(false);
    form.resetFields();
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Services Management</h1>
        <Button type="primary" icon={<MdAdd />} onClick={() => setIsModalOpen(true)}>
          Add New Service
        </Button>
      </div>

      <Card>
        <Table columns={columns} dataSource={data} scroll={{ x: 1000 }} />
      </Card>

      <Modal
        title="Add New Service"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label="Service Name"
            name="name"
            rules={[{ required: true, message: 'Please enter service name' }]}
          >
            <Input placeholder="Enter service name" />
          </Form.Item>

          <Form.Item
            label="Category"
            name="category"
            rules={[{ required: true, message: 'Please select a category' }]}
          >
            <Select placeholder="Select category">
              <Option value="Design">Design</Option>
              <Option value="Development">Development</Option>
              <Option value="Marketing">Marketing</Option>
              <Option value="Infrastructure">Infrastructure</Option>
              <Option value="Consulting">Consulting</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Description"
            name="description"
            rules={[{ required: true, message: 'Please enter description' }]}
          >
            <TextArea rows={4} placeholder="Enter service description" />
          </Form.Item>

          <Form.Item
            label="Service Icon/Image"
            name="icon"
            help="Upload an icon or image representing the service"
          >
            <Upload listType="picture-card" maxCount={1}>
              <div>
                <MdUpload size={24} />
                <div style={{ marginTop: 8 }}>Upload</div>
              </div>
            </Upload>
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
            </Select>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Submit
              </Button>
              <Button onClick={() => setIsModalOpen(false)}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Services;