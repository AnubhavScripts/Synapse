import { NavLink } from 'react-router-dom';
import { Brain, Megaphone, Users, PieChart, BarChart3, Activity, Sparkles, Cpu } from 'lucide-react';

const navItems = [
  { to: '/dashboard', icon: Sparkles, label: 'Opportunity Center' },
  { to: '/dashboard/strategist', icon: Brain, label: 'AI Strategist', hasAiDot: true },
  { to: '/dashboard/campaigns', icon: Megaphone, label: 'Campaigns' },
  { to: '/dashboard/customers', icon: Users, label: 'Customers' },
  { to: '/dashboard/segments', icon: PieChart, label: 'Segments' },
  { to: '/dashboard/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/dashboard/activity', icon: Activity, label: 'Activity Center' },
  { to: '/dashboard/system', icon: Cpu, label: 'System Intelligence' },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-text" style={{ fontSize: '20px', fontWeight: 800, color: '#4648d4', letterSpacing: '-0.5px' }}>
          Synapse
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Navigation</div>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/dashboard'}
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
          Synapse v1.0 — AI CRM
        </div>
      </div>
    </aside>
  );
}
