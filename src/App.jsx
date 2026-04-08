import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Layout } from 'antd';
import { useState } from 'react';
import { SpeedInsights } from '@vercel/speed-insights/react';

import Sidebar from './components/Sidebar';
import Header from './components/Header';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Jobs from './pages/Jobs';
import Applications from './pages/ApplicationsPage';
import Banner from './pages/Banner';
import AboutUs from './pages/AboutUs';
import Services from './pages/Services';
import Faqs from './pages/Faqs';
import CandidateProfiles from './pages/CandidateProfiles';
import ClientProfiles from './pages/ClientProfiles';
import ContactMessages from './pages/ContactMessages';
import Resumes from './pages/Resumes';

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
    <>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AdminLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="jobs" element={<Jobs />} />
            <Route path="job-requirements" element={<Jobs />} />
            <Route path="applications" element={<Applications />} /> {/* ← NEW */}
            <Route path="candidate-profiles" element={<CandidateProfiles />} />
            <Route path="client-profiles" element={<ClientProfiles />} />
            <Route path="contact-messages" element={<ContactMessages />} />
            <Route path="resumes" element={<Resumes />} />
            <Route path="banner" element={<Banner />} />
            <Route path="about-us" element={<AboutUs />} />
            <Route path="services" element={<Services />} />
            <Route path="faqs" element={<Faqs />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      <SpeedInsights />
    </>
  );
}

export default App;
