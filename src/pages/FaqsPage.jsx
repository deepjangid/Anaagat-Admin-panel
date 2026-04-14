import { useMemo, useState } from 'react';
import { Button, Card, Collapse, Form, Input, Modal, Popconfirm, Select, Space, Tag, message } from 'antd';
import { MdAdd, MdDelete, MdEdit, MdRefresh } from 'react-icons/md';
import { makeId, readContent, resetContent, saveContent } from '../utils/contentStore';

const { TextArea } = Input;

const emptyFaq = {
  category: 'Hiring',
  question: '',
  answer: '',
};

const FaqsPage = () => {
  const [items, setItems] = useState(readContent('faqs'));
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form] = Form.useForm();

  const persist = (nextItems, successMessage) => {
    setItems(nextItems);
    saveContent('faqs', nextItems);
    if (successMessage) message.success(successMessage);
  };

  const categories = useMemo(() => [...new Set(items.map((item) => item.category))], [items]);

  const handleAdd = () => {
    setEditingId(null);
    form.setFieldsValue(emptyFaq);
    setOpen(true);
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    form.setFieldsValue(item);
    setOpen(true);
  };

  const handleDelete = (id) => {
    persist(items.filter((item) => item.id !== id), 'FAQ deleted successfully.');
  };

  const handleSubmit = (values) => {
    const payload = {
      ...values,
      id: editingId || makeId('faq'),
    };

    const nextItems = editingId
      ? items.map((item) => (item.id === editingId ? payload : item))
      : [payload, ...items];

    persist(nextItems, editingId ? 'FAQ updated successfully.' : 'FAQ added successfully.');
    setOpen(false);
    setEditingId(null);
    form.resetFields();
  };

  const handleReset = () => {
    persist(resetContent('faqs'), 'FAQ content reset to default.');
  };

  return (
    <div>
      <div className="page-header page-header-row">
        <h1>FAQs Management</h1>
        <Space>
          <Button icon={<MdRefresh />} onClick={handleReset}>
            Reset
          </Button>
          <Button type="primary" icon={<MdAdd />} onClick={handleAdd}>
            Add FAQ
          </Button>
        </Space>
      </div>

      {categories.map((category) => (
        <Card
          key={category}
          title={
            <Space>
              <span>{category}</span>
              <Tag>{items.filter((item) => item.category === category).length}</Tag>
            </Space>
          }
          style={{ marginBottom: 16 }}
        >
          <Collapse
            accordion
            items={items
              .filter((item) => item.category === category)
              .map((item) => ({
                key: item.id,
                label: item.question,
                children: <p style={{ marginBottom: 0 }}>{item.answer}</p>,
                extra: (
                  <Space onClick={(event) => event.stopPropagation()}>
                    <Button type="text" icon={<MdEdit />} size="small" onClick={() => handleEdit(item)} />
                    <Popconfirm title="Delete this FAQ?" okText="Delete" okButtonProps={{ danger: true }} onConfirm={() => handleDelete(item.id)}>
                      <Button type="text" danger icon={<MdDelete />} size="small" />
                    </Popconfirm>
                  </Space>
                ),
              }))}
          />
        </Card>
      ))}

      <Modal
        title={editingId ? 'Edit FAQ' : 'Add FAQ'}
        open={open}
        onCancel={() => {
          setOpen(false);
          setEditingId(null);
          form.resetFields();
        }}
        footer={null}
        width={680}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={emptyFaq}>
          <Form.Item label="Category" name="category" rules={[{ required: true, message: 'Please choose a category.' }]}>
            <Select
              options={[
                { value: 'Hiring', label: 'Hiring' },
                { value: 'Process', label: 'Process' },
                { value: 'Candidates', label: 'Candidates' },
                { value: 'General', label: 'General' },
              ]}
            />
          </Form.Item>

          <Form.Item label="Question" name="question" rules={[{ required: true, message: 'Please enter a question.' }]}>
            <Input placeholder="Enter the FAQ question" />
          </Form.Item>

          <Form.Item label="Answer" name="answer" rules={[{ required: true, message: 'Please enter an answer.' }]}>
            <TextArea rows={5} placeholder="Enter the FAQ answer" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingId ? 'Update FAQ' : 'Create FAQ'}
              </Button>
              <Button onClick={() => setOpen(false)}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default FaqsPage;
