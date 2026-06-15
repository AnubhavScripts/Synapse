import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles } from 'lucide-react';
import {
  investigateOpportunity, analyzeGoal, createCampaign, launchCampaign, getSegments,
} from '../api/client';
import { LoadingButton } from '../components/ui/LoadingButton';
import type { OpportunityInvestigationResponse, StrategyResponse } from '../types';

// ── Helpers ───────────────────────────────────────────────────────────────

const suggestions = [
  'Bring back dormant customers before the festive season',
  'Reward VIP customers to increase repeat purchases',
  'Convert high-engagement customers to loyal buyers',
  'Run a flash sale for discount-affinity segment',
];

function formatRevenue(n: number): string {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
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
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: `${colors[value]}18`, color: colors[value],
      border: `1px solid ${colors[value]}40`,
      borderRadius: 6, padding: '2px 10px', fontSize: 12, fontWeight: 600,
    }}>
      {value}
    </span>
  );
}

// ── Main Component ────────────────────────────────────────────────────────

export default function AIStrategist() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [goal, setGoal] = useState(searchParams.get('goal') || '');
  const [analyzing, setAnalyzing] = useState(false);
  const [strategy, setStrategy] = useState<StrategyResponse | null>(null);
  const [strategyError, setStrategyError] = useState('');

  // Investigation (when coming from Opportunity Center)
  const oppId = searchParams.get('opp');
  const [investigation, setInvestigation] = useState<OpportunityInvestigationResponse | null>(null);
  const [loadingInvestigation, setLoadingInvestigation] = useState(false);
  const [launchingCampaign, setLaunchingCampaign] = useState(false);

  useEffect(() => { document.title = 'Synapse — AI Strategist'; }, []);

  // Cycle placeholder suggestions
  useEffect(() => {
    const id = setInterval(() => setPlaceholderIdx(i => (i + 1) % suggestions.length), 3000);
    return () => clearInterval(id);
  }, []);

  // If navigated from Opportunity Center with an opp ID, load investigation
  useEffect(() => {
    if (!oppId) return;
    setLoadingInvestigation(true);
    investigateOpportunity(oppId)
      .then(result => setInvestigation(result))
      .catch(() => { /* silently handled */ })
      .finally(() => setLoadingInvestigation(false));
  }, [oppId]);

  // Auto-analyze if goal was passed via URL
  useEffect(() => {
    const urlGoal = searchParams.get('goal');
    if (urlGoal && !oppId) {
      setGoal(urlGoal);
    }
  }, [searchParams, oppId]);

  async function handleLaunch(strat: StrategyResponse, opportunityCustomerIds?: string[]) {
    setLaunchingCampaign(true);
    try {
      const targetIds = opportunityCustomerIds ?? investigation?.opportunity_customer_ids ?? [];
      const segments = await getSegments();
      let matchedSegment = segments.find(s => {
        const sName = s.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const stratName = strat.audience.segment_name.toLowerCase().replace(/[^a-z0-9]/g, '');
        return sName === stratName || sName.includes(stratName) || stratName.includes(sName);
      });

      if (!matchedSegment) {
        const stratNameLower = strat.audience.segment_name.toLowerCase();
        if (stratNameLower.includes('vip')) {
          matchedSegment = segments.find(s => s.name.toLowerCase().includes('vip'));
        } else if (stratNameLower.includes('dormant') || stratNameLower.includes('inactive')) {
          matchedSegment = segments.find(s => s.name.toLowerCase().includes('dormant'));
        } else if (stratNameLower.includes('frequent') || stratNameLower.includes('buyer') || stratNameLower.includes('repeat')) {
          matchedSegment = segments.find(s => s.name.toLowerCase().includes('frequent'));
        } else if (stratNameLower.includes('new') || stratNameLower.includes('recent')) {
          matchedSegment = segments.find(s => s.name.toLowerCase().includes('new'));
        } else if (stratNameLower.includes('risk') || stratNameLower.includes('churn')) {
          matchedSegment = segments.find(s => s.name.toLowerCase().includes('risk'));
        } else if (stratNameLower.includes('high value') || stratNameLower.includes('value')) {
          matchedSegment = segments.find(s => s.name.toLowerCase().includes('high value') || s.name.toLowerCase().includes('value'));
        } else if (stratNameLower.includes('discount') || stratNameLower.includes('promo') || stratNameLower.includes('sensitive') || stratNameLower.includes('coupon')) {
          matchedSegment = segments.find(s => s.name.toLowerCase().includes('discount') || s.name.toLowerCase().includes('driven'));
        }
      }
      const segmentId = matchedSegment ? matchedSegment.id : null;

      // Build ai_strategy: always include opportunity_customer_ids when available.
      // This ensures campaign_service sends messages to exactly the affected customers.
      const aiStrategy: Record<string, unknown> = {
        type: 'automated',
        confidence: strat.strategy.confidence_score,
      };
      if (targetIds && targetIds.length > 0) {
        aiStrategy.opportunity_customer_ids = targetIds;
      }

      const campaign = await createCampaign({
        name: strat.goal_summary,
        goal: strat.strategy.approach,
        segment_id: segmentId,
        channel: strat.channel.primary_channel,
        message_headline: strat.message.headline,
        message_body: strat.message.body,
        message_cta: strat.message.cta,
        ai_strategy: aiStrategy,
        // Use exact affected customer count as predicted_reach when IDs are known
        predicted_reach: (targetIds && targetIds.length > 0)
          ? targetIds.length
          : strat.performance.estimated_reach,
        predicted_opens: strat.performance.estimated_opens,
        predicted_clicks: strat.performance.estimated_clicks,
        predicted_conversions: strat.performance.estimated_conversions,
        predicted_revenue: strat.performance.estimated_revenue
      });

      await launchCampaign(campaign.id);
      navigate('/dashboard/campaigns');
    } catch (e) {
      console.error('Failed to create or launch campaign:', e);
    } finally {
      setLaunchingCampaign(false);
    }
  }

  async function handleLaunchFromInvestigation(recommended_goal: string) {
    setLaunchingCampaign(true);
    setStrategyError('');
    try {
      const strat = await analyzeGoal(recommended_goal);
      // Pass the exact customer IDs from the investigation so messages_sent == affected_customers
      const customerIds = investigation?.opportunity_customer_ids ?? [];
      await handleLaunch(strat, customerIds);
    } catch (e) {
      console.error('Failed to launch campaign from investigation:', e);
      setStrategyError('Failed to generate or launch campaign from recommendation.');
      setLaunchingCampaign(false);
    }
  }

  async function handleAnalyze(e?: React.FormEvent) {
    e?.preventDefault();
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

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>🧠 AI Revenue Strategist</h1>
        <p>Describe your goal and AI will generate a complete campaign strategy.</p>
      </div>

      {/* ── Primary: Goal Input ──────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <div className="goal-input-container" style={{ marginBottom: 'var(--space-8)' }}>
          <div className="goal-input-label">What's your business goal today?</div>
          <div className="goal-input-sublabel">
            Describe what you want to achieve and AI will create the strategy
          </div>
          <form onSubmit={handleAnalyze}>
            <div className="goal-input-wrapper">
              <input
                id="goal-input"
                className="goal-input"
                type="text"
                value={goal}
                onChange={e => setGoal(e.target.value)}
                placeholder={suggestions[placeholderIdx]}
                onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
              />
              <LoadingButton
                type="submit"
                loading={analyzing}
                loadingText="Thinking..."
                icon={<Send size={18} />}
                id="goal-submit-btn"
                style={{
                  padding: 'var(--space-4) var(--space-6)',
                  borderRadius: 'var(--radius-lg)',
                  background: 'white',
                  color: 'var(--color-primary-700)',
                  fontWeight: 700,
                  fontSize: 'var(--text-md)',
                  whiteSpace: 'nowrap',
                }}
              >
                Strategize
              </LoadingButton>
            </div>
          </form>
          <div className="goal-suggestions">
            {suggestions.map(s => (
              <button
                key={s}
                className="goal-suggestion"
                onClick={() => { setGoal(s); }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {strategyError && (
        <div className="alert alert-error" style={{ marginBottom: 20 }}>{strategyError}</div>
      )}

      {/* ── Strategy Result ──────────────────────────────────────────── */}
      <AnimatePresence>
        {strategy && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="goal-section"
            style={{ marginBottom: 32 }}
          >
            <div className="strategy-result__summary">{strategy.goal_summary}</div>
            <div className="strategy-grid" style={{ marginTop: 16 }}>
              <div className="strategy-block">
                <div className="strategy-block__title">👥 Target Audience</div>
                <div className="strategy-block__main">{strategy.audience.segment_name}</div>
                <div className="strategy-block__sub">
                  {strategy.audience.customer_count.toLocaleString()} customers · {formatRevenue(strategy.audience.revenue_opportunity)} opportunity
                </div>
                <ul className="strategy-block__list">
                  {strategy.audience.characteristics.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </div>
              <div className="strategy-block">
                <div className="strategy-block__title">🎯 Strategy</div>
                <div className="strategy-block__main">{strategy.strategy.campaign_type}</div>
                <div className="strategy-block__sub">{strategy.strategy.expected_outcome}</div>
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-gray-500)' }}>{strategy.strategy.reasoning}</div>
              </div>
              <div className="strategy-block">
                <div className="strategy-block__title">📡 Channel</div>
                <div className="strategy-block__main" style={{ textTransform: 'capitalize' }}>{strategy.channel.primary_channel}</div>
                <div className="strategy-block__sub">{strategy.channel.reasoning}</div>
              </div>
              <div className="strategy-block">
                <div className="strategy-block__title">📊 Performance Forecast</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                  {[
                    ['Reach', strategy.performance.estimated_reach.toLocaleString()],
                    ['Opens', strategy.performance.estimated_opens.toLocaleString()],
                    ['Conversions', strategy.performance.estimated_conversions.toLocaleString()],
                    ['Revenue', formatRevenue(strategy.performance.estimated_revenue)],
                  ].map(([label, val]) => (
                    <div key={label}>
                      <div style={{ fontSize: 11, color: 'var(--color-gray-400)' }}>{label}</div>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>{val}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="strategy-message" style={{ marginTop: 16 }}>
              <div className="strategy-block__title">✉️ Suggested Message</div>
              <div className="strategy-message__headline">{strategy.message.headline}</div>
              <div className="strategy-message__body">{strategy.message.body}</div>
              <div className="strategy-message__cta">{strategy.message.cta}</div>
            </div>

            <LoadingButton
              className="btn btn-primary"
              style={{ marginTop: 16, width: '100%' }}
              loading={launchingCampaign}
              loadingText="Launching Campaign..."
              onClick={() => handleLaunch(strategy)}
            >
              🚀 Launch Campaign
            </LoadingButton>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Investigation Panel (from Opportunity Center) ────────────── */}
      {loadingInvestigation && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 32 }}>
          <div className="skeleton" style={{ height: 40, borderRadius: 8 }} />
          <div className="skeleton" style={{ height: 120, borderRadius: 12 }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="skeleton" style={{ height: 100, borderRadius: 12 }} />
            <div className="skeleton" style={{ height: 100, borderRadius: 12 }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 220, borderRadius: 12 }} />)}
          </div>
        </div>
      )}

      <AnimatePresence>
        {investigation && !loadingInvestigation && (
          <motion.section
            className="investigation-panel"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {/* Phase trail */}
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

            {/* Why Now */}
            <div className="why-now-block">
              <div className="why-now-block__label">⏰ Why Now?</div>
              <p className="why-now-block__text">{investigation.why_now}</p>
            </div>

            {/* Root Cause + Confidence */}
            <div className="diag-row">
              <div className="diag-card">
                <div className="diag-card__title">🔎 Root Cause</div>
                <p className="diag-card__body">{investigation.root_cause}</p>
              </div>
              <div className="diag-card">
                <div className="diag-card__title">
                  📊 Confidence &amp; Evidence
                  <span className="confidence-badge">{investigation.confidence_score}%</span>
                </div>
                <ul className="evidence-list">
                  {investigation.evidence.map((e, i) => (
                    <li key={i} className="evidence-chip">{e}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Alternative Actions */}
            <div style={{ marginTop: 24 }}>
              <div style={{
                fontSize: 13, fontWeight: 700, color: 'var(--color-gray-400)',
                marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>
                Alternative Actions Evaluated
              </div>
              <div className="candidate-actions-grid">
                {investigation.options.map((opt, idx) => {
                  const isRecommended = idx === investigation.recommended_index;
                  return (
                    <div key={idx} className={`candidate-action-card ${isRecommended ? 'candidate-action-card--recommended' : ''}`}>
                      {isRecommended && <div className="recommended-badge">✓ Recommended</div>}
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
                          <div style={{ fontSize: 11, color: '#10b981', fontWeight: 600, marginBottom: 4 }}>Pros</div>
                          {opt.pros.map((p, i) => <div key={i} style={{ fontSize: 12, color: 'var(--color-gray-500)' }}>+ {p}</div>)}
                        </div>
                        <div>
                          <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 600, marginBottom: 4 }}>Cons</div>
                          {opt.cons.map((c, i) => <div key={i} style={{ fontSize: 12, color: 'var(--color-gray-500)' }}>− {c}</div>)}
                        </div>
                      </div>

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
                              <span className="recommended-action-label">{investigation.recommended_action}</span>
                            </div>
                          </div>
                          <p style={{ margin: '10px 0 12px', fontSize: 13, color: 'var(--color-gray-500)', fontStyle: 'italic' }}>
                            {investigation.selection_reasoning}
                          </p>
                          <div style={{ display: 'flex', gap: 10 }}>
                            <LoadingButton
                              className="btn btn-primary"
                              style={{ flex: 1 }}
                              loading={launchingCampaign}
                              loadingText="Launching..."
                              onClick={() => handleLaunchFromInvestigation(investigation.recommended_goal)}
                            >
                              🚀 Launch Campaign
                            </LoadingButton>
                            <button
                              className="btn btn-secondary"
                              style={{ flex: 1 }}
                              onClick={() => setGoal(investigation.recommended_goal)}
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
          </motion.section>
        )}
      </AnimatePresence>

      {/* ── Empty state when no investigation and no strategy ─────── */}
      {!investigation && !strategy && !loadingInvestigation && !analyzing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            textAlign: 'center', padding: '48px 24px',
            color: 'var(--color-gray-400)', fontSize: 14,
          }}
        >
          <Sparkles size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
          <div>Type a goal above or navigate from <strong>Opportunity Center</strong> to investigate a discovered opportunity.</div>
        </motion.div>
      )}
    </div>
  );
}
