import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { adminAPI } from '../services/api';

const POLL_INTERVAL = 3000;
const INBOX_CACHE_KEY = 'admin-inbox-cache-v1';
const SOUND_ENABLED = String(import.meta.env.VITE_ENABLE_NOTIFICATION_SOUND || '').trim() === 'true';

const readCachedInbox = () => {
  try {
    const raw = localStorage.getItem(INBOX_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.messages) ? parsed.messages : [];
  } catch {
    return [];
  }
};

const writeCachedInbox = (messages) => {
  try {
    localStorage.setItem(INBOX_CACHE_KEY, JSON.stringify({ messages, updatedAt: Date.now() }));
  } catch {
    // ignore cache failures
  }
};

const formatMessageTime = (value) => {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const diffMs = date.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);
  const absoluteMinutes = Math.abs(diffMinutes);

  if (absoluteMinutes < 1) return 'Just now';
  if (absoluteMinutes < 60) return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(diffMinutes, 'minute');

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(diffHours, 'hour');
  }

  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 7) {
    return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(diffDays, 'day');
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
};

const normalizeMessage = (item) => {
  const createdAt = item?.createdAt || item?.updatedAt || null;
  const id = String(item?._id || item?.id || '');
  const name = String(item?.name || item?.fullName || item?.email || 'Unknown').trim();
  const email = String(item?.email || '').trim();
  const phone = String(item?.phone || item?.mobile || item?.contactNumber || '').trim();
  const subject = String(item?.subject || '').trim();
  const body = String(item?.message || item?.description || item?.notes || '').trim();
  const message = body || subject || 'No message provided';
  const unread = item?.status ? item.status === 'unread' : !item?.isRead;

  return {
    id,
    name,
    email,
    phone,
    subject,
    message,
    source: String(item?.source || item?.sourceLabel || 'Contact Form').trim(),
    status: unread ? 'unread' : 'read',
    unread,
    createdAt,
    time: formatMessageTime(createdAt),
  };
};

const sortByLatest = (items) =>
  [...items].sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime());

export const useMessages = () => {
  const [cachedMessages] = useState(() => readCachedInbox());
  const [messages, setMessages] = useState(cachedMessages);
  const [loading, setLoading] = useState(cachedMessages.length === 0);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const previousUnreadCountRef = useRef(0);

  const fetchMessages = useCallback(async ({ silent = false, signal } = {}) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      setError('');
      const response = await adminAPI.getContactInboxMessages({}, { signal });
      const nextItems = Array.isArray(response?.data?.items)
        ? sortByLatest(response.data.items.map(normalizeMessage))
        : [];

      setMessages(nextItems);
      writeCachedInbox(nextItems);
    } catch (fetchError) {
      if (fetchError?.name === 'CanceledError' || fetchError?.code === 'ERR_CANCELED') return;
      console.error('Inbox fetch failed:', fetchError);
      setError(fetchError?.response?.data?.message || 'Failed to load inbox messages.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchMessages({ signal: controller.signal });

    const intervalId = window.setInterval(() => {
      fetchMessages({ silent: true });
    }, POLL_INTERVAL);

    return () => {
      controller.abort();
      window.clearInterval(intervalId);
    };
  }, [fetchMessages]);

  const markAsRead = useCallback(async (id) => {
    let previousMessages = [];

    setMessages((currentMessages) => {
      previousMessages = currentMessages;
      return currentMessages.map((message) =>
        message.id === id
          ? {
              ...message,
              status: 'read',
              unread: false,
            }
          : message
      );
    });

    try {
      await adminAPI.markContactMessageRead(id);
    } catch (updateError) {
      console.error('Failed to update inbox message:', updateError);
      setMessages(previousMessages);
      throw updateError;
    }
  }, []);

  const unreadCount = useMemo(
    () => messages.filter((message) => message.unread).length,
    [messages]
  );

  useEffect(() => {
    if (loading) return;

    if (SOUND_ENABLED && unreadCount > previousUnreadCountRef.current) {
      try {
        const audio = new Audio('/notification.mp3');
        audio.volume = 0.35;
        void audio.play().catch(() => {});
      } catch {
        // Ignore notification sound failures.
      }
    }

    previousUnreadCountRef.current = unreadCount;
  }, [loading, unreadCount]);

  return {
    messages,
    loading,
    refreshing,
    error,
    unreadCount,
    fetchMessages,
    markAsRead,
  };
};

export default useMessages;
