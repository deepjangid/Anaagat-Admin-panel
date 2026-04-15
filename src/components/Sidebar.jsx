import { Layout, Menu } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  MdDashboard,
  MdViewCarousel,
  MdInfoOutline,
  MdMiscellaneousServices,
  MdQuestionAnswer,
  MdWork,
  MdPeople,   // ← NEW
  MdPerson,
  MdBusiness,
  MdMail,
  MdDescription,
  MdArticle,
  MdLogout,
} from 'react-icons/md';
import logo from '../assets/logo.png';

const { Sider } = Layout;

const Sidebar = ({ collapsed, isMobile = false, onNavigate }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      key: '/dashboard',
      icon: <MdDashboard size={20} />,
      label: 'Dashboard',
    },
    {
      key: '/job-requirements',
      icon: <MdWork size={20} />,
      label: 'Client Requirements ',
    },
    {
      key: '/openings',
      icon: <MdWork size={20} />,
      label: 'Openings',
    },
    {
      key: '/applications',       // ← NEW
      icon: <MdPeople size={20} />,
      label: 'Applications',
    },
    {
      key: '/candidate-profiles',
      icon: <MdPerson size={20} />,
      label: 'Candidate Profiles',
    },
    {
      key: '/client-profiles',
      icon: <MdBusiness size={20} />,
      label: 'Client Profiles',
    },
    {
      key: '/contact-messages',
      icon: <MdMail size={20} />,
      label: 'All Contacts',
    },
    {
      key: '/resumes',
      icon: <MdDescription size={20} />,
      label: 'Resumes',
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
    {
      key: '/blogs',
      icon: <MdArticle size={20} />,
      label: 'Blogs',
    },
  ];

  const handleMenuClick = ({ key }) => {
    if (key === 'logout') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login');
    } else {
      navigate(key);
    }

    onNavigate?.();
  };

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      trigger={null}
      width={isMobile ? 280 : 250}
      collapsedWidth={isMobile ? 0 : 86}
      breakpoint="lg"
      className={`admin-sidebar ${isMobile ? 'is-mobile' : ''}`}
      style={{
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div className={`admin-sidebar-brand ${collapsed ? 'is-collapsed' : ''}`}>
        <div className="admin-sidebar-brand-mark">
          <img src={logo} alt="Anaagat" className="admin-sidebar-logo" />
        </div>
        {!collapsed && (
          <div className="admin-sidebar-brand-copy">
            <span className="admin-sidebar-brand-title">Anaagat</span>
            <span className="admin-sidebar-brand-subtitle">Admin Panel</span>
          </div>
        )}
      </div>

      <div className="admin-sidebar-menu-wrap">
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          onClick={handleMenuClick}
          items={menuItems}
          className="admin-sidebar-menu"
        />
      </div>

      <div className="admin-sidebar-footer">
        <Menu
          theme="dark"
          mode="inline"
          onClick={handleMenuClick}
          className="admin-sidebar-menu admin-sidebar-logout"
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
