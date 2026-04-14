import { useState } from 'react';
import { Button, Card, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag, message } from 'antd';
import { MdAdd, MdDelete, MdEdit, MdRefresh } from 'react-icons/md';
import { makeId, readContent, resetContent, saveContent } from '../utils/contentStore';

const { TextArea } = Input;

const emptyBlog = {
  title: '',
  category: 'Hiring Tips',
  author: 'Anaagat Team',
  publishDate: '',
  status: 'Draft',
  excerpt: '',
  content: '',
};

const Blogs = () => {
  const [items, setItems] = useState(readContent('blogs'));
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form] = Form.useForm();

  const persist = (nextItems, successMessage) => {
    setItems(nextItems);
    saveContent('blogs', nextItems);
    if (successMessage) message.success(successMessage);
  };

  const handleAdd = () => {
    setEditingId(null);
    form.setFieldsValue(emptyBlog);
    setOpen(true);
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    form.setFieldsValue(item);
    setOpen(true);
  };

  const handleDelete = (id) => {
    persist(items.filter((item) => item.id !== id), 'Blog deleted successfully.');
  };

  const handleSubmit = (values) => {
    const payload = {
      ...values,
      id: editingId || makeId('blog'),
    };

    const nextItems = editingId
      ? items.map((item) => (item.id === editingId ? payload : item))
      : [payload, ...items];

    persist(nextItems, editingId ? 'Blog updated successfully.' : 'Blog added successfully.');
    setOpen(false);
    setEditingId(null);
    form.resetFields();
  };

  const handleReset = () => {
    persist(resetContent('blogs'), 'Blog content reset to default.');
  };

  const columns = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      width: 260,
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      width: 160,
      render: (category) => <Tag color="blue">{category}</Tag>,
    },
    {
      title: 'Author',
      dataIndex: 'author',
      key: 'author',
      width: 180,
    },
    {
      title: 'Publish Date',
      dataIndex: 'publishDate',
      key: 'publishDate',
      width: 140,
      render: (value) => value || '—',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => <Tag color={status === 'Published' ? 'green' : 'gold'}>{status}</Tag>,
    },
    {
      title: 'Excerpt',
      dataIndex: 'excerpt',
      key: 'excerpt',
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
          <Popconfirm title="Delete this blog?" okText="Delete" okButtonProps={{ danger: true }} onConfirm={() => handleDelete(record.id)}>
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
        <h1>Blog Management</h1>
        <Space>
          <Button icon={<MdRefresh />} onClick={handleReset}>
            Reset
          </Button>
          <Button type="primary" icon={<MdAdd />} onClick={handleAdd}>
            Add Blog
          </Button>
        </Space>
      </div>

      <Card>
        <Table columns={columns} dataSource={items} rowKey="id" scroll={{ x: 1300 }} />
      </Card>

      <Modal
        title={editingId ? 'Edit Blog' : 'Add Blog'}
        open={open}
        onCancel={() => {
          setOpen(false);
          setEditingId(null);
          form.resetFields();
        }}
        footer={null}
        width={760}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={emptyBlog}>
          <Form.Item label="Title" name="title" rules={[{ required: true, message: 'Please enter the blog title.' }]}>
            <Input placeholder="Enter blog title" />
          </Form.Item>

          <Space style={{ display: 'flex' }} align="start">
            <Form.Item label="Category" name="category" rules={[{ required: true, message: 'Please choose a category.' }]} style={{ minWidth: 180 }}>
              <Select
                options={[
                  { value: 'Hiring Tips', label: 'Hiring Tips' },
                  { value: 'Recruitment', label: 'Recruitment' },
                  { value: 'Workforce', label: 'Workforce' },
                  { value: 'Company News', label: 'Company News' },
                ]}
              />
            </Form.Item>

            <Form.Item label="Author" name="author" rules={[{ required: true, message: 'Please enter the author name.' }]} style={{ minWidth: 180 }}>
              <Input placeholder="Anaagat Team" />
            </Form.Item>

            <Form.Item
              label="Publish Date"
              name="publishDate"
              rules={[{ required: true, message: 'Please enter the publish date.' }]}
              style={{ minWidth: 180 }}
            >
              <Input type="date" />
            </Form.Item>
          </Space>

          <Form.Item label="Status" name="status" rules={[{ required: true, message: 'Please choose a status.' }]}>
            <Select
              options={[
                { value: 'Draft', label: 'Draft' },
                { value: 'Published', label: 'Published' },
              ]}
            />
          </Form.Item>

          <Form.Item label="Excerpt" name="excerpt" rules={[{ required: true, message: 'Please enter the short excerpt.' }]}>
            <TextArea rows={3} placeholder="Short summary for blog cards" />
          </Form.Item>

          <Form.Item label="Content" name="content" rules={[{ required: true, message: 'Please enter the blog content.' }]}>
            <TextArea rows={8} placeholder="Write the full blog content" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingId ? 'Update Blog' : 'Create Blog'}
              </Button>
              <Button onClick={() => setOpen(false)}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Blogs;
