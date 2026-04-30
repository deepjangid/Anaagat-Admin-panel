import { Avatar, Button, Tag, Tooltip } from 'antd';
import { FaLinkedinIn } from 'react-icons/fa6';
import { MdAlternateEmail, MdLink, MdOutlineVisibility } from 'react-icons/md';

const TeamCardPreview = ({ member, compact = false }) => {
  const initials = String(member?.fullName || 'TM')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  const isFeatured = member?.cardStyleVariant === 'featured';
  const socialItems = [
    {
      key: 'linkedin',
      href: member?.linkedInUrl,
      icon: <FaLinkedinIn size={16} />,
      label: 'LinkedIn',
    },
    {
      key: 'email',
      href: member?.email ? `mailto:${member.email}` : '',
      icon: <MdAlternateEmail size={18} />,
      label: 'Email',
    },
    {
      key: 'contact',
      href: member?.contactLink,
      icon: <MdLink size={18} />,
      label: 'Contact',
    },
  ].filter((item) => item.href);

  return (
    <div
      className={[
        'overflow-hidden rounded-[28px] border shadow-[0_24px_60px_rgba(15,23,42,0.08)] transition-all',
        compact ? 'p-5' : 'p-7',
        isFeatured
          ? 'border-amber-200 bg-[linear-gradient(160deg,#fff8eb_0%,#ffffff_38%,#ecfeff_100%)]'
          : 'border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]',
      ].join(' ')}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <Tag color={member?.active ? 'green' : 'default'}>{member?.active ? 'Active' : 'Inactive'}</Tag>
        {isFeatured ? (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">
            Featured
          </span>
        ) : null}
      </div>

      <div className="mb-5 flex items-center gap-4">
        <Avatar
          size={compact ? 72 : 88}
          src={member?.profileImage || undefined}
          style={{
            background: 'linear-gradient(135deg, #0f766e 0%, #0ea5e9 100%)',
            color: '#f8fafc',
            fontWeight: 700,
          }}
        >
          {!member?.profileImage ? initials || 'TM' : null}
        </Avatar>

        <div className="min-w-0">
          <div className="mb-1 text-xl font-semibold leading-tight text-slate-900">
            {member?.fullName || 'Team Member'}
          </div>
          <div className="text-sm font-medium text-teal-700">{member?.role || 'Role / Position'}</div>
        </div>
      </div>

      <p className="mb-5 text-sm leading-6 text-slate-600">
        {member?.shortDescription || 'A short description will appear here in the live preview.'}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {socialItems.length ? (
          socialItems.map((item) => (
            <Tooltip key={item.key} title={item.label}>
              <Button
                type="text"
                shape="circle"
                size="large"
                className="!border !border-slate-200 !bg-white !text-slate-700 shadow-sm hover:!border-teal-300 hover:!text-teal-700"
                icon={item.icon}
              />
            </Tooltip>
          ))
        ) : (
          <div className="inline-flex items-center gap-2 rounded-full border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">
            <MdOutlineVisibility size={16} />
            Social actions preview
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamCardPreview;
