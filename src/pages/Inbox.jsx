import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import MessageList from '../components/MessageList';
import MessageDetails from '../components/MessageDetails';

const Inbox = () => {
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

      return `${message.name} ${message.email}`.toLowerCase().includes(normalizedSearch);
    });
  }, [activeFilter, messages, searchTerm]);

  const selectedMessage = useMemo(
    () => filteredMessages.find((message) => message.id === selectedMessageId) || null,
    [filteredMessages, selectedMessageId]
  );

  useEffect(() => {
    if (!selectedMessageId) return;
    if (filteredMessages.some((message) => message.id === selectedMessageId)) return;
    setSelectedMessageId(null);
  }, [filteredMessages, selectedMessageId]);

  const handleSelectMessage = async (message) => {
    setSelectedMessageId(message.id);

    if (!message.unread) return;

    try {
      await markAsRead(message.id);
    } catch {
      // The hook already restores UI state; keeping the current selection is fine.
    }
  };

  return (
    <div className="rounded-2xl bg-gray-50 p-4 md:p-5">
      <div className="grid h-[calc(100vh-11rem)] min-h-[38rem] grid-cols-1 gap-4 overflow-hidden md:grid-cols-3">
      <div className={`${selectedMessage ? 'hidden md:block' : 'block'} min-h-0 md:col-span-1`}>
        <MessageList
          messages={filteredMessages}
          totalCount={messages.length}
          unreadCount={unreadCount}
          activeFilter={activeFilter}
          searchTerm={searchTerm}
          selectedMessageId={selectedMessageId}
          loading={loading}
          error={error}
          refreshing={refreshing}
          onFilterChange={setActiveFilter}
          onSearchChange={setSearchTerm}
          onSelectMessage={handleSelectMessage}
          onRetry={() => fetchMessages()}
        />
      </div>

      <div className={`${selectedMessage ? 'block' : 'hidden md:block'} min-h-0 md:col-span-2`}>
        <MessageDetails
          message={selectedMessage}
          unreadCount={unreadCount}
          refreshing={refreshing}
          onBack={() => setSelectedMessageId(null)}
        />
      </div>
      </div>
    </div>
  );
};

export default Inbox;
