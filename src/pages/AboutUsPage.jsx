import { useState } from 'react';
import { Button, Card, Col, Divider, Form, Input, List, Row, Space, message } from 'antd';
import { MdRefresh, MdSave } from 'react-icons/md';
import { readContent, resetContent, saveContent } from '../utils/contentStore';

const { TextArea } = Input;

const listToText = (items = []) => items.join('\n');
const textToList = (value) =>
  String(value || '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);

const AboutUsPage = () => {
  const initialData = readContent('about');
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(initialData);

  const handleValuesChange = (_, allValues) => {
    setPreview({
      ...allValues,
      highlights: textToList(allValues.highlights),
      stats: textToList(allValues.stats),
    });
  };

  const handleSubmit = (values) => {
    setLoading(true);
    const payload = {
      ...values,
      highlights: textToList(values.highlights),
      stats: textToList(values.stats),
    };
    saveContent('about', payload);
    setPreview(payload);
    message.success('About section updated successfully.');
    setLoading(false);
  };

  const handleReset = () => {
    const data = resetContent('about');
    form.setFieldsValue({
      ...data,
      highlights: listToText(data.highlights),
      stats: listToText(data.stats),
    });
    setPreview(data);
    message.success('About section reset to default content.');
  };

  return (
    <div>
      <div className="page-header page-header-row">
        <h1>About Us Management</h1>
        <Space>
          <Button icon={<MdRefresh />} onClick={handleReset}>
            Reset
          </Button>
          <Button type="primary" icon={<MdSave />} onClick={() => form.submit()} loading={loading}>
            Save Changes
          </Button>
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <Card>
            <Form
              form={form}
              layout="vertical"
              initialValues={{
                ...initialData,
                highlights: listToText(initialData.highlights),
                stats: listToText(initialData.stats),
              }}
              onFinish={handleSubmit}
              onValuesChange={handleValuesChange}
            >
              <Form.Item
                label="Main Title"
                name="title"
                rules={[{ required: true, message: 'Please enter the title.' }]}
              >
                <Input placeholder="Enter the about title" size="large" />
              </Form.Item>

              <Form.Item
                label="Subtitle"
                name="subtitle"
                rules={[{ required: true, message: 'Please enter the subtitle.' }]}
              >
                <Input placeholder="Enter the about subtitle" />
              </Form.Item>

              <Form.Item
                label="Description"
                name="description"
                rules={[{ required: true, message: 'Please enter the description.' }]}
              >
                <TextArea rows={5} placeholder="Write the company overview" />
              </Form.Item>

              <Form.Item
                label="Mission"
                name="mission"
                rules={[{ required: true, message: 'Please enter the mission.' }]}
              >
                <TextArea rows={3} placeholder="Write the mission statement" />
              </Form.Item>

              <Form.Item
                label="Vision"
                name="vision"
                rules={[{ required: true, message: 'Please enter the vision.' }]}
              >
                <TextArea rows={3} placeholder="Write the vision statement" />
              </Form.Item>

              <Form.Item
                label="Leadership Note"
                name="leadershipNote"
                rules={[{ required: true, message: 'Please enter the leadership note.' }]}
              >
                <TextArea rows={3} placeholder="Short leadership or founder note" />
              </Form.Item>

              <Form.Item
                label="Highlights"
                name="highlights"
                extra="Add one point per line."
                rules={[{ required: true, message: 'Please add at least one highlight.' }]}
              >
                <TextArea rows={5} placeholder="One highlight per line" />
              </Form.Item>

              <Form.Item
                label="Stats / Key Achievements"
                name="stats"
                extra="Add one item per line."
                rules={[{ required: true, message: 'Please add at least one achievement.' }]}
              >
                <TextArea rows={4} placeholder="One stat per line" />
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col xs={24} xl={10}>
          <Card title="Preview" className="content-preview-card">
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div>
                <div className="content-preview-eyebrow">About Section</div>
                <h2>{preview.title}</h2>
                <p className="content-preview-subtitle">{preview.subtitle}</p>
              </div>

              <p>{preview.description}</p>

              <Divider />

              <div>
                <h3>Mission</h3>
                <p>{preview.mission}</p>
              </div>

              <div>
                <h3>Vision</h3>
                <p>{preview.vision}</p>
              </div>

              <div>
                <h3>Leadership Note</h3>
                <p>{preview.leadershipNote}</p>
              </div>

              <div>
                <h3>Highlights</h3>
                <List
                  size="small"
                  bordered
                  dataSource={preview.highlights || []}
                  renderItem={(item) => <List.Item>{item}</List.Item>}
                />
              </div>

              <div>
                <h3>Stats</h3>
                <List
                  size="small"
                  bordered
                  dataSource={preview.stats || []}
                  renderItem={(item) => <List.Item>{item}</List.Item>}
                />
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AboutUsPage;
