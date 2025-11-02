import { RiDeviceLine, RiHome5Line, RiRadarLine, RiSettings2Line, RiSettings3Line, RiSettingsLine, RiTerminalBoxLine } from '@remixicon/react';
import { NavigationItem } from '../components/navigation/Sidebar';

const navigationItems: NavigationItem[] = [
  {
    id: 'home',
    label: 'Home',
    // description: 'Welcome to the Nodex toolkit.',
    path: '/',
    icon: RiHome5Line
  },
  {
    id: 'network-scan',
    label: 'Network Scan',
    // description: 'Discover SSH-ready devices connected to your local network.',
    path: '/network-scan',
    icon: RiRadarLine
  },
  {
    id: 'available-devices',
    label: 'Available Devices',
    // description: 'Welcome to the Nodex toolkit.',
    path: '/available-devices',
    icon: RiDeviceLine
  },
  {
    id: 'terminal',
    label: 'Terminal',
    // description: 'Welcome to the Nodex toolkit.',
    path: '/terminal',
    icon: RiTerminalBoxLine
  },
  {
    id: 'settings',
    label: 'Settings',
    // description: 'Welcome to the Nodex toolkit.',
    path: '/settings',
    icon: RiSettings3Line
  },
];

export default navigationItems