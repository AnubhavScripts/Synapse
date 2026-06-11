import { Search, Bell } from 'lucide-react';

export default function TopBar() {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="topbar-search">
          <Search size={16} />
          <input type="text" placeholder="Search customers, campaigns, segments..." />
        </div>
      </div>

      <div className="topbar-right">
        <div className="topbar-ai-status">
          <span className="topbar-ai-dot" />
          AI Active
        </div>

        <button className="topbar-icon-btn" id="notifications-btn">
          <Bell size={18} />
          <span className="badge" />
        </button>

        <div className="topbar-avatar" id="user-avatar">AP</div>
      </div>
    </header>
  );
}
