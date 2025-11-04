
import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import HomePage from './pages/Home/HomePage';
import NetworkScanPage from './pages/Network/NetworkScanPage';
import RegisteredDevicesPage from './pages/RegisteredDevices/RegisteredDevicesPage';
import navigationItems from './data/navigation.items';
import TerminalPage from './pages/Terminal/TerminalPage';
import SettingsPage from './pages/Settings/SettingsPage';
import DeviceRegistrationPage from './pages/DeviceRegistration/DeviceRegistrationPage';
import DeviceDetailsPage from './pages/RegisteredDevices/DeviceDetailsPage';
import DeviceEditPage from './pages/RegisteredDevices/DeviceEditPage';



const App = () => {
  return (
    <Routes>
      <Route element={<AppLayout navigationItems={navigationItems} />}>
        <Route index element={<HomePage />} />
        <Route path="/network-scan" element={<NetworkScanPage />} />
        <Route path="/device-registration/:ip" element={<DeviceRegistrationPage />} />
        <Route path="/registered-devices" element={<RegisteredDevicesPage />} />
        <Route path="/registered-devices/:id" element={<DeviceDetailsPage />} />
        <Route path="/registered-devices/:id/edit" element={<DeviceEditPage />} />
        <Route path="/terminal" element={<TerminalPage />} />
        <Route path="/terminal/:id" element={<TerminalPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate replace to="/" />} />
      </Route>
    </Routes>
  );
};

export default App;
