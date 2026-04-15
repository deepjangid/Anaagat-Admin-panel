import { Layout, Button, Avatar, Dropdown, Space, Typography } from 'antd';
import { MdMenu } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';

const { Header: AntHeader } = Layout;
const { Text } = Typography;

const Header = ({ collapsed, setCollapsed, isMobile = false }) => {
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
        <Dropdown menu={{ items: userMenuItems, onClick: handleUserMenuClick }} placement="bottomRight">
          <Space className="admin-header-profile" size={12}>
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
