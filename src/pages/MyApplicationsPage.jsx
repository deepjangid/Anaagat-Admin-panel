import { useCallback, useEffect, useState } from 'react';
import { Alert, Card, Empty, Space, Tag, Typography, message } from 'antd';
import { applicationsAPI } from '../services/api';
import { getApplicationClientName, getApplicationJobTitle } from '../utils/adminRecords';

const { Paragraph, Text } = Typography;

const STATUS_COLORS = {
  pending: 'gold',
  shortlisted: 'blue',
  accepted: 'green',
  rejected: 'red',
};

const MyApplicationsPage = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await applicationsAPI.getMine({ limit: 100 });
      if (res.data.success) {
        setApplications(Array.isArray(res.data.applications) ? res.data.applications : []);
      }
    } catch (error) {
      console.error(error);
      message.error(error?.response?.data?.message || 'Failed to load your applications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  return (
    <div>
      <div className="page-header">
        <h1>My Applications</h1>
        <p>Track your application status and the latest message shared by the admin team.</p>
      </div>

      <Card className="admin-surface-card" style={{ marginBottom: 20 }}>
        <Alert
          type="success"
          showIcon
          message="Candidate updates appear here"
          description="Candidates can review the current application status, job title, and the latest admin message."
        />
      </Card>

      <div className="candidate-dashboard-list">
        {applications.length === 0 && !loading ? (
          <Card className="admin-surface-card">
            <Empty description="No applications found" />
          </Card>
        ) : null}

        {applications.map((application) => (
          <Card key={application._id} className="admin-surface-card candidate-application-card" loading={loading}>
            <div className="candidate-application-top">
              <div>
                <div className="candidate-application-title">{getApplicationJobTitle(application)}</div>
                <div className="candidate-application-company">{getApplicationClientName(application)}</div>
              </div>
              <Tag color={STATUS_COLORS[String(application.status || 'pending').toLowerCase()] || 'default'}>
                {application.status || 'Pending'}
              </Tag>
            </div>

            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Text type="secondary">
                Applied on {application.createdAt ? new Date(application.createdAt).toLocaleString('en-IN') : 'N/A'}
              </Text>
              <Paragraph className="candidate-application-message">
                {application.adminMessage || 'No admin message has been shared yet.'}
              </Paragraph>
            </Space>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default MyApplicationsPage;
