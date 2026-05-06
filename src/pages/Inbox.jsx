import { useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Button, Card, Col, Row, Tag, Typography, message as toast } from 'antd';
import MessageList from '../components/MessageList';
import MessageDetails from '../components/MessageDetails';

const { Paragraph, Text, Title } = Typography;

const Inbox = () => {
  const navigate = useNavigate();
  const { messages, loading, refreshing, error, fetchMessages, markAsRead, unreadCount } = useOutletContext();
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMessageId, setSelectedMessageId] = useState(null);

  const filteredMessages = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return messages.filter((message) => {
      const matchesFilter = activeFilter === 'Unread' ? message.unread : true;
      if (!matchesFilter) return false;
      if (!normalizedSearch) return true;

      return `${message.name} ${message.email} ${message.message} ${message.subject} ${message.phone}`.toLowerCase().includes(normalizedSearch);
    });
  }, [activeFilter, messages, searchTerm]);

  const activeSelectedMessageId = useMemo(
    () => (messages.some((message) => message.id === selectedMessageId) ? selectedMessageId : null),
    [messages, selectedMessageId]
  );

  const selectedMessage = useMemo(
    () => messages.find((message) => message.id === activeSelectedMessageId) || null,
    [activeSelectedMessageId, messages]
  );

  const overviewStats = useMemo(
    () => ({
      total: messages.length,
      unread: unreadCount,
      withEmail: messages.filter((item) => item.email).length,
      withPhone: messages.filter((item) => item.phone).length,
    }),
    [messages, unreadCount]
  );

  const handleSelectMessage = async (message) => {
    setSelectedMessageId(message.id);

    if (!message.unread) return;

    try {
      await markAsRead(message.id);
    } catch {
      // The hook already restores UI state; keeping the current selection is fine.
    }
  };

  const copyToClipboard = async (value, label) => {
    const text = String(value || '').trim();
    if (!text) {
      toast.warning(`${label} not available for this message.`);
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied.`);
    } catch {
      toast.error(`Could not copy ${label.toLowerCase()}.`);
    }
  };

  return (
    <div className="space-y-4 rounded-2xl bg-gray-50 p-4 md:p-5">
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-white via-slate-50 to-blue-50 p-5 shadow-sm" data-tour="inbox-hero">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <Tag color="blue">Inbox Workspace</Tag>
            <Title level={3} style={{ margin: '12px 0 8px' }}>Admin communication made simpler</Title>
            <Paragraph style={{ marginBottom: 0 }}>
              New contact-form messages appear here first. Use this space to read inquiries quickly, copy contact details, and manage follow-ups faster.
            </Paragraph>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="primary" onClick={() => navigate('/contact-messages')}>Open All Contacts</Button>
            <Button onClick={() => fetchMessages({ silent: true })} loading={refreshing}>
              Refresh Inbox
            </Button>
          </div>
        </div>
      </div>

      <Row gutter={[16, 16]} data-tour="inbox-stats">
        <Col xs={12} lg={6}>
          <Card size="small">
            <Text type="secondary">Total Messages</Text>
            <Title level={3} style={{ margin: '8px 0 0' }}>{overviewStats.total}</Title>
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card size="small">
            <Text type="secondary">Unread</Text>
            <Title level={3} style={{ margin: '8px 0 0' }}>{overviewStats.unread}</Title>
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card size="small">
            <Text type="secondary">With Email</Text>
            <Title level={3} style={{ margin: '8px 0 0' }}>{overviewStats.withEmail}</Title>
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card size="small">
            <Text type="secondary">With Phone</Text>
            <Title level={3} style={{ margin: '8px 0 0' }}>{overviewStats.withPhone}</Title>
          </Card>
        </Col>
      </Row>

      <div className="grid min-h-[38rem] grid-cols-1 gap-4 md:grid-cols-3">
      <div className={`${selectedMessage ? 'hidden md:block' : 'block'} min-h-0 md:col-span-1`}>
        <MessageList
          messages={filteredMessages}
          totalCount={messages.length}
          unreadCount={unreadCount}
          activeFilter={activeFilter}
          searchTerm={searchTerm}
          selectedMessageId={activeSelectedMessageId}
          loading={loading}
          error={error}
          refreshing={refreshing}
          onFilterChange={setActiveFilter}
          onSearchChange={setSearchTerm}
          onSelectMessage={handleSelectMessage}
          onRetry={() => fetchMessages()}
          onOpenContacts={() => navigate('/contact-messages')}
        />
      </div>

      <div className={`${selectedMessage ? 'block' : 'hidden md:block'} min-h-0 md:col-span-2`}>
        <MessageDetails
          message={selectedMessage}
          unreadCount={unreadCount}
          refreshing={refreshing}
          onBack={() => setSelectedMessageId(null)}
          onCopyEmail={(value) => copyToClipboard(value, 'Email')}
          onCopyPhone={(value) => copyToClipboard(value, 'Phone')}
          onOpenContacts={() => navigate('/contact-messages')}
        />
      </div>
      </div>
    </div>
  );
};

export default Inbox;
