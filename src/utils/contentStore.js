const STORAGE_PREFIX = 'anaagat-admin-content';

const clone = (value) => JSON.parse(JSON.stringify(value));

export const contentDefaults = {
  about: {
    title: 'About Anaagat',
    subtitle: 'Trusted hiring and workforce support for modern teams',
    description:
      'Anaagat helps companies hire faster, build stronger teams, and connect with qualified candidates through practical recruitment support and dependable communication.',
    mission:
      'To simplify hiring with responsive service, clear communication, and talent solutions that create long-term value.',
    vision:
      'To become the first-choice recruitment and staffing partner for growing businesses across industries.',
    leadershipNote:
      'We combine people-first recruiting with structured delivery so every client and candidate gets a smoother experience.',
    highlights: [
      'End-to-end recruitment support',
      'Screened candidate pipelines',
      'Responsive client coordination',
      'Support across multiple hiring roles',
    ],
    stats: [
      '500+ candidate conversations managed',
      '100+ hiring requirements supported',
      '24-hour average first response goal',
    ],
  },
  banners: [
    {
      id: 'banner-1',
      title: 'Build Better Teams With Anaagat',
      description: 'Recruitment support, candidate screening, and hiring coordination in one place.',
      image:
        'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80',
      ctaLabel: 'Contact Us',
      ctaLink: '/contact',
      status: 'Active',
    },
    {
      id: 'banner-2',
      title: 'Fast Hiring Support For Growing Companies',
      description: 'From requirement collection to shortlist delivery, we keep the process moving.',
      image:
        'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80',
      ctaLabel: 'View Services',
      ctaLink: '/services',
      status: 'Active',
    },
  ],
  services: [
    {
      id: 'service-1',
      name: 'Permanent Hiring',
      category: 'Recruitment',
      description: 'Source, screen, and shortlist candidates for full-time roles across functions.',
      status: 'Active',
    },
    {
      id: 'service-2',
      name: 'Bulk Hiring',
      category: 'Operations',
      description: 'Structured support for high-volume recruitment with faster coordination.',
      status: 'Active',
    },
    {
      id: 'service-3',
      name: 'Profile Screening',
      category: 'Consulting',
      description: 'Validate profiles against role expectations before they reach the interview stage.',
      status: 'Active',
    },
  ],
  faqs: [
    {
      id: 'faq-1',
      category: 'Hiring',
      question: 'What industries do you support?',
      answer: 'We support multiple hiring categories and can adapt our sourcing based on your role requirements.',
    },
    {
      id: 'faq-2',
      category: 'Process',
      question: 'How quickly can you start working on a requirement?',
      answer: 'We aim to begin coordination quickly after receiving the requirement and role details.',
    },
    {
      id: 'faq-3',
      category: 'Candidates',
      question: 'Do you pre-screen candidates?',
      answer: 'Yes. Candidate profiles are reviewed before shortlist sharing to improve relevance.',
    },
  ],
  blogs: [
    {
      id: 'blog-1',
      title: 'How To Write A Better Job Requirement',
      category: 'Hiring Tips',
      author: 'Anaagat Team',
      publishDate: '2026-04-01',
      status: 'Published',
      excerpt: 'A clear job requirement helps the right candidates understand the role faster.',
      content:
        'Define outcomes, responsibilities, essential skills, and location details clearly. The more specific the role brief is, the stronger the shortlist quality becomes.',
    },
    {
      id: 'blog-2',
      title: 'Why Candidate Follow-Up Matters',
      category: 'Recruitment',
      author: 'Anaagat Team',
      publishDate: '2026-04-08',
      status: 'Draft',
      excerpt: 'Faster follow-up reduces drop-off and improves candidate confidence.',
      content:
        'Candidates often disengage when communication slows down. A simple update rhythm helps maintain momentum and trust during the hiring process.',
    },
  ],
};

export const readContent = (section) => {
  if (typeof window === 'undefined') {
    return clone(contentDefaults[section]);
  }

  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}:${section}`);
    if (!raw) return clone(contentDefaults[section]);

    const parsed = JSON.parse(raw);
    if (parsed === null || parsed === undefined) return clone(contentDefaults[section]);
    return parsed;
  } catch {
    return clone(contentDefaults[section]);
  }
};

export const saveContent = (section, value) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(`${STORAGE_PREFIX}:${section}`, JSON.stringify(value));
};

export const resetContent = (section) => {
  const value = clone(contentDefaults[section]);
  saveContent(section, value);
  return value;
};

export const makeId = (prefix) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
