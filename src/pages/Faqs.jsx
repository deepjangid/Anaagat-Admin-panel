import { Card, Collapse, Button, Modal, Form, Input, Space, message } from 'antd';
import { MdAdd, MdEdit, MdDelete } from 'react-icons/md';
import { useState } from 'react';

const { Panel } = Collapse;
const { TextArea } = Input;

const Faqs = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();

  const faqData = [
    {
      key: '1',
      category: 'General',
      question: 'What are your business hours?',
      answer: 'We are open Monday through Friday, 9:00 AM to 6:00 PM EST. Our customer support team is available during these hours to assist you with any questions or concerns.',
    },
    {
      key: '2',
      category: 'General',
      question: 'How can I contact customer support?',
      answer: 'You can reach our customer support team via email at support@example.com, phone at 1-800-123-4567, or through our live chat feature on the website.',
    },
    {
      key: '3',
      category: 'Pricing',
      question: 'What payment methods do you accept?',
      answer: 'We accept all major credit cards (Visa, MasterCard, American Express), PayPal, and bank transfers for larger orders.',
    },
    {
      key: '4',
      category: 'Pricing',
      question: 'Do you offer refunds?',
      answer: 'Yes, we offer a 30-day money-back guarantee on all our products. If you\'re not satisfied, contact us within 30 days of purchase for a full refund.',
    },
    {
      key: '5',
      category: 'Services',
      question: 'How long does delivery take?',
      answer: 'Standard delivery takes 5-7 business days. Express delivery options are available for 2-3 business days at an additional cost.',
    },
    {
      key: '6',
      category: 'Services',
      question: 'Do you ship internationally?',
      answer: 'Yes, we ship to over 100 countries worldwide. International shipping times vary by destination, typically 7-14 business days.',
    },
    {
      key: '7',
      category: 'Technical',
      question: 'What are the system requirements?',
      answer: 'Our platform works on all modern web browsers (Chrome, Firefox, Safari, Edge) and requires an internet connection. Mobile apps are available for iOS 12+ and Android 8+.',
    },
    {
      key: '8',
      category: 'Technical',
      question: 'Is my data secure?',
      answer: 'Yes, we use industry-standard SSL encryption to protect your data. All sensitive information is encrypted and stored securely on our servers.',
    },
  ];

  const categories = [...new Set(faqData.map(faq => faq.category))];

  const handleSubmit = (values) => {
    console.log('Form values:', values);
    message.success('FAQ added successfully!');
    setIsModalOpen(false);
    form.resetFields();
  };

  const handleEdit = (faq) => {
    console.log('Edit FAQ:', faq);
    message.info('Edit functionality to be implemented');
  };

  const handleDelete = (faq) => {
    console.log('Delete FAQ:', faq);
    message.success('FAQ deleted successfully!');
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>FAQs Management</h1>
        <Button type="primary" icon={<MdAdd />} onClick={() => setIsModalOpen(true)}>
          Add New FAQ
        </Button>
      </div>

      {categories.map(category => (
        <Card
          key={category}
          title={category}
          style={{ marginBottom: 16 }}
        >
          <Collapse accordion>
            {faqData
              .filter(faq => faq.category === category)
              .map(faq => (
                <Panel
                  header={faq.question}
                  key={faq.key}
                  extra={
                    <Space onClick={(e) => e.stopPropagation()}>
                      <Button
                        type="text"
                        icon={<MdEdit />}
                        size="small"
                        onClick={() => handleEdit(faq)}
                      />
                      <Button
                        type="text"
                        danger
                        icon={<MdDelete />}
                        size="small"
                        onClick={() => handleDelete(faq)}
                      />
                    </Space>
                  }
                >
                  <p>{faq.answer}</p>
                </Panel>
              ))}
          </Collapse>
        </Card>
      ))}

      <Modal
        title="Add New FAQ"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label="Category"
            name="category"
            rules={[{ required: true, message: 'Please enter a category' }]}
          >
            <Input placeholder="e.g., General, Pricing, Services" />
          </Form.Item>

          <Form.Item
            label="Question"
            name="question"
            rules={[{ required: true, message: 'Please enter the question' }]}
          >
            <Input placeholder="Enter the FAQ question" />
          </Form.Item>

          <Form.Item
            label="Answer"
            name="answer"
            rules={[{ required: true, message: 'Please enter the answer' }]}
          >
            <TextArea rows={5} placeholder="Enter the detailed answer" />
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

export default Faqs;