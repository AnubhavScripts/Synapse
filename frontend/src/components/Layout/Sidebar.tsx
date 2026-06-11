import { NavLink } from 'react-router-dom';
import { Home, Brain, Megaphone, Users, PieChart, BarChart3, Activity, Sparkles } from 'lucide-react';

const navItems = [
  { to: '/', icon: Home, label: 'Opportunity Center' },
  { to: '/strategist', icon: Brain, label: 'AI Strategist', hasAiDot: true },
  { to: '/campaigns', icon: Megaphone, label: 'Campaigns' },
  { to: '/customers', icon: Users, label: 'Customers' },
  { to: '/segments', icon: PieChart, label: 'Segments' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/activity', icon: Activity, label: 'Activity Center' },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">
          <Sparkles size={16} />
        </div>
        <div className="sidebar-brand-text">
          Reach<span>IQ</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Navigation</div>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <item.icon size={18} />
            <span>{item.label}</span>
            {item.hasAiDot && <span className="ai-dot" />}
          </NavLink>
        ))}
      </nav>

      <div style={{ padding: 'var(--space-4)', borderTop: '1px solid var(--color-gray-100)' }}>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-400)', textAlign: 'center' }}>
          ReachIQ v1.0 — AI CRM
        </div>
      </div>
    </aside>
  );
}
