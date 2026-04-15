const EXCLUDED_KEYS = new Set(['__v']);

const toLabel = (key) =>
  String(key || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

export const formatRecordValue = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) {
    const items = value.map((item) => formatRecordValue(item)).filter((item) => item !== '—');
    return items.length ? items.join(', ') : '—';
  }
  if (typeof value === 'object') {
    if ('url' in value && typeof value.url === 'string') return value.url;
    if ('name' in value && typeof value.name === 'string') return value.name;
    const entries = Object.entries(value)
      .map(([key, item]) => {
        const formatted = formatRecordValue(item);
        if (formatted === '—') return null;
        return `${toLabel(key)}: ${formatted}`;
      })
      .filter(Boolean);
    return entries.length ? entries.join(', ') : '—';
  }
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
};

export const buildRecordDetails = (record, hiddenKeys = []) => {
  if (!record || typeof record !== 'object') return [];

  const hidden = new Set(hiddenKeys);

  return Object.entries(record)
    .filter(([key]) => !EXCLUDED_KEYS.has(key) && !hidden.has(key))
    .map(([key, value]) => ({
      key,
      label: toLabel(key),
      value: formatRecordValue(value),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
};
