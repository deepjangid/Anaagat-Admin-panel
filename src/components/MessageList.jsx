import { memo } from 'react';
import { AlertCircle, LoaderCircle, RefreshCw, Users } from 'lucide-react';
import MessageItem from './MessageItem';

const tabs = ['All', 'Unread'];

const MessageList = memo(function MessageList({
  messages,
  totalCount,
  unreadCount,
  activeFilter,
  searchTerm,
  selectedMessageId,
  loading,
  error,
  refreshing,
  onFilterChange,
  onSearchChange,
  onSelectMessage,
  onRetry,
  onOpenContacts,
}) {
  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-sm" data-tour="inbox-thread-list">
      <div className="border-b border-gray-100 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-400">Communication</p>
            <h1 className="mt-2 text-2xl font-semibold text-gray-900">Inbox</h1>
          </div>
          <div className="flex items-center gap-2">
            {refreshing ? <RefreshCw size={14} className="animate-spin text-gray-400" /> : null}
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500">
              {totalCount} threads
            </span>
          </div>
        </div>

        <div className="mt-4">
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search by name, email, or message"
            className="h-10 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none transition-all duration-200 focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
          />
        </div>

        <div className="mt-4">
          <button
            type="button"
            onClick={onOpenContacts}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
          >
            <Users size={16} />
            Open All Contacts
          </button>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {tabs.map((tab) => {
            const isActive = activeFilter === tab;

            return (
              <button
                key={tab}
                type="button"
                onClick={() => onFilterChange(tab)}
                className={[
                  'rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                ].join(' ')}
              >
                {tab}
                {tab === 'Unread' && unreadCount ? ` (${unreadCount})` : ''}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pt-4 pr-1">
        {loading ? (
          <div className="flex h-full min-h-48 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 text-center text-sm text-gray-500">
            <LoaderCircle className="animate-spin text-blue-500" size={24} />
            Loading messages...
          </div>
        ) : error ? (
          <div className="flex h-full min-h-48 flex-col items-center justify-center gap-4 rounded-2xl border border-red-100 bg-red-50/70 px-6 text-center">
            <AlertCircle className="text-red-500" size={24} />
            <div>
              <p className="text-sm font-semibold text-red-700">Could not load inbox</p>
              <p className="mt-1 break-words text-sm text-red-600">{error}</p>
            </div>
            <button
              type="button"
              onClick={onRetry}
              className="rounded-full bg-white px-4 py-2 text-sm font-medium text-red-600 transition duration-200 hover:bg-red-100"
            >
              Try again
            </button>
          </div>
        ) : messages.length ? (
          <div className="space-y-2">
            {messages.map((message) => (
              <MessageItem
                key={message.id}
                message={message}
                active={selectedMessageId === message.id}
                onSelect={onSelectMessage}
              />
            ))}
          </div>
        ) : (
          <div className="flex h-full min-h-48 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 text-center text-sm text-gray-400">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
              <AlertCircle size={18} />
            </div>
            <p className="font-medium text-gray-500">No messages found</p>
            <p className="max-w-xs text-xs leading-relaxed text-gray-400">
              New contact form submissions will appear here. Use the contacts view to review the full communication history.
            </p>
          </div>
        )}
      </div>
    </section>
  );
});

export default MessageList;
