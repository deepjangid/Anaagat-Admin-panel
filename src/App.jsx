import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Layout } from 'antd';
import { useEffect, useState } from 'react';

import Sidebar from './components/Sidebar';
import Header from './components/Header';

import Login from './pages/Login';
import Dashboard from './pages/DashboardPanel';
import Jobs from './pages/Jobs';
import Openings from './pages/Openings';
import Applications from './pages/ApplicationsOverview';
import CandidateResponsePage from './pages/CandidateResponsePage';
import BannerPage from './pages/BannerPage';
import AboutUsPage from './pages/AboutUsPage';
import ServicesPage from './pages/ServicesPage';
import FaqsPage from './pages/FaqsPage';
import CandidateProfilesPage from './pages/CandidateProfilesView';
import ClientProfilesPage from './pages/ClientProfilesView';
import ContactMessages from './pages/ContactMessagesView';
import Resumes from './pages/Resumes';
import Blogs from './pages/Blogs';
import MyApplicationsPage from './pages/MyApplicationsPage';

import './App.css';

const { Content } = Layout;

const ProtectedRoute = () => {
  const token = localStorage.getItem('token');
  return token ? <Outlet /> : <Navigate to="/login" replace />;
};

const AdminLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 991px)');

    const syncLayout = (event) => {
      const nextIsMobile = event.matches;
      setIsMobile(nextIsMobile);
      if (nextIsMobile) {
        setCollapsed(true);
      }
    };

    syncLayout(mediaQuery);

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', syncLayout);
      return () => mediaQuery.removeEventListener('change', syncLayout);
    }

    mediaQuery.addListener(syncLayout);
    return () => mediaQuery.removeListener(syncLayout);
  }, []);

  return (
    <Layout className="admin-app-shell" style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} isMobile={isMobile} onNavigate={() => {
        if (isMobile) setCollapsed(true);
      }} />
      {isMobile && !collapsed && (
        <div
          className="admin-sidebar-backdrop"
          onClick={() => setCollapsed(true)}
          aria-hidden="true"
        />
      )}
      <Layout className="admin-main-shell">
        <Header collapsed={collapsed} setCollapsed={setCollapsed} isMobile={isMobile} />
        <Content
          className="admin-content"
          style={{
            marginLeft: isMobile ? 0 : (collapsed ? 86 : 250),
            transition: 'all 0.2s ease-in-out',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="jobs" element={<Jobs />} />
          <Route path="job-requirements" element={<Jobs />} />
          <Route path="openings" element={<Openings />} />
          <Route path="applications" element={<Applications />} /> {/* ← NEW */}
          <Route path="candidate-response" element={<CandidateResponsePage />} />
          <Route path="candidate-profiles" element={<CandidateProfilesPage />} />
          <Route path="client-profiles" element={<ClientProfilesPage />} />
          <Route path="contact-messages" element={<ContactMessages />} />
          <Route path="resumes" element={<Resumes />} />
          <Route path="my-applications" element={<MyApplicationsPage />} />
          <Route path="banner" element={<BannerPage />} />
          <Route path="about-us" element={<AboutUsPage />} />
          <Route path="services" element={<ServicesPage />} />
          <Route path="faqs" element={<FaqsPage />} />
          <Route path="blogs" element={<Blogs />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
