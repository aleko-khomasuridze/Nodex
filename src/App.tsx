import { RiHome5Line, RiRadarLine } from '@remixicon/react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import type { NavigationItem } from './components/navigation/Sidebar';
import HomePage from './pages/Home/HomePage';
import NetworkScanPage from './pages/Network/NetworkScanPage';

const navigationItems: NavigationItem[] = [
  {
    id: 'home',
    label: 'Home',
    description: 'Welcome to the Nodex toolkit.',
    path: '/',
    icon: RiHome5Line
  },
  {
    id: 'network-scan',
    label: 'Network Scan',
    description: 'Discover SSH-ready devices connected to your local network.',
    path: '/network-scan',
    icon: RiRadarLine
  }
];

const App = () => {
  return (
    <Routes>
      <Route element={<AppLayout navigationItems={navigationItems} />}>
        <Route index element={<HomePage />} />
        <Route path="/network-scan" element={<NetworkScanPage />} />
        <Route path="*" element={<Navigate replace to="/" />} />
      </Route>
    </Routes>
  );
};

export default App;
