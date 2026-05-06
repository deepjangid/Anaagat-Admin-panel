import { memo } from 'react';
import { getAvatarTheme } from '../utils/messageAvatar';

const MessageItem = memo(function MessageItem({ message, active, onSelect }) {
  const avatarLetter = message.name?.charAt(0)?.toUpperCase() || '?';

  return (
    <button
      type="button"
      onClick={() => onSelect(message)}
      className={[
        'group flex w-full items-start gap-3 rounded-lg border border-transparent p-3 text-left transition-all duration-200 hover:scale-[1.01]',
        active
          ? 'border-blue-100 bg-blue-50 shadow-sm ring-1 ring-blue-100'
          : 'hover:bg-gray-100',
        active ? '' : (message.unread ? 'bg-blue-50/60' : 'bg-white'),
      ].join(' ')}
    >
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-r text-sm font-semibold text-white ${getAvatarTheme(message.name)}`}>
        {avatarLetter}
      </div>

      <div className={`min-w-0 flex-1 ${active ? 'border-l-4 border-blue-500 pl-3' : 'pl-4'}`}>
        <div className="flex items-start justify-between gap-3">
          <p className="truncate text-sm font-semibold text-gray-900">{message.name}</p>
          <span className="shrink-0 text-xs font-medium text-gray-400">{message.time}</span>
        </div>

        <div className="mt-1 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-gray-500">{message.email || 'No email available'}</p>
            <p className={`mt-1 truncate text-sm ${message.unread ? 'font-medium text-gray-700' : 'text-gray-600'}`}>{message.message}</p>
          </div>
          {message.unread ? (
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
          ) : null}
        </div>
      </div>
    </button>
  );
});

export default MessageItem;
