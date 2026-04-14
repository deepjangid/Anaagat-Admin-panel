import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Layout } from 'antd';
import { useState } from 'react';

import Sidebar from './components/Sidebar';
import Header from './components/Header';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Jobs from './pages/Jobs';
import Applications from './pages/ApplicationsPage';
import BannerPage from './pages/BannerPage';
import AboutUsPage from './pages/AboutUsPage';
import ServicesPage from './pages/ServicesPage';
import FaqsPage from './pages/FaqsPage';
import CandidateProfilesPage from './pages/CandidateProfilesPage';
import ClientProfilesPage from './pages/ClientProfilesPage';
import ContactMessages from './pages/ContactMessages';
import Resumes from './pages/Resumes';
import Blogs from './pages/Blogs';

import './App.css';

const { Content } = Layout;

const ProtectedRoute = () => {
  const token = localStorage.getItem('token');
  return token ? <Outlet /> : <Navigate to="/login" replace />;
};

const AdminLayout = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} />
      <Layout>
        <Header collapsed={collapsed} setCollapsed={setCollapsed} />
        <Content
          style={{
            margin: '24px 16px',
            padding: 24,
            background: '#f0f2f5',
            marginLeft: collapsed ? '4.5rem' : '16rem',
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
          <Route path="applications" element={<Applications />} /> {/* ← NEW */}
          <Route path="candidate-profiles" element={<CandidateProfilesPage />} />
          <Route path="client-profiles" element={<ClientProfilesPage />} />
          <Route path="contact-messages" element={<ContactMessages />} />
          <Route path="resumes" element={<Resumes />} />
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
