import { useEffect, useState } from 'react';
import {
  Avatar,
  Button,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Switch,
  Upload,
  message,
} from 'antd';
import { MdDeleteOutline, MdOutlineCloudUpload, MdRefresh } from 'react-icons/md';
import { uploadFile } from '../../services/api';

const { TextArea } = Input;

const TeamMemberForm = ({
  initialValues,
  editingId,
  onSubmit,
  onCancel,
  onValuesChange,
  saving = false,
}) => {
  const [form] = Form.useForm();
  const [imagePreview, setImagePreview] = useState(initialValues?.profileImage || '');

  useEffect(() => {
    form.setFieldsValue(initialValues);
    setImagePreview(initialValues?.profileImage || '');
  }, [form, initialValues]);

  const emitValuesChange = (changedValues = {}) => {
    const nextValues = {
      ...form.getFieldsValue(),
      ...changedValues,
    };
    onValuesChange?.(nextValues);
  };

  const handleBeforeUpload = async (file) => {
    if (!file.type?.startsWith('image/')) {
      message.error('Please upload an image file.');
      return Upload.LIST_IGNORE;
    }

    try {
      const uploaded = await uploadFile(file);
      const asset = {
        url: String(uploaded?.url || '').trim(),
        fileId: String(uploaded?.fileId || '').trim(),
        name: String(uploaded?.name || file.name || '').trim(),
        size: Number(uploaded?.size || file.size || 0) || 0,
        type: String(uploaded?.type || file.type || '').trim().toLowerCase(),
      };

      setImagePreview(asset.url);
      form.setFieldValue('profileImage', asset.url);
      form.setFieldValue('profileImageAsset', asset);
      emitValuesChange({ profileImage: asset.url, profileImageAsset: asset });
    } catch (error) {
      console.error(error);
      message.error(error?.response?.data?.message || error.message || 'Failed to upload image.');
    }
    return false;
  };

  const handleRemoveImage = () => {
    setImagePreview('');
    form.setFieldValue('profileImage', '');
    form.setFieldValue('profileImageAsset', null);
    emitValuesChange({ profileImage: '', profileImageAsset: null });
  };

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={initialValues}
      onFinish={onSubmit}
      onValuesChange={(_, allValues) => onValuesChange?.(allValues)}
    >
      <Form.Item
        label="Full Name"
        name="fullName"
        rules={[{ required: true, message: 'Please enter the team member name.' }]}
      >
        <Input placeholder="Enter full name" size="large" />
      </Form.Item>

      <Form.Item
        label="Role / Position"
        name="role"
        rules={[{ required: true, message: 'Please enter the role or position.' }]}
      >
        <Input placeholder="Enter role or position" />
      </Form.Item>

      <Form.Item
        label="Short Description"
        name="shortDescription"
        rules={[{ required: true, message: 'Please add a short description.' }]}
      >
        <TextArea rows={4} maxLength={220} showCount placeholder="Short description for the website card" />
      </Form.Item>

      <Form.Item label="Profile Image" name="profileImage">
        <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50/80 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <Avatar
              size={72}
              src={imagePreview || undefined}
              style={{
                background: 'linear-gradient(135deg, #0f766e 0%, #0ea5e9 100%)',
                color: '#fff',
                fontWeight: 700,
              }}
            >
              {!imagePreview ? String(form.getFieldValue('fullName') || 'TM').slice(0, 2).toUpperCase() : null}
            </Avatar>

            <div className="flex-1">
              <div className="mb-2 text-sm font-medium text-slate-700">
                Upload a square profile photo for the website card preview.
              </div>
              <Space wrap>
                <Upload
                  accept="image/*"
                  maxCount={1}
                  showUploadList={false}
                  beforeUpload={handleBeforeUpload}
                >
                  <Button icon={<MdOutlineCloudUpload />}>Upload Image</Button>
                </Upload>
                {imagePreview ? (
                  <Button icon={<MdDeleteOutline />} danger onClick={handleRemoveImage}>
                    Remove
                  </Button>
                ) : null}
              </Space>
            </div>
          </div>
        </div>
      </Form.Item>

      <div className="grid gap-4 md:grid-cols-2">
        <Form.Item
          label="LinkedIn URL"
          name="linkedInUrl"
          rules={[{ type: 'url', warningOnly: true, message: 'Enter a valid LinkedIn URL.' }]}
        >
          <Input placeholder="https://www.linkedin.com/in/..." />
        </Form.Item>

        <Form.Item
          label="Email"
          name="email"
          rules={[
            { required: true, message: 'Please enter an email address.' },
            { type: 'email', message: 'Enter a valid email address.' },
          ]}
        >
          <Input placeholder="name@company.com" />
        </Form.Item>
      </div>

      

    

      <Form.Item className="mb-0">
        <Space wrap>
          <Button  type="primary" htmlType="submit">
            {saving ? 'Saving...' : editingId ? 'Update Team Member' : 'Create Team Member'}
          </Button>
          <Button onClick={onCancel} disabled={saving}>Cancel</Button>
          <Button
            icon={<MdRefresh />}
            disabled={saving}
            onClick={() => {
              form.setFieldsValue(initialValues);
              setImagePreview(initialValues?.profileImage || '');
              onValuesChange?.(initialValues);
            }}
          >
            Reset Form
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );
};

export default TeamMemberForm;
