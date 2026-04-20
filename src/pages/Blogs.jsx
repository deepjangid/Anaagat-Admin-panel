import { useEffect, useRef, useState } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { Button, Card, Form, Image, Input, Modal, Popconfirm, Space, Table, Tag, Typography, message } from 'antd';
import { MdAdd, MdDelete, MdEdit, MdRefresh, MdUpload, MdVisibility } from 'react-icons/md';
import { blogPostsAPI, blogUploadsAPI } from '../services/api';
import BlogContentRenderer from '../components/BlogContentRenderer';

const { TextArea } = Input;
const { Paragraph, Text } = Typography;

const quillFormats = [
  'header',
  'bold',
  'italic',
  'underline',
  'list',
  'bullet',
  'link',
  'image',
];

const emptyBlog = {
  title: '',
  slug: '',
  excerpt: '',
  coverImage: '',
  content: '',
  tags: '',
  readingTime: '',
  category: 'Hiring Tips',
  author: 'Anaagat Team',
  publishDate: '',
};

const splitMultilineField = (value) =>
  String(value || '')
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);

const normalizeMultilineField = (value) => {
  if (Array.isArray(value)) return value.join('\n');
  return String(value || '');
};

const truncate = (value, max = 90) => {
  const text = String(value || '').trim();
  if (!text) return '-';
  return text.length > max ? `${text.slice(0, max)}...` : text;
};

