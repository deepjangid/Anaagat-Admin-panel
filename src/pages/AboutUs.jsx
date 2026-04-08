import { Card, Form, Input, Button, Upload, message } from 'antd';
import { MdSave, MdUpload } from 'react-icons/md';
import { useState } from 'react';

const { TextArea } = Input;



const AboutUs = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const initialValues = {
    title: 'About Our Company',
    subtitle: 'Leading the industry since 2010',
    description: `We are a passionate team dedicated to delivering exceptional products and services. 
    
Our mission is to provide innovative solutions that make a difference in people's lives. With over a decade of experience, we've built a reputation for quality, reliability, and customer satisfaction.

Our values:
• Innovation and creativity
• Customer-first approach
• Integrity and transparency
• Continuous improvement
• Teamwork and collaboration`,
    vision: 'To be the global leader in our industry, recognized for innovation and excellence.',
    mission: 'To deliver outstanding value to our customers through quality products and exceptional service.',
  };

  const handleSubmit = (values) => {
    setLoading(true);
    setTimeout(() => {
      console.log('Form values:', values);
      message.success('About Us content updated successfully!');
      setLoading(false);
    }, 1000);
  };

  return (
    <div>
      <div className="page-header">
        <h1>About Us Management</h1>
      </div>

      <Card>
        <Form
          form={form}
          layout="vertical"
          initialValues={initialValues}
          onFinish={handleSubmit}
        >
          <Form.Item
            label="Company Logo"
            name="logo"
            help="Upload your company logo (recommended size: 200x200px)"
          >
            <Upload listType="picture-card" maxCount={1}>
              <div>
                <MdUpload size={24} />
                <div style={{ marginTop: 8 }}>Upload Logo</div>
              </div>
            </Upload>
          </Form.Item>

          <Form.Item
            label="Title"
            name="title"
            rules={[{ required: true, message: 'Please enter a title' }]}
          >
            <Input placeholder="Enter main title" size="large" />
          </Form.Item>

          <Form.Item
            label="Subtitle"
            name="subtitle"
            rules={[{ required: true, message: 'Please enter a subtitle' }]}
          >
            <Input placeholder="Enter subtitle" />
          </Form.Item>

          <Form.Item
            label="Description"
            name="description"
            rules={[{ required: true, message: 'Please enter a description' }]}
          >
            <TextArea
              rows={8}
              placeholder="Enter detailed description about your company"
            />
          </Form.Item>

          <Form.Item
            label="Vision"
            name="vision"
            rules={[{ required: true, message: 'Please enter your vision' }]}
          >
            <TextArea rows={3} placeholder="Enter company vision" />
          </Form.Item>

          <Form.Item
            label="Mission"
            name="mission"
            rules={[{ required: true, message: 'Please enter your mission' }]}
          >
            <TextArea rows={3} placeholder="Enter company mission" />
          </Form.Item>

          <Form.Item
            label="Company Images"
            name="images"
            help="Upload images showcasing your company (max 5 images)"
          >
            <Upload listType="picture-card" maxCount={5} multiple>
              <div>
                <MdUpload size={24} />
                <div style={{ marginTop: 8 }}>Upload</div>
              </div>
            </Upload>
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              icon={<MdSave />}
              size="large"
              loading={loading}
            >
              Save Changes
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default AboutUs;