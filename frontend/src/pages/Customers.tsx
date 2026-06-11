import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ShoppingBag, Mail, Phone } from 'lucide-react';
import { getCustomers, getCustomerDecisions } from '../api/client';
import type { Customer, CustomerListResponse, DecisionLog } from '../types';

function formatCurrency(n: number): string {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
}

function riskColor(risk: string) {
  switch (risk) {
    case 'loyal': return 'success';
    case 'stable': return 'info';
    case 'at_risk': return 'warning';
    case 'dormant': return 'error';
    case 'churned': return 'gray';
    default: return 'gray';
  }
}

function channelBadge(ch: string) {
  return `badge-${ch}`;
}

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [decisions, setDecisions] = useState<DecisionLog[]>([]);

  const { data, isLoading: loadingCustomers } = useQuery<CustomerListResponse>({
    queryKey: ['customers', search, riskFilter],
    queryFn: () => getCustomers({ search, risk_level: riskFilter, page_size: 50 }),
  });

  useEffect(() => { document.title = 'ReachIQ — Customers'; }, []);

  async function openProfile(c: Customer) {
    setSelectedCustomer(c);
    try {
      const d = await getCustomerDecisions(c.id);
      setDecisions(d);
    } catch { setDecisions([]); }
  }

  const risks = ['', 'loyal', 'stable', 'at_risk', 'dormant', 'churned'];

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Customers</h1>
        <p>Customer intelligence powered by the Persona Engine</p>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-4" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="search-input-wrapper" style={{ flex: 1, maxWidth: 400 }}>
          <Search size={16} />
          <input placeholder="Search customers..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="filter-pills">
          {risks.map(r => (
            <button key={r || 'all'} className={`filter-pill ${riskFilter === r ? 'active' : ''}`} onClick={() => setRiskFilter(r)}>
              {r ? r.replace('_', ' ') : 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Customer Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loadingCustomers ? (
          <div style={{ padding: '20px' }}>
            {[1,2,3,4,5,6,7].map(i => (
              <div key={i} className="skeleton" style={{ height: 52, borderRadius: 8, marginBottom: 10 }} />
            ))}
          </div>
        ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Category</th>
              <th>Channel</th>
              <th>Score</th>
              <th>Risk</th>
              <th>Total Spend</th>
              <th>LTV</th>
              <th>Orders</th>
            </tr>
          </thead>
          <tbody>
            {data?.customers.map((c) => (
              <tr key={c.id} onClick={() => openProfile(c)}>
                <td>
                  <div style={{ fontWeight: 600 }}>{c.name}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-400)' }}>{c.email}</div>
                </td>
                <td><span className="badge badge-gray">{c.persona?.primary_category || '—'}</span></td>
                <td><span className={`badge ${channelBadge(c.persona?.channel_affinity || '')}`}>{c.persona?.channel_affinity || '—'}</span></td>
                <td>
                  <div className="engagement-score">
                    <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{c.persona?.engagement_score || 0}</span>
                    <div className="engagement-bar">
                      <div className={`engagement-bar-fill ${(c.persona?.engagement_score || 0) >= 70 ? 'high' : (c.persona?.engagement_score || 0) >= 40 ? 'medium' : 'low'}`}
                        style={{ width: `${c.persona?.engagement_score || 0}%` }} />
                    </div>
                  </div>
                </td>
                <td><span className={`badge badge-${riskColor(c.persona?.risk_level || '')}`}>{c.persona?.risk_level || '—'}</span></td>
                <td style={{ fontWeight: 600 }}>{formatCurrency(c.total_spend)}</td>
                <td>{formatCurrency(c.lifetime_value)}</td>
                <td>{c.order_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </div>
      <div style={{ marginTop: 'var(--space-3)', fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)' }}>
        Showing {data?.customers.length || 0} of {data?.total || 0} customers
      </div>

      {/* Customer Detail Slide Panel */}
      <AnimatePresence>
        {selectedCustomer && (
          <>
            <motion.div className="slide-panel-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedCustomer(null)} />
            <motion.div className="slide-panel" initial={{ x: 600 }} animate={{ x: 0 }} exit={{ x: 600 }} transition={{ type: 'spring', damping: 25 }}>
              <div className="slide-panel-header">
                <div>
                  <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700 }}>{selectedCustomer.name}</h2>
                  <p style={{ color: 'var(--color-gray-500)', fontSize: 'var(--text-sm)' }}>{selectedCustomer.email}</p>
                </div>
                <button className="slide-panel-close" onClick={() => setSelectedCustomer(null)}><X size={18} /></button>
              </div>

              {/* Contact */}
              <div className="flex gap-4" style={{ marginBottom: 'var(--space-6)' }}>
                <div className="flex items-center gap-2" style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-600)' }}>
                  <Mail size={14} /> {selectedCustomer.email}
                </div>
                <div className="flex items-center gap-2" style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-600)' }}>
                  <Phone size={14} /> {selectedCustomer.phone}
                </div>
              </div>

              {/* Persona Card */}
              {selectedCustomer.persona && (
                <div className="persona-card" style={{ marginBottom: 'var(--space-6)' }}>
                  <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600, marginBottom: 'var(--space-4)' }}>Customer Persona</h3>
                  <div className="persona-attributes">
                    <div className="persona-attr">
                      <span className="persona-attr-label">Category</span>
                      <span className="persona-attr-value"><ShoppingBag size={14} /> {selectedCustomer.persona.primary_category}</span>
                    </div>
                    <div className="persona-attr">
                      <span className="persona-attr-label">Channel</span>
                      <span className="persona-attr-value">{selectedCustomer.persona.channel_affinity}</span>
                    </div>
                    <div className="persona-attr">
                      <span className="persona-attr-label">Discount</span>
                      <span className="persona-attr-value">{selectedCustomer.persona.discount_affinity}</span>
                    </div>
                    <div className="persona-attr">
                      <span className="persona-attr-label">Score</span>
                      <span className="persona-attr-value">{selectedCustomer.persona.engagement_score}/100</span>
                    </div>
                    <div className="persona-attr">
                      <span className="persona-attr-label">Risk</span>
                      <span className={`badge badge-${riskColor(selectedCustomer.persona.risk_level)}`}>{selectedCustomer.persona.risk_level}</span>
                    </div>
                    <div className="persona-attr">
                      <span className="persona-attr-label">Price</span>
                      <span className="persona-attr-value">{selectedCustomer.persona.price_sensitivity}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Metrics */}
              <div className="grid-3" style={{ marginBottom: 'var(--space-6)' }}>
                <div className="metric-card card-sm">
                  <div className="metric-card-value">{formatCurrency(selectedCustomer.total_spend)}</div>
                  <div className="metric-card-label">Total Spend</div>
                </div>
                <div className="metric-card card-sm">
                  <div className="metric-card-value">{formatCurrency(selectedCustomer.average_order_value)}</div>
                  <div className="metric-card-label">Avg Order Value</div>
                </div>
                <div className="metric-card card-sm">
                  <div className="metric-card-value">{selectedCustomer.order_count}</div>
                  <div className="metric-card-label">Total Orders</div>
                </div>
              </div>

              {/* Decision Log */}
              {decisions.length > 0 && (
                <div style={{ marginBottom: 'var(--space-6)' }}>
                  <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600, marginBottom: 'var(--space-4)' }}>Decision Log</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    {decisions.slice(0, 5).map(d => (
                      <div key={d.id} className="decision-card">
                        <div className="decision-header">
                          <span className="badge badge-primary">{d.decision_type.replace('_', ' ')}</span>
                          <span className="decision-type">{d.source}</span>
                        </div>
                        <div className="decision-value">{d.decision}</div>
                        <div className="decision-reasoning">{d.reasoning}</div>
                        <div className="decision-confidence">
                          Confidence: {(d.confidence_score * 100).toFixed(0)}%
                          {d.campaign_name && <span style={{ marginLeft: 'var(--space-3)' }}>Campaign: {d.campaign_name}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
