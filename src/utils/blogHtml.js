import DOMPurify from 'dompurify';

const ALLOWED_TAGS = [
  'a',
  'b',
  'blockquote',
  'br',
  'em',
  'figure',
  'figcaption',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'i',
  'img',
  'li',
  'ol',
  'p',
  'span',
  'strong',
  'u',
  'ul',
];

const ALLOWED_ATTR = ['alt', 'class', 'href', 'rel', 'src', 'target', 'title'];

export const convertLegacyContentToHtml = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((paragraph) => String(paragraph || '').trim())
      .filter(Boolean)
      .map((paragraph) => `<p>${paragraph}</p>`)
      .join('');
  }

  return String(value || '');
};

const decodeHtmlIfNeeded = (value) => {
  const rawValue = String(value || '');
  const normalized = rawValue.replace(/&nbsp;/gi, ' ');

  if (typeof document === 'undefined') {
    return normalized;
  }

  const textarea = document.createElement('textarea');
  textarea.innerHTML = normalized;
  const decoded = textarea.value;

  if (/(?:&lt;|&gt;|&#60;|&#62;)/i.test(normalized)) {
    return decoded;
  }

  return normalized;
};

export const sanitizeBlogHtml = (value) => {
  const rawHtml = decodeHtmlIfNeeded(convertLegacyContentToHtml(value));
  const sanitized = DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  });

  if (typeof document === 'undefined') return sanitized;

  const wrapper = document.createElement('div');
  wrapper.innerHTML = sanitized;

  wrapper.querySelectorAll('img').forEach((image) => {
    const src = String(image.getAttribute('src') || '').trim();
    if (!/^https?:\/\//i.test(src)) {
      image.remove();
      return;
    }

    image.classList.add('w-full', 'rounded-xl', 'my-4');
    image.removeAttribute('width');
    image.removeAttribute('height');
    image.setAttribute('loading', 'lazy');
    image.setAttribute('alt', image.getAttribute('alt') || 'Blog image');
  });

  wrapper.querySelectorAll('a').forEach((anchor) => {
    anchor.setAttribute('target', '_blank');
    anchor.setAttribute('rel', 'noreferrer noopener');
  });

  return wrapper.innerHTML.replace(/&nbsp;/gi, ' ');
};
