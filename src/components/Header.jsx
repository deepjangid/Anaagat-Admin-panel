import { Layout, Button, Avatar, Dropdown, Space, Typography } from 'antd';
import { MdMenu } from 'react-icons/md';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';

const { Header: AntHeader } = Layout;
const { Text } = Typography;

const formatBadgeCount = (count) => (count > 99 ? '99+' : count);

const Header = ({
  collapsed,
  setCollapsed,
  isMobile = false,
  unreadCount = 0,
}) => {
  const navigate = useNavigate();
  const userMenuItems = [
    {
      key: 'profile',
      label: 'Profile',
    },
  ];

  const handleUserMenuClick = ({ key }) => {
    if (key === 'profile') {
      navigate('/dashboard');
    }
  };

  return (
    <AntHeader
      className="admin-header"
      style={{
        marginLeft: isMobile ? 0 : (collapsed ? 86 : 250),
        transition: 'all 0.2s',
      }}
    >
      <div className="header-left">
        <Button
          type="text"
          icon={<MdMenu size={24} />}
          onClick={() => setCollapsed(!collapsed)}
          style={{
            fontSize: '16px',
            width: 40,
            height: 40,
          }}
        />
        <div className="admin-header-copy">
          <Text className="admin-header-eyebrow">Admin workspace</Text>
          <Text className="admin-header-title">Manage your content and hiring pipeline</Text>
        </div>
      </div>
      <div className="header-right">
        <button
          type="button"
          onClick={() => navigate('/admin/inbox')}
          className="relative flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-all duration-200 hover:scale-[1.01] hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
          aria-label="Open inbox notifications"
          data-tour="header-inbox-button"
        >
          <Bell size={18} />
          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex min-w-5 animate-bounce items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white shadow-sm">
              {formatBadgeCount(unreadCount)}
            </span>
          ) : null}
        </button>
        <Dropdown menu={{ items: userMenuItems, onClick: handleUserMenuClick }} placement="bottomRight">
          <Space className="admin-header-profile" size={12} data-tour="header-profile-settings">
            <div className="admin-header-profile-copy">
              <Text className="admin-header-profile-label">Administrator</Text>
              <Text className="admin-header-profile-link">View profile</Text>
            </div>
            <Avatar
              size={42}
              src={<img src={logo} alt="Anaagat" className="admin-header-avatar-logo" />}
              style={{ cursor: 'pointer', backgroundColor: '#ffffff' }}
            />
          </Space>
        </Dropdown>
      </div>
    </AntHeader>
  );
};

export default Header;
