import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getOpportunities, refreshOpportunities,
  investigateOpportunity, analyzeGoal, dismissOpportunity,
} from '../api/client';
import type { Opportunity, OpportunityInvestigationResponse, StrategyResponse } from '../types';
import { LoadingButton } from '../components/ui/LoadingButton';

// ── Helpers ───────────────────────────────────────────────────────────────

const OPP_TYPE_LABELS: Record<string, { icon: string; label: string; color: string }> = {
  dormant_recovery: { icon: '⚠️', label: 'Dormancy Risk', color: '#f59e0b' },
  churn_prevention: { icon: '🔴', label: 'Churn Signal', color: '#ef4444' },
  cross_sell:       { icon: '🔀', label: 'Cross-Sell Gap', color: '#8b5cf6' },
  emerging_vip:     { icon: '⭐', label: 'Emerging VIP', color: '#10b981' },
  loyalty:          { icon: '👑', label: 'VIP Unrewarded', color: '#3b82f6' },
  upsell:           { icon: '📈', label: 'Upsell Window', color: '#06b6d4' },
};

function priorityColor(score: number): string {
  if (score >= 80) return '#ef4444';
  if (score >= 60) return '#f59e0b';
  return '#10b981';
}

function formatRevenue(n: number): string {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n.toFixed(0)}`;
}

function ImpactEffortBadge({ value, type }: { value: string; type: 'impact' | 'effort' }) {
  const colors: Record<string, string> = {
    High: type === 'impact' ? '#10b981' : '#ef4444',
    Medium: '#f59e0b',
    Low: type === 'impact' ? '#ef4444' : '#10b981',
  };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      background: `${colors[value]}18`, color: colors[value],
      border: `1px solid ${colors[value]}40`,
      borderRadius: '6px', padding: '2px 10px', fontSize: '12px', fontWeight: 600,
    }}>
      {value}
    </span>
  );
}

// ── Main Component ────────────────────────────────────────────────────────

export default function AIStrategist() {
  const navigate = useNavigate();

  // ─ Opportunity feed state ─
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loadingOpps, setLoadingOpps] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ─ Per-card investigate state ─
  const [investigatingId, setInvestigatingId] = useState<string | null>(null);
  const [investigation, setInvestigation] = useState<OpportunityInvestigationResponse | null>(null);
  const [investigatedFor, setInvestigatedFor] = useState<string | null>(null);

  // ─ Dismiss state ─
  const [dismissingId, setDismissingId] = useState<string | null>(null);

  // ─ Goal input (secondary) ─
  const [goal, setGoal] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [strategy, setStrategy] = useState<StrategyResponse | null>(null);
  const [strategyError, setStrategyError] = useState('');

  // ── Load opportunities on mount ───────────────────────────────────────
  const loadOpportunities = useCallback(async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setRefreshing(true);
        const opps = await refreshOpportunities();
        setOpportunities(opps);
      } else {
        setLoadingOpps(true);
        const opps = await getOpportunities();
        if (opps.length === 0) {
          const fresh = await refreshOpportunities();
          setOpportunities(fresh);
        } else {
          setOpportunities(opps);
        }
      }
    } catch {
      // silently handle
    } finally {
      setLoadingOpps(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadOpportunities(); }, [loadOpportunities]);

  // ── Investigate opportunity ───────────────────────────────────────────
  async function handleInvestigate(opp: Opportunity) {
    setInvestigatingId(opp.id);
    setInvestigation(null);
    setInvestigatedFor(opp.id);
    try {
      const result = await investigateOpportunity(opp.id);
      setInvestigation(result);
    } catch {
      setInvestigation(null);
    } finally {
      setInvestigatingId(null);
    }
  }

  // ── Dismiss opportunity ───────────────────────────────────────────────
  async function handleDismiss(id: string) {
    setDismissingId(id);
    try {
      await dismissOpportunity(id);
      setOpportunities(prev => prev.filter(o => o.id !== id));
      if (investigatedFor === id) {
        setInvestigation(null);
        setInvestigatedFor(null);
      }
    } finally {
      setDismissingId(null);
    }
  }

  // ── Analyze goal (secondary) ──────────────────────────────────────────
  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    if (!goal.trim()) return;
    setAnalyzing(true);
    setStrategyError('');
    setStrategy(null);
    try {
      const result = await analyzeGoal(goal);
      setStrategy(result);
    } catch {
      setStrategyError('Failed to analyze goal. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  }

  // ── Launch campaign from investigation ────────────────────────────────
  function handleLaunchFromInvestigation() {
    if (!investigation) return;
    navigate('/campaigns');
  }

  // ─────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────

  return (
    <div className="page-content">

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="page-header" style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>
              🧠 AI Revenue Strategist
            </h1>
            <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: '14px' }}>
              Your AI has proactively scanned your customer base and discovered actionable opportunities.
            </p>
            <div style={{
              marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)',
              fontStyle: 'italic', padding: '6px 10px',
              background: 'var(--surface-card)', borderRadius: '6px',
              borderLeft: '3px solid var(--accent-primary)', display: 'inline-block',
            }}>
              The Opportunity Engine is deterministic. Gemini enriches strategy narratives only.
            </div>
          </div>
          <LoadingButton
            onClick={() => loadOpportunities(true)}
            loading={refreshing}
            className="btn btn-secondary"
            style={{ whiteSpace: 'nowrap' }}
          >
            🔄 Refresh Scan
          </LoadingButton>
        </div>
      </div>

      {/* ── Phase 1: Opportunity Feed ──────────────────────────────────── */}
      <section style={{ marginBottom: '48px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
            Discovered Opportunities
          </h2>
          {!loadingOpps && opportunities.length > 0 && (
            <span style={{
              background: 'var(--accent-primary)', color: '#fff',
              borderRadius: '999px', padding: '2px 10px', fontSize: '12px', fontWeight: 700,
            }}>
              {opportunities.length}
            </span>
          )}
        </div>

        {loadingOpps ? (
          <div className="opp-skeleton-grid">
            {[1, 2, 3].map(i => (
              <div key={i} className="opp-skeleton-card skeleton" />
            ))}
          </div>
        ) : opportunities.length === 0 ? (
          <div className="empty-state">
            <p>No active opportunities found. Click Refresh Scan to re-analyse.</p>
          </div>
        ) : (
          <div className="opp-card-grid">
            {opportunities.map(opp => {
              const meta = OPP_TYPE_LABELS[opp.opportunity_type] || { icon: '💡', label: opp.opportunity_type, color: '#6366f1' };
              const isActiveInvestigation = investigatedFor === opp.id;
              const isInvestigating = investigatingId === opp.id;
              const isDismissing = dismissingId === opp.id;

              return (
                <div
                  key={opp.id}
                  className={`opp-card ${isActiveInvestigation ? 'opp-card--active' : ''}`}
                  style={{ borderLeftColor: meta.color }}
                >
                  {/* Card header */}
                  <div className="opp-card__header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: '18px' }}>{meta.icon}</span>
                      <div>
                        <div style={{
                          fontSize: '11px', fontWeight: 700, color: meta.color,
                          textTransform: 'uppercase', letterSpacing: '0.05em',
                        }}>
                          {meta.label}
                        </div>
                        <h3 style={{
                          margin: 0, fontSize: '14px', fontWeight: 700,
                          lineHeight: 1.3, color: 'var(--text-primary)',
                        }}>
                          {opp.title}
                        </h3>
                      </div>
                    </div>
                    {/* Priority score ring */}
                    <div className="priority-ring" style={{
                      '--ring-color': priorityColor(opp.priority_score ?? 50),
                    } as React.CSSProperties}>
                      <span>{opp.priority_score ?? 50}</span>
                    </div>
                  </div>

                  {/* Metrics row */}
                  <div className="opp-card__metrics">
                    <div className="opp-metric">
                      <span className="opp-metric__label">Revenue at stake</span>
                      <span className="opp-metric__value" style={{ color: '#ef4444' }}>
                        {formatRevenue(opp.potential_revenue)}
                      </span>
                    </div>
                    <div className="opp-metric">
                      <span className="opp-metric__label">Customers affected</span>
                      <span className="opp-metric__value">{opp.affected_customers.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Key drivers */}
                  {opp.key_drivers && opp.key_drivers.length > 0 && (
                    <div className="opp-card__drivers">
                      <div className="opp-card__drivers-title">Why this exists</div>
                      <ul className="key-driver-list">
                        {opp.key_drivers.slice(0, 3).map((d, i) => (
                          <li key={i}>{d}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="opp-card__actions">
                    <LoadingButton
                      onClick={() => handleInvestigate(opp)}
                      loading={isInvestigating}
                      className="btn btn-primary"
                      style={{ flex: 1, fontSize: '13px' }}
                    >
                      🔍 Investigate Opportunity
                    </LoadingButton>
                    <LoadingButton
                      onClick={() => handleDismiss(opp.id)}
                      loading={isDismissing}
                      className="btn btn-secondary"
                      style={{ fontSize: '13px' }}
                    >
                      Dismiss
                    </LoadingButton>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Phase 2–4: Investigation Panel ───────────────────────────── */}
      {investigation && investigatedFor && (
        <section className="investigation-panel" style={{ marginBottom: '48px' }}>
          {/* Breadcrumb phase indicator */}
          <div className="phase-trail">
            <span className="phase-trail__step phase-trail__step--done">Opportunity</span>
            <span className="phase-trail__sep">›</span>
            <span className="phase-trail__step phase-trail__step--done">Investigation</span>
            <span className="phase-trail__sep">›</span>
            <span className="phase-trail__step phase-trail__step--done">Root Cause</span>
            <span className="phase-trail__sep">›</span>
            <span className="phase-trail__step phase-trail__step--active">Recommendation</span>
          </div>

          <div className="investigation-panel__title">
            Investigation: {investigation.opportunity_title}
          </div>

          {/* ── Phase 2a: Why Now? ─────────────────────────────────── */}
          <div className="why-now-block">
            <div className="why-now-block__label">⏰ Why Now?</div>
            <p className="why-now-block__text">{investigation.why_now}</p>
          </div>

          {/* ── Phase 2b: Root Cause + Confidence ────────────────── */}
          <div className="diag-row">
            <div className="diag-card">
              <div className="diag-card__title">🔎 Root Cause</div>
              <p className="diag-card__body">{investigation.root_cause}</p>
            </div>

            <div className="diag-card">
              <div className="diag-card__title">
                📊 Confidence &amp; Evidence
                <span className="confidence-badge">
                  {investigation.confidence_score}%
                </span>
              </div>
              <ul className="evidence-list">
                {investigation.evidence.map((e, i) => (
                  <li key={i} className="evidence-chip">{e}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* ── Phase 3: Alternative Actions ─────────────────────── */}
          <div style={{ marginTop: '24px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Alternative Actions Evaluated
            </div>
            <div className="candidate-actions-grid">
              {investigation.options.map((opt, idx) => {
                const isRecommended = idx === investigation.recommended_index;
                return (
                  <div
                    key={idx}
                    className={`candidate-action-card ${isRecommended ? 'candidate-action-card--recommended' : ''}`}
                  >
                    {isRecommended && (
                      <div className="recommended-badge">✓ Recommended</div>
                    )}
                    <div className="candidate-action-card__name">{opt.name}</div>
                    <p className="candidate-action-card__desc">{opt.description}</p>

                    <div className="candidate-action-card__metrics">
                      <div className="action-metric">
                        <span className="action-metric__label">Expected Revenue</span>
                        <span className="action-metric__value" style={{ color: '#10b981' }}>
                          {formatRevenue(opt.expected_revenue)}
                        </span>
                      </div>
                      <div className="action-metric">
                        <span className="action-metric__label">Conversions</span>
                        <span className="action-metric__value">{opt.expected_conversions.toLocaleString()}</span>
                      </div>
                      <div className="action-metric">
                        <span className="action-metric__label">Conv. Rate</span>
                        <span className="action-metric__value">{(opt.conversion_rate * 100).toFixed(1)}%</span>
                      </div>
                      <div className="action-metric">
                        <span className="action-metric__label">Margin Impact</span>
                        <span className="action-metric__value">{opt.margin_impact}</span>
                      </div>
                    </div>

                    <div className="candidate-action-card__pros-cons">
                      <div>
                        <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 600, marginBottom: '4px' }}>Pros</div>
                        {opt.pros.map((p, i) => <div key={i} style={{ fontSize: '12px', color: 'var(--text-muted)' }}>+ {p}</div>)}
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#ef4444', fontWeight: 600, marginBottom: '4px' }}>Cons</div>
                        {opt.cons.map((c, i) => <div key={i} style={{ fontSize: '12px', color: 'var(--text-muted)' }}>− {c}</div>)}
                      </div>
                    </div>

                    {/* Impact/Effort/Action — ONLY on the recommended option */}
                    {isRecommended && (
                      <div className="recommendation-footer">
                        <div className="ie-row">
                          <div className="ie-item">
                            <span className="ie-label">Impact</span>
                            <ImpactEffortBadge value={investigation.impact} type="impact" />
                          </div>
                          <div className="ie-item">
                            <span className="ie-label">Effort</span>
                            <ImpactEffortBadge value={investigation.effort} type="effort" />
                          </div>
                          <div className="ie-item" style={{ flex: 1 }}>
                            <span className="ie-label">Action</span>
                            <span className="recommended-action-label">
                              {investigation.recommended_action}
                            </span>
                          </div>
                        </div>
                        <p style={{
                          margin: '10px 0 12px', fontSize: '13px',
                          color: 'var(--text-muted)', fontStyle: 'italic',
                        }}>
                          {investigation.selection_reasoning}
                        </p>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <LoadingButton
                            onClick={handleLaunchFromInvestigation}
                            loading={false}
                            className="btn btn-primary"
                            style={{ flex: 1 }}
                          >
                            🚀 Launch Campaign
                          </LoadingButton>
                          <button
                            className="btn btn-secondary"
                            onClick={() => setGoal(investigation.recommended_goal)}
                            style={{ flex: 1 }}
                          >
                            ✏️ Customize Strategy
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── Secondary: Custom Goal Input ─────────────────────────────── */}
      <section className="goal-section">
        <div className="goal-section__header">
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
            Or describe a custom goal
          </h2>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '13px' }}>
            Tell the AI what you want to achieve and it will generate a full strategy.
          </p>
        </div>

        <form onSubmit={handleAnalyze} style={{ marginTop: '14px' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              id="goal-input"
              type="text"
              value={goal}
              onChange={e => setGoal(e.target.value)}
              placeholder='e.g. "I want to bring back dormant customers before the festive season"'
              className="input"
              style={{ flex: 1 }}
            />
            <LoadingButton
              type="submit"
              loading={analyzing}
              disabled={!goal.trim()}
              className="btn btn-primary"
            >
              Analyze
            </LoadingButton>
          </div>
        </form>

        {strategyError && (
          <div className="alert alert-error" style={{ marginTop: '12px' }}>{strategyError}</div>
        )}

        {strategy && (
          <div className="strategy-result" style={{ marginTop: '20px' }}>
            <div className="strategy-result__summary">{strategy.goal_summary}</div>

            <div className="strategy-grid">
              <div className="strategy-block">
                <div className="strategy-block__title">👥 Target Audience</div>
                <div className="strategy-block__main">{strategy.audience.segment_name}</div>
                <div className="strategy-block__sub">{strategy.audience.customer_count.toLocaleString()} customers · {formatRevenue(strategy.audience.revenue_opportunity)} opportunity</div>
                <ul className="strategy-block__list">
                  {strategy.audience.characteristics.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </div>

              <div className="strategy-block">
                <div className="strategy-block__title">🎯 Strategy</div>
                <div className="strategy-block__main">{strategy.strategy.campaign_type}</div>
                <div className="strategy-block__sub">{strategy.strategy.expected_outcome}</div>
                <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  {strategy.strategy.reasoning}
                </div>
              </div>

              <div className="strategy-block">
                <div className="strategy-block__title">📡 Recommended Channel</div>
                <div className="strategy-block__main" style={{ textTransform: 'capitalize' }}>
                  {strategy.channel.primary_channel}
                </div>
                <div className="strategy-block__sub">{strategy.channel.reasoning}</div>
              </div>

              <div className="strategy-block">
                <div className="strategy-block__title">📊 Performance Forecast</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
                  {[
                    ['Reach', strategy.performance.estimated_reach.toLocaleString()],
                    ['Opens', strategy.performance.estimated_opens.toLocaleString()],
                    ['Conversions', strategy.performance.estimated_conversions.toLocaleString()],
                    ['Revenue', formatRevenue(strategy.performance.estimated_revenue)],
                  ].map(([label, val]) => (
                    <div key={label}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{label}</div>
                      <div style={{ fontSize: '15px', fontWeight: 700 }}>{val}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="strategy-message">
              <div className="strategy-block__title">✉️ Suggested Message</div>
              <div className="strategy-message__headline">{strategy.message.headline}</div>
              <div className="strategy-message__body">{strategy.message.body}</div>
              <div className="strategy-message__cta">{strategy.message.cta}</div>
            </div>

            <button
              className="btn btn-primary"
              style={{ marginTop: '16px' }}
              onClick={() => navigate('/campaigns')}
            >
              🚀 Launch Campaign
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
