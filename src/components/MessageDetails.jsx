import { memo } from 'react';
import { ArrowLeft, Inbox as InboxIcon, Mail, Phone } from 'lucide-react';
import { getAvatarTheme } from './MessageItem';

const formatFullDate = (value) => {
  if (!value) return 'Unknown time';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown time';

  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
};

const MessageDetails = memo(function MessageDetails({
  message,
  unreadCount,
  refreshing,
  onBack,
}) {
  if (!message) {
    return (
      <section className="flex h-full min-h-[20rem] items-center justify-center rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="max-w-md text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
            <InboxIcon size={34} strokeWidth={1.8} className={refreshing ? 'animate-pulse' : ''} />
          </div>
          <h2 className="mt-6 text-2xl font-semibold text-gray-900">No messages yet</h2>
          <p className="mt-3 text-sm leading-relaxed text-gray-500">
            Select a message from the inbox to view full contact details, including email, phone, and the complete message.
          </p>
          {unreadCount ? (
            <div className="mt-5 inline-flex rounded-full bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
              {unreadCount} unread message{unreadCount === 1 ? '' : 's'}
            </div>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="p-5 sm:p-6">
        <button
          type="button"
          onClick={onBack}
          className="mb-4 inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-600 transition-all duration-200 hover:scale-[1.01] hover:bg-gray-100 md:hidden"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-r text-xl font-semibold text-white ${getAvatarTheme(message.name)}`}>
              {message.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-400">Contact details</p>
              <h2 className="mt-1 break-words text-lg font-semibold text-gray-900">{message.name}</h2>
              <div className="mt-3 space-y-2 text-sm text-gray-500">
                <div className="flex items-center gap-2 break-all">
                  <Mail size={15} className="shrink-0 text-gray-400" />
                  <span className="max-w-full break-all">{message.email || 'No email available'}</span>
                </div>
                <div className="flex items-center gap-2 break-words">
                  <Phone size={15} className="shrink-0 text-gray-400" />
                  <span>{message.phone || 'No phone available'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-3">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${message.unread ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
              {message.unread ? 'Unread' : 'Read'}
            </span>
            <span className="text-sm text-gray-400">{formatFullDate(message.createdAt)}</span>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-100" />

      <div className="flex-1 overflow-y-auto p-5 sm:p-6">
        <div className="rounded-2xl bg-white">
          {message.subject ? (
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Subject</p>
              <p className="mt-2 break-words text-base font-medium text-gray-700">{message.subject}</p>
            </div>
          ) : null}

          <div className="my-4 border-t border-gray-100" />

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Message</p>
            <p className="mt-4 max-w-full break-words whitespace-pre-wrap text-base leading-relaxed text-gray-700">
              {message.message}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
});

export default MessageDetails;