const stripHtml = (value) =>
  String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const hasEmbeddedBase64Image = (value) => /<img\b[^>]*\bsrc=["']data:image\//i.test(String(value || ''));
const isValidImageUrl = (value) => /^https?:\/\//i.test(String(value || '').trim());

const Blogs = () => {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [readingBlog, setReadingBlog] = useState(null);
  const [editorHtml, setEditorHtml] = useState('');
  const [form] = Form.useForm();
  const fileInputRef = useRef(null);
  const quillRef = useRef(null);

  const fetchBlogs = async () => {
    setLoading(true);
    try {
      const response = await blogPostsAPI.getAll();
      if (response.data?.success) {
        setItems(Array.isArray(response.data.blogPosts) ? response.data.blogPosts : []);
        return;
      }

      message.error('Failed to load blogs.');
    } catch (error) {
      console.error('Fetch blogs error:', error);
      message.error(error.response?.data?.message || 'Failed to load blogs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlogs();
  }, []);

  const closeModal = () => {
    setOpen(false);
    setEditingId(null);
    setEditorHtml('');
    form.resetFields();
  };

  const handleAdd = () => {
    setEditingId(null);
    setEditorHtml('');
    form.setFieldsValue(emptyBlog);
    setOpen(true);
  };

  const handleEdit = (item) => {
    setEditingId(item._id);
    setEditorHtml(String(item.content || ''));
    form.setFieldsValue({
      ...emptyBlog,
      ...item,
      tags: normalizeMultilineField(item.tags),
      content: String(item.content || ''),
    });
    setOpen(true);
  };

  const uploadImageFile = async (file) => {
    if (!file) {
      throw new Error('Image file is required.');
    }

    if (!String(file.type || '').startsWith('image/')) {
      throw new Error('Please select an image file.');
    }

    const maxFileSizeBytes = 10 * 1024 * 1024;
    if (file.size > maxFileSizeBytes) {
      throw new Error('Image is too large. Please choose an image smaller than 10 MB.');
    }

    const response = await blogUploadsAPI.uploadImage(file);
    const imageUrl = String(response.data?.url || '').trim();

    if (!isValidImageUrl(imageUrl)) {
      throw new Error('Uploaded image URL is invalid.');
    }

    return imageUrl;
  };

  const handleDelete = async (id) => {
    try {
      const response = await blogPostsAPI.delete(id);
      if (response.data?.success) {
        message.success('Blog deleted successfully.');
        fetchBlogs();
      }
    } catch (error) {
      console.error('Delete blog error:', error);
      message.error(error.response?.data?.message || 'Failed to delete blog.');
    }
  };

  const handleCoverFileChange = async (event) => {
    const file = event?.target?.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const imageUrl = await uploadImageFile(file);
      form.setFieldValue('coverImage', imageUrl);
      message.success('Cover image uploaded successfully.');
    } catch (error) {
      console.error('Cover image upload error:', error);
      message.error(error.message || 'Failed to upload image from device.');
    }
  };

  const handleEditorImageInsert = () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      try {
        const imageUrl = await uploadImageFile(file);
        const quill = quillRef.current?.getEditor?.();
        if (!quill) {
          message.error('Editor is not ready yet.');
          return;
        }

        const range = quill.getSelection(true) || { index: quill.getLength(), length: 0 };
        quill.insertEmbed(range.index, 'image', imageUrl, 'user');
        quill.setSelection(range.index + 1, 0, 'silent');
        message.success('Editor image uploaded successfully.');
      } catch (error) {
        console.error('Editor image upload error:', error);
        message.error(error.message || 'Failed to upload editor image.');
      }
    };
  };

  const quillModules = {
    toolbar: {
      container: [
        ['bold', 'italic', 'underline'],
        [{ header: [1, 2, 3, false] }],
        ['link', 'image'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['clean'],
      ],
      handlers: {
        image: handleEditorImageInsert,
      },
    },
  };

  const handleSubmit = async (values) => {
    try {
      if (values.coverImage && !isValidImageUrl(values.coverImage)) {
        message.error('Cover image must be a valid http or https URL.');
        return;
      }

      if (hasEmbeddedBase64Image(editorHtml)) {
        message.error('Base64 images are not allowed. Please upload images using the editor image button.');
        return;
      }

      const payload = {
        ...values,
        tags: splitMultilineField(values.tags),
        content: editorHtml,
        status: 'Published',
        isPublished: true,
      };

      const response = editingId
        ? await blogPostsAPI.update(editingId, payload)
        : await blogPostsAPI.create(payload);

      if (response.data?.success) {
        message.success(editingId ? 'Blog updated successfully.' : 'Blog added successfully.');
        if (response.data.blogPost) {
          setItems((prev) => {
            if (editingId) {
              return prev.map((item) => (item._id === editingId ? response.data.blogPost : item));
            }
            return [response.data.blogPost, ...prev];
          });
        }
        closeModal();
        fetchBlogs();
      }
    } catch (error) {
      console.error('Save blog error:', error);
      const statusCode = error.response?.status;
      const serverMessage = error.response?.data?.message;

      if (statusCode === 413) {
        message.error('Cover image is too large for upload. Please use a smaller image.');
        return;
      }

      message.error(serverMessage || 'Failed to save blog.');
    }
  };

  const columns = [
    {
      title: 'Cover',
      dataIndex: 'coverImage',
      key: 'coverImage',
      width: 110,
      render: (value) =>
        value ? (
          <Image src={value} alt="Blog cover" width={72} height={48} style={{ objectFit: 'contain', borderRadius: 8 }} />
        ) : (
          <Text type="secondary">No image</Text>
        ),
    },
    {
      title: 'Title',
      key: 'title',
      width: 300,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Text strong>{truncate(record.title, 70)}</Text>
          <Text type="secondary">{record.slug || '-'}</Text>
        </Space>
      ),
    },
    {
      title: 'Excerpt',
      dataIndex: 'excerpt',
      key: 'excerpt',
      width: 260,
      render: (value) => (
        <Paragraph style={{ marginBottom: 0 }} ellipsis={{ rows: 2, expandable: false }}>
          {value || '-'}
        </Paragraph>
      ),
    },
    {
      title: 'Content',
      dataIndex: 'content',
      key: 'content',
      width: 320,
      render: (value) => (
        <Paragraph style={{ marginBottom: 0 }} ellipsis={{ rows: 3, expandable: false }}>
          {truncate(stripHtml(value), 180)}
        </Paragraph>
      ),
    },
    {
      title: 'Tags',
      dataIndex: 'tags',
      key: 'tags',
      width: 220,
      render: (tags) =>
        Array.isArray(tags) && tags.length ? (
          <Space size={[4, 4]} wrap>
            {tags.map((tag) => (
              <Tag key={tag} color="blue">
                {tag}
              </Tag>
            ))}
          </Space>
        ) : (
          '-'
        ),
    },
    {
      title: 'Meta',
      key: 'meta',
      width: 180,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Text>{record.author || '-'}</Text>
          <Text type="secondary">{record.readingTime || 'No reading time'}</Text>
          <Text type="secondary">{record.publishDate || '-'}</Text>
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: () => <Tag color="green">Published</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 230,
      render: (_, record) => (
        <Space>
          <Button icon={<MdVisibility />} size="small" onClick={() => setReadingBlog(record)}>
            Read
          </Button>
          <Button type="primary" icon={<MdEdit />} size="small" onClick={() => handleEdit(record)}>
            Edit
          </Button>
          <Popconfirm title="Delete this blog?" okText="Delete" okButtonProps={{ danger: true }} onConfirm={() => handleDelete(record._id)}>
            <Button danger icon={<MdDelete />} size="small">
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header page-header-row">
        <h1>Blog Management</h1>
        <Space>
          <Button icon={<MdRefresh />} onClick={fetchBlogs}>
            Refresh
          </Button>
          <Button type="primary" icon={<MdAdd />} onClick={handleAdd}>
            Add Blog
          </Button>
        </Space>
      </div>

      <Card className="blog-editor-shell">
        <Table columns={columns} dataSource={items} rowKey="_id" loading={loading} scroll={{ x: 1900 }} />
      </Card>

      <Modal title={editingId ? 'Edit Blog' : 'Add Blog'} open={open} onCancel={closeModal} footer={null} width={1040}>
        <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={emptyBlog}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleCoverFileChange}
          />

          <Space direction="vertical" size={18} style={{ width: '100%' }}>
            <div
              style={{
                position: 'sticky',
                top: 0,
                zIndex: 5,
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: 14,
                padding: 12,
              }}
            >
              <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
                <Text strong>{editingId ? 'Update this blog' : 'Save this blog'}</Text>
                <Space>
                  <Button type="primary" htmlType="submit" disabled={!stripHtml(editorHtml)}>
                    {editingId ? 'Update Blog' : 'Save Blog'}
                  </Button>
                  <Button onClick={closeModal}>Cancel</Button>
                </Space>
              </Space>
            </div>

            <Form.Item label="Title" name="title" rules={[{ required: true, message: 'Please enter the blog title.' }]}>
              <Input placeholder="How to Hire Better Developers" />
            </Form.Item>

            <Space wrap style={{ width: '100%' }} align="start">
              <Form.Item label="Slug" name="slug" style={{ minWidth: 260, flex: 1 }}>
                <Input placeholder="how-to-hire-better-developers" />
              </Form.Item>

              <Form.Item label="Reading Time" name="readingTime" style={{ minWidth: 180 }}>
                <Input placeholder="6 min read" />
              </Form.Item>

              <Form.Item label="Publish Date" name="publishDate" rules={[{ required: true, message: 'Please enter the publish date.' }]} style={{ minWidth: 180 }}>
                <Input type="date" />
              </Form.Item>
            </Space>

            <Space wrap style={{ width: '100%' }} align="start">
              <Form.Item label="Category" name="category" style={{ minWidth: 220, flex: 1 }}>
                <Input placeholder="Hiring Tips" />
              </Form.Item>

              <Form.Item label="Author" name="author" style={{ minWidth: 220, flex: 1 }}>
                <Input placeholder="Anaagat Team" />
              </Form.Item>
            </Space>

            <Form.Item label="Cover Image" extra="Paste an image URL or upload from device. Cover uses object-contain so it won't crop.">
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <Form.Item name="coverImage" noStyle>
                  <Input placeholder="https://example.com/blog-cover.jpg or upload from device" />
                </Form.Item>
                <Space wrap>
                  <Button icon={<MdUpload />} onClick={() => fileInputRef.current?.click()}>
                    Upload From Device
                  </Button>
                  <Button onClick={() => form.setFieldValue('coverImage', '')}>Remove Cover</Button>
                </Space>
                <Form.Item shouldUpdate={(prev, next) => prev.coverImage !== next.coverImage} noStyle>
                  {() => {
                    const coverImage = form.getFieldValue('coverImage');
                    if (!coverImage) return <Text type="secondary">No cover selected</Text>;

                    return (
                      <div className="blog-editor-shell p-3">
                        <Image
                          src={coverImage}
                          alt="Cover preview"
                          width="100%"
                          style={{ maxHeight: 260, objectFit: 'contain', borderRadius: 16 }}
                        />
                      </div>
                    );
                  }}
                </Form.Item>
              </Space>
            </Form.Item>

            <Form.Item label="Tags" name="tags" extra="Comma or new-line separated tags">
              <TextArea rows={2} placeholder={'Hiring Tips, Tech'} />
            </Form.Item>

            <Form.Item label="Excerpt" name="excerpt" rules={[{ required: true, message: 'Please enter the short excerpt.' }]}>
              <TextArea rows={3} placeholder="A practical guide to improve hiring quality and speed." />
            </Form.Item>

            <Form.Item
              label="Blog Content"
              required
              validateStatus={stripHtml(editorHtml) ? '' : 'error'}
              help={stripHtml(editorHtml) ? '' : 'Please enter the blog content.'}
            >
              <div className="blog-editor-shell overflow-hidden">
                <ReactQuill
                  ref={quillRef}
                  theme="snow"
                  value={editorHtml}
                  onChange={setEditorHtml}
                  modules={quillModules}
                  formats={quillFormats}
                  placeholder="Start writing like Medium or Blogger..."
                />
              </div>
            </Form.Item>

            <Form.Item label="Live Preview">
              <div className="blog-article-card overflow-hidden">
                <div className="blog-article-shell py-6">
                  {form.getFieldValue('coverImage') ? (
                    <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <Image
                        src={form.getFieldValue('coverImage')}
                        alt="Preview cover"
                        width="100%"
                        preview={false}
                        style={{ maxHeight: 320, objectFit: 'contain', borderRadius: 16 }}
                      />
                    </div>
                  ) : null}

                  <Typography.Title level={2} style={{ marginTop: 0 }}>
                    {form.getFieldValue('title') || 'Preview title'}
                  </Typography.Title>

                  <Space wrap style={{ marginBottom: 16 }}>
                    <Tag color="green">Published</Tag>
                    {form.getFieldValue('category') ? <Tag color="blue">{form.getFieldValue('category')}</Tag> : null}
                    {form.getFieldValue('readingTime') ? <Tag>{form.getFieldValue('readingTime')}</Tag> : null}
                  </Space>

                  {form.getFieldValue('excerpt') ? (
                    <Paragraph style={{ fontSize: 16, lineHeight: 1.8 }}>
                      {form.getFieldValue('excerpt')}
                    </Paragraph>
                  ) : null}

                  <BlogContentRenderer content={editorHtml} />
                </div>
              </div>
            </Form.Item>
          </Space>
        </Form>
      </Modal>

      <Modal
        open={Boolean(readingBlog)}
        onCancel={() => setReadingBlog(null)}
        footer={null}
        width="min(1040px, calc(100vw - 24px))"
        styles={{ body: { padding: 0 } }}
      >
        {readingBlog ? (
          <div className="blog-article-card overflow-hidden rounded-none border-0 shadow-none">
            {readingBlog.coverImage ? (
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-4 sm:px-6">
                <Image
                  src={readingBlog.coverImage}
                  alt={readingBlog.title}
                  width="100%"
                  preview={false}
                  style={{ maxHeight: 380, objectFit: 'contain' }}
                />
              </div>
            ) : null}

            <article className="blog-article-shell py-6 sm:py-8">
              <Space direction="vertical" size={14} style={{ width: '100%' }}>
                <Space wrap>
                  <Tag color="green">Published</Tag>
                  {readingBlog.category ? <Tag color="blue">{readingBlog.category}</Tag> : null}
                  {readingBlog.readingTime ? <Tag>{readingBlog.readingTime}</Tag> : null}
                </Space>

                <Typography.Title level={1} style={{ margin: 0 }}>
                  {readingBlog.title}
                </Typography.Title>

                <Space wrap size={[8, 8]}>
                  <Text type="secondary">{readingBlog.author || 'Anaagat Team'}</Text>
                  <Text type="secondary">{readingBlog.publishDate || '-'}</Text>
                  {readingBlog.slug ? <Text type="secondary">/{readingBlog.slug}</Text> : null}
                </Space>

                {readingBlog.excerpt ? (
                  <Paragraph style={{ fontSize: 16, lineHeight: 1.8, marginBottom: 0 }}>
                    {readingBlog.excerpt}
                  </Paragraph>
                ) : null}

                {Array.isArray(readingBlog.tags) && readingBlog.tags.length ? (
                  <Space wrap size={[6, 6]}>
                    {readingBlog.tags.map((tag) => (
                      <Tag key={tag} color="blue">
                        {tag}
                      </Tag>
                    ))}
                  </Space>
                ) : null}

                <BlogContentRenderer content={readingBlog.content} className="pt-2" />
              </Space>
            </article>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default Blogs;
