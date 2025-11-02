
import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import HomePage from './pages/Home/HomePage';
import NetworkScanPage from './pages/Network/NetworkScanPage';
import DeviceConfigPage from './pages/DeviceConfig/DeviceConfigPage';
import AvailableDevicesPage from './pages/AvailableDevices/AvailableDevicesPage';
import navigationItems from './data/navigation.items';
import TerminalPage from './pages/Terminal/TerminalPage';
import SettingsPage from './pages/Settings/SettingsPage';



const App = () => {
  return (
    <Routes>
      <Route element={<AppLayout navigationItems={navigationItems} />}>
        <Route index element={<HomePage />} />
        <Route path="/network-scan" element={<NetworkScanPage />} />
        <Route path="/ssh-config/:ip" element={<DeviceConfigPage />} />
        <Route path="/available-devices" element={<AvailableDevicesPage />} />
        <Route path="/terminal" element={<TerminalPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate replace to="/" />} />
      </Route>
    </Routes>
  );
};

export default App;
