import { Card, Table, Button, Space, Tag, Image, Modal, Form, Input, Upload, message } from 'antd';
import { MdAdd, MdEdit, MdDelete, MdUpload } from 'react-icons/md';
import { useState } from 'react';

const Banner = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();

  const columns = [
    {
      title: 'Preview',
      dataIndex: 'image',
      key: 'image',
      render: (image) => <Image width={100} src={image} alt="banner" />,
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
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
      render: () => (
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
      image: 'https://via.placeholder.com/800x400/4A90E2/ffffff?text=Banner+1',
      title: 'Summer Sale 2024',
      description: 'Up to 50% off on all products',
      status: 'Active',
    },
    {
      key: '2',
      image: 'https://via.placeholder.com/800x400/E94B3C/ffffff?text=Banner+2',
      title: 'New Arrivals',
      description: 'Check out our latest collection',
      status: 'Active',
    },
    {
      key: '3',
      image: 'https://via.placeholder.com/800x400/6AB04C/ffffff?text=Banner+3',
      title: 'Free Shipping',
      description: 'On orders above $50',
      status: 'Inactive',
    },
  ];

  const handleSubmit = (values) => {
    console.log('Form values:', values);
    message.success('Banner added successfully!');
    setIsModalOpen(false);
    form.resetFields();
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Banner Management</h1>
        <Button type="primary" icon={<MdAdd />} onClick={() => setIsModalOpen(true)}>
          Add New Banner
        </Button>
      </div>

      <Card>
        <Table columns={columns} dataSource={data} scroll={{ x: 1000 }} />
      </Card>

      <Modal
        title="Add New Banner"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label="Banner Title"
            name="title"
            rules={[{ required: true, message: 'Please enter banner title' }]}
          >
            <Input placeholder="Enter banner title" />
          </Form.Item>

          <Form.Item
            label="Description"
            name="description"
            rules={[{ required: true, message: 'Please enter description' }]}
          >
            <Input.TextArea rows={3} placeholder="Enter banner description" />
          </Form.Item>

          <Form.Item
            label="Banner Image"
            name="image"
            rules={[{ required: true, message: 'Please upload an image' }]}
          >
            <Upload listType="picture-card" maxCount={1}>
              <div>
                <MdUpload size={24} />
                <div style={{ marginTop: 8 }}>Upload</div>
              </div>
            </Upload>
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

export default Banner;
