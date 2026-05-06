import { Avatar, Button, Card, Empty, Space, Tag } from 'antd';
import { FaLinkedinIn } from 'react-icons/fa6';
import {
  MdAlternateEmail,
  MdDelete,
  MdEdit,
} from 'react-icons/md';

const TeamMembersList = ({
  items,
  onEdit,
  onDelete,
  disabled = false,
}) => {
  if (!items.length) {
    return <Empty description="No team members match the current filters." />;
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {items.map((member) => {
        const initials = String(member.fullName || 'TM')
          .split(' ')
          .filter(Boolean)
          .slice(0, 2)
          .map((part) => part[0]?.toUpperCase())
          .join('');

        const socialSummary = [
          member.linkedInUrl ? { key: 'linkedin', icon: <FaLinkedinIn size={14} />, label: 'LinkedIn' } : null,
          member.email ? { key: 'email', icon: <MdAlternateEmail size={16} />, label: 'Email' } : null,
     
        ].filter(Boolean);

        return (
          <Card
            key={member._id}
            className="admin-surface-card"
            styles={{ body: { padding: 20 } }}
          >
            <div className="flex h-full flex-col gap-4">
              <div className="flex items-start gap-4">
                <Avatar
                  size={60}
                  src={member.profileImage || undefined}
                  style={{
                    background: 'linear-gradient(135deg, #0f766e 0%, #0ea5e9 100%)',
                    color: '#fff',
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {!member.profileImage ? initials || 'TM' : null}
                </Avatar>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="admin-table-title">{member.fullName}</div>
                    <Tag color={member.cardStyleVariant === 'featured' ? 'gold' : 'default'}>
                      {member.cardStyleVariant === 'featured' ? 'Featured' : 'Light'}
                    </Tag>
                    <Tag color={member.active ? 'green' : 'default'}>
                      {member.active ? 'Active' : 'Inactive'}
                    </Tag>
                  </div>
                  <div className="admin-table-subtitle mt-1">{member.role}</div>
                </div>
              </div>

              <p className="admin-clamp-two m-0 text-sm leading-6 text-slate-600">
                {member.shortDescription}
              </p>

              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">

                {socialSummary.length ? (
                  socialSummary.map((item) => (
                    <span
                      key={item.key}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1"
                    >
                      {item.icon}
                      {item.label}
                    </span>
                  ))
                ) : (
                  <span className="rounded-full border border-dashed border-slate-200 px-2.5 py-1">
                    No social links
                  </span>
                )}
              </div>

              <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
                <Space wrap>
                  <Button type="primary" icon={<MdEdit />} onClick={() => onEdit(member)} disabled={disabled}>
                    Edit
                  </Button>
                  <Button danger icon={<MdDelete />} onClick={() => onDelete(member)} disabled={disabled}>
                    Delete
                  </Button>
                </Space>

             
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default TeamMembersList;
