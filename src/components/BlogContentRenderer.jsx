import { sanitizeBlogHtml } from '../utils/blogHtml';

const BlogContentRenderer = ({ content, className = '' }) => (
  <div
    className={`prose prose-slate max-w-none prose-headings:font-semibold prose-headings:text-slate-900 prose-p:text-slate-700 prose-p:leading-8 prose-li:text-slate-700 prose-a:text-teal-700 prose-a:no-underline hover:prose-a:text-teal-800 prose-strong:text-slate-900 prose-img:rounded-xl prose-img:shadow-sm ${className}`.trim()}
    dangerouslySetInnerHTML={{ __html: sanitizeBlogHtml(content) }}
  />
);

export default BlogContentRenderer;
