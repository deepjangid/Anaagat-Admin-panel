import { useState } from 'react';
import { Button, Card, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag, message } from 'antd';
import { MdAdd, MdDelete, MdEdit, MdRefresh } from 'react-icons/md';
import { makeId, readContent, resetContent, saveContent } from '../utils/contentStore';

const { TextArea } = Input;

const emptyService = {
  name: '',
  category: 'Recruitment',
  description: '',
  status: 'Active',
};

const ServicesPage = () => {
  const [items, setItems] = useState(readContent('services'));
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form] = Form.useForm();

  const persist = (nextItems, successMessage) => {
    setItems(nextItems);
    saveContent('services', nextItems);
    if (successMessage) message.success(successMessage);
  };

  const handleAdd = () => {
    setEditingId(null);
    form.setFieldsValue(emptyService);
    setOpen(true);
  };

  const handleEdit = (record) => {
    setEditingId(record.id);
    form.setFieldsValue(record);
    setOpen(true);
  };

  const handleDelete = (id) => {
    persist(items.filter((item) => item.id !== id), 'Service deleted successfully.');
  };

  const handleSubmit = (values) => {
    const payload = {
      ...values,
      id: editingId || makeId('service'),
    };

    const nextItems = editingId
      ? items.map((item) => (item.id === editingId ? payload : item))
      : [payload, ...items];

    persist(nextItems, editingId ? 'Service updated successfully.' : 'Service added successfully.');
    setOpen(false);
    setEditingId(null);
    form.resetFields();
  };

  const handleReset = () => {
    persist(resetContent('services'), 'Service content reset to default.');
  };

  const columns = [
    {
      title: 'Service Name',
      dataIndex: 'name',
      key: 'name',
      width: 240,
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      width: 160,
      render: (category) => <Tag color="blue">{category}</Tag>,
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
      width: 120,
      render: (status) => <Tag color={status === 'Active' ? 'green' : 'default'}>{status}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 160,
      render: (_, record) => (
        <Space>
          <Button type="primary" icon={<MdEdit />} size="small" onClick={() => handleEdit(record)}>
            Edit
          </Button>
          <Popconfirm title="Delete this service?" okText="Delete" okButtonProps={{ danger: true }} onConfirm={() => handleDelete(record.id)}>
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
      <div className="page-header page-header-row">
        <h1>Services Management</h1>
        <Space>
          <Button icon={<MdRefresh />} onClick={handleReset}>
            Reset
          </Button>
          <Button type="primary" icon={<MdAdd />} onClick={handleAdd}>
            Add Service
          </Button>
        </Space>
      </div>

      <Card>
        <Table columns={columns} dataSource={items} rowKey="id" scroll={{ x: 1000 }} />
      </Card>

      <Modal
        title={editingId ? 'Edit Service' : 'Add Service'}
        open={open}
        onCancel={() => {
          setOpen(false);
          setEditingId(null);
          form.resetFields();
        }}
        footer={null}
        width={680}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={emptyService}>
          <Form.Item label="Service Name" name="name" rules={[{ required: true, message: 'Please enter a service name.' }]}>
            <Input placeholder="Enter service name" />
          </Form.Item>

          <Form.Item label="Category" name="category" rules={[{ required: true, message: 'Please select a category.' }]}>
            <Select
              options={[
                { value: 'Recruitment', label: 'Recruitment' },
                { value: 'Operations', label: 'Operations' },
                { value: 'Consulting', label: 'Consulting' },
                { value: 'Support', label: 'Support' },
              ]}
            />
          </Form.Item>

          <Form.Item
            label="Description"
            name="description"
            rules={[{ required: true, message: 'Please enter a description.' }]}
          >
            <TextArea rows={4} placeholder="Describe this service" />
          </Form.Item>

          <Form.Item label="Status" name="status" rules={[{ required: true, message: 'Please choose a status.' }]}>
            <Select
              options={[
                { value: 'Active', label: 'Active' },
                { value: 'Inactive', label: 'Inactive' },
              ]}
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingId ? 'Update Service' : 'Create Service'}
              </Button>
              <Button onClick={() => setOpen(false)}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ServicesPage;
