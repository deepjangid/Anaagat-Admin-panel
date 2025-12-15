import { Layout, Menu } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  MdDashboard,
  MdViewCarousel,
  MdInfoOutline,
  MdMiscellaneousServices,
  MdQuestionAnswer,
  MdWork,
  MdLogout,
} from 'react-icons/md';

const { Sider } = Layout;

const Sidebar = ({ collapsed }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      key: '/dashboard',
      icon: <MdDashboard size={20} />,
      label: 'Dashboard',
    },
    {
      key: '/jobs',
      icon: <MdWork size={20} />,
      label: 'Jobs',
    },
    {
      key: '/banner',
      icon: <MdViewCarousel size={20} />,
      label: 'Banner',
    },
    {
      key: '/about-us',
      icon: <MdInfoOutline size={20} />,
      label: 'About Us',
    },
    {
      key: '/services',
      icon: <MdMiscellaneousServices size={20} />,
      label: 'Services',
    },
    {
      key: '/faqs',
      icon: <MdQuestionAnswer size={20} />,
      label: 'FAQs',
    },
  ];

  const handleMenuClick = ({ key }) => {
    if (key === 'logout') {
      // Handle logout logic here
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login');
    } else {
      navigate(key);
    }
  };

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      trigger={null}
      width={250}
      style={{
        overflow: 'auto',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
      }}
    >
      <div className="logo">
        {collapsed ? 'AD' : 'Admin Dashboard'}
      </div>
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[location.pathname]}
        onClick={handleMenuClick}
        items={menuItems}
      />
      <div style={{ position: 'absolute', bottom: 0, width: '100%' }}>
        <Menu
          theme="dark"
          mode="inline"
          onClick={handleMenuClick}
          items={[
            {
              key: 'logout',
              icon: <MdLogout size={20} />,
              label: 'Logout',
              danger: true,
            },
          ]}
        />
      </div>
    </Sider>
  );
};

export default Sidebar;