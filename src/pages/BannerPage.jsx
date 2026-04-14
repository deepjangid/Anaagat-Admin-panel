import { useState } from 'react';
import { Button, Card, Form, Image, Input, Modal, Popconfirm, Select, Space, Table, Tag, message } from 'antd';
import { MdAdd, MdDelete, MdEdit, MdRefresh } from 'react-icons/md';
import { makeId, readContent, resetContent, saveContent } from '../utils/contentStore';

const { TextArea } = Input;

const emptyBanner = {
  title: '',
  description: '',
  image: '',
  ctaLabel: '',
  ctaLink: '',
  status: 'Active',
};

const BannerPage = () => {
  const [form] = Form.useForm();
  const [items, setItems] = useState(readContent('banners'));
  const [editingId, setEditingId] = useState(null);
  const [open, setOpen] = useState(false);

  const persist = (nextItems, successMessage) => {
    setItems(nextItems);
    saveContent('banners', nextItems);
    if (successMessage) message.success(successMessage);
  };

  const handleEdit = (record) => {
    setEditingId(record.id);
    form.setFieldsValue(record);
    setOpen(true);
  };

  const handleDelete = (id) => {
    persist(items.filter((item) => item.id !== id), 'Banner deleted successfully.');
  };

  const handleSubmit = (values) => {
    const payload = {
      ...values,
      id: editingId || makeId('banner'),
    };

    const nextItems = editingId
      ? items.map((item) => (item.id === editingId ? payload : item))
      : [payload, ...items];

    persist(nextItems, editingId ? 'Banner updated successfully.' : 'Banner added successfully.');
    setOpen(false);
    setEditingId(null);
    form.resetFields();
  };

  const handleReset = () => {
    persist(resetContent('banners'), 'Banner content reset to default.');
  };

  const handleAdd = () => {
    setEditingId(null);
    form.setFieldsValue(emptyBanner);
    setOpen(true);
  };

  const columns = [
    {
      title: 'Preview',
      dataIndex: 'image',
      key: 'image',
      width: 140,
      render: (image, record) =>
        image ? (
          <Image width={112} height={72} src={image} alt={record.title} style={{ objectFit: 'cover', borderRadius: 8 }} />
        ) : (
          <span>—</span>
        ),
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      width: 240,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'CTA',
      key: 'cta',
      width: 220,
      render: (_, record) => `${record.ctaLabel || '—'} ${record.ctaLink ? `(${record.ctaLink})` : ''}`.trim(),
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
          <Popconfirm title="Delete this banner?" okText="Delete" okButtonProps={{ danger: true }} onConfirm={() => handleDelete(record.id)}>
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
        <h1>Banner Management</h1>
        <Space>
          <Button icon={<MdRefresh />} onClick={handleReset}>
            Reset
          </Button>
          <Button type="primary" icon={<MdAdd />} onClick={handleAdd}>
            Add Banner
          </Button>
        </Space>
      </div>

      <Card>
        <Table columns={columns} dataSource={items} rowKey="id" scroll={{ x: 1100 }} />
      </Card>

      <Modal
        title={editingId ? 'Edit Banner' : 'Add Banner'}
        open={open}
        onCancel={() => {
          setOpen(false);
          setEditingId(null);
          form.resetFields();
        }}
        footer={null}
        width={720}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={emptyBanner}>
          <Form.Item label="Banner Title" name="title" rules={[{ required: true, message: 'Please enter a title.' }]}>
            <Input placeholder="Enter banner title" />
          </Form.Item>

          <Form.Item
            label="Description"
            name="description"
            rules={[{ required: true, message: 'Please enter a description.' }]}
          >
            <TextArea rows={4} placeholder="Enter banner description" />
          </Form.Item>

          <Form.Item label="Image URL" name="image" rules={[{ required: true, message: 'Please enter an image URL.' }]}>
            <Input placeholder="https://example.com/banner.jpg" />
          </Form.Item>

          <Form.Item label="CTA Label" name="ctaLabel" rules={[{ required: true, message: 'Please enter a button label.' }]}>
            <Input placeholder="Contact Us" />
          </Form.Item>

          <Form.Item label="CTA Link" name="ctaLink" rules={[{ required: true, message: 'Please enter a link.' }]}>
            <Input placeholder="/contact" />
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
                {editingId ? 'Update Banner' : 'Create Banner'}
              </Button>
              <Button onClick={() => setOpen(false)}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default BannerPage;
