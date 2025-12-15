import { Layout, Button, Avatar, Badge, Dropdown } from 'antd';
import { MdMenu, MdNotifications, MdPerson } from 'react-icons/md';

const { Header: AntHeader } = Layout;

const Header = ({ collapsed, setCollapsed }) => {
  const userMenuItems = [
    {
      key: 'profile',
      label: 'Profile',
    },
    {
      key: 'settings',
      label: 'Settings',
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      label: 'Logout',
      danger: true,
    },
  ];

  return (
    <AntHeader
      style={{
        marginLeft: collapsed ? 80 : 250,
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
      </div>
      <div className="header-right">
        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
          <Avatar
            size={40}
            icon={<MdPerson />}
            style={{ cursor: 'pointer', backgroundColor: '#1890ff' }}
          />
        </Dropdown>
      </div>
    </AntHeader>
  );
};

export default Header;