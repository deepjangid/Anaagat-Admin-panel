import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from 'antd';
import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Banner from './pages/Banner';
import AboutUs from './pages/AboutUs';
import Services from './pages/Services';
import Faqs from './pages/Faqs';
import './App.css';

const { Content } = Layout;

function App() {
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
            marginLeft: collapsed ? '4.5rem': '16rem',
            transition: 'all 0.1s ease-in-out', 
          }}
        >
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/banner" element={<Banner />} />
            <Route path="/about-us" element={<AboutUs />} />
            <Route path="/services" element={<Services />} />
            <Route path="/faqs" element={<Faqs />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
}

export default App;