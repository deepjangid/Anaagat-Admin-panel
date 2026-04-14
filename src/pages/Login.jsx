import { useState } from 'react';
import { Form, Input, Button, Card, message, Typography } from 'antd';
import { MdEmail, MdLock } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

const { Title, Text } = Typography;

const Login = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const res = await authAPI.login(values);

      // ✅ Check token instead of success
      if (res.data.token) {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        message.success('Login successful!');
        navigate('/dashboard');
      }

    } catch (error) {
      console.error('Login error:', error);

      const errorMessage =
        error.response?.data?.msg ||
        error.response?.data?.message ||
        (error.request
          ? 'Backend unavailable. Check that the server is running and MongoDB is connected.'
          : 'Login failed. Please try again.');

      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <Card className="login-card">
        <div className="login-header">
          <Title level={2}>Admin Dashboard</Title>
          <Text type="secondary">Sign in to continue</Text>
        </div>

        <Form
          name="login"
          onFinish={onFinish}
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: 'Please input your email!' },
              { type: 'email', message: 'Enter valid email!' }
            ]}
          >
            <Input prefix={<MdEmail />} placeholder="Email" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: 'Enter password!' },
              { min: 6, message: 'Min 6 characters' }
            ]}
          >
            <Input.Password prefix={<MdLock />} placeholder="Password" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              Sign In
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Login;
