import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function AppLayout() {
  return (
    <div className="app-layout">
      <Sidebar />
      <TopBar />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
