import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Send, Target, Users, Lightbulb, MessageSquare, BarChart3, Rocket, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import { analyzeGoal } from '../api/client';
import { LoadingButton } from '../components/ui/LoadingButton';
import type { StrategyResponse } from '../types';

function formatCurrency(n: number): string {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
}

const channelColors: Record<string, string> = {
  whatsapp: '#25d366', sms: '#3b82f6', email: '#8b5cf6', rcs: '#f59e0b',
};

export default function AIStrategist() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [goal, setGoal] = useState(searchParams.get('goal') || '');
  const [loading, setLoading] = useState(false);
  const [launchLoading, setLaunchLoading] = useState(false);
  const [launched, setLaunched] = useState(false);
  const [strategy, setStrategy] = useState<StrategyResponse | null>(null);
  const [error, setError] = useState('');
  const [visibleCards, setVisibleCards] = useState(0);

  useEffect(() => { document.title = 'ReachIQ — AI Strategist'; }, []);

  useEffect(() => {
    const initial = searchParams.get('goal');
    if (initial && !strategy) {
      setGoal(initial);
      handleAnalyze(initial);
    }
  }, []);

  async function handleAnalyze(text?: string) {
    const goalText = text || goal;
    if (!goalText.trim()) return;
    setLoading(true);
    setError('');
    setStrategy(null);
    setVisibleCards(0);

    try {
      const result = await analyzeGoal(goalText);
      setStrategy(result);
      // Stagger card reveal
      for (let i = 1; i <= 7; i++) {
        setTimeout(() => setVisibleCards(i), i * 400);
      }
    } catch (e: unknown) {
      setError('Failed to analyze goal. Please ensure the backend is running.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleLaunchCampaign() {
    if (!strategy) return;
    setLaunchLoading(true);
    try {
      // The strategy result contains a campaign_id when one has been pre-created,
      // otherwise we navigate to Campaigns page where the draft will appear.
      setLaunched(true);
      setTimeout(() => navigate('/campaigns'), 1200);
    } catch (e) {
      console.error(e);
    } finally {
      setLaunchLoading(false);
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1><Brain size={28} style={{ display: 'inline', verticalAlign: 'middle', color: 'var(--color-primary-500)', marginRight: '8px' }} />AI Strategist</h1>
        <p>Describe your business goal and get a complete AI-powered marketing strategy</p>
      </div>

      {/* Goal Input */}
      <div className="goal-input-container" style={{ marginBottom: 'var(--space-8)' }}>
        <div className="goal-input-label">What do you want to achieve?</div>
        <div className="goal-input-sublabel">Our Persona Engine + Gemini AI will analyze your customers and recommend the best strategy</div>
        <div className="goal-input-wrapper">
          <input
            className="goal-input"
            type="text"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="e.g., Bring back dormant customers"
            onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
            id="strategist-goal-input"
          />
          <LoadingButton
            loading={loading}
            loadingText="Analyzing..."
            icon={<Send size={18} />}
            onClick={() => handleAnalyze()}
            disabled={loading}
            id="strategist-submit-btn"
            style={{ padding: 'var(--space-4) var(--space-6)', borderRadius: 'var(--radius-lg)', background: 'white', color: 'var(--color-primary-700)', fontWeight: 700, fontSize: 'var(--text-md)', whiteSpace: 'nowrap' }}
          >
            Analyze
          </LoadingButton>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
          <div className="spinner spinner-lg" style={{ margin: '0 auto var(--space-4)' }} />
          <p style={{ color: 'var(--color-gray-500)', fontSize: 'var(--text-md)' }}>
            <Sparkles size={16} style={{ display: 'inline', verticalAlign: 'middle' }} /> AI is analyzing your customer data and crafting a strategy...
          </p>
        </motion.div>
      )}

      {/* Error */}
      {error && (
        <div className="card" style={{ borderColor: 'var(--color-error-500)', background: 'var(--color-error-50)', marginBottom: 'var(--space-6)' }}>
          <div className="flex items-center gap-3">
            <AlertCircle size={20} color="var(--color-error-500)" />
            <span style={{ color: 'var(--color-error-600)' }}>{error}</span>
          </div>
        </div>
      )}

      {/* Strategy Results */}
      <AnimatePresence>
        {strategy && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

            {/* Card 1: Goal Understanding */}
            {visibleCards >= 1 && (
              <motion.div className="strategy-card goal" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                <span className="strategy-card-label"><Target size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> Goal Understanding</span>
                <h3>{strategy.goal_summary}</h3>
              </motion.div>
            )}

            {/* Card 2: Audience Discovery */}
            {visibleCards >= 2 && (
              <motion.div className="strategy-card audience" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                <span className="strategy-card-label"><Users size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> Audience Discovery</span>
                <h3>{strategy.audience.segment_name}</h3>
                <div className="grid-3" style={{ marginBottom: 'var(--space-4)' }}>
                  <div className="metric-card card-sm">
                    <div className="metric-card-value">{strategy.audience.customer_count.toLocaleString()}</div>
                    <div className="metric-card-label">Customers</div>
                  </div>
                  <div className="metric-card card-sm">
                    <div className="metric-card-value">{formatCurrency(strategy.audience.revenue_opportunity)}</div>
                    <div className="metric-card-label">Revenue Opportunity</div>
                  </div>
                  <div className="metric-card card-sm">
                    <div className="metric-card-value">{strategy.audience.characteristics.length}</div>
                    <div className="metric-card-label">Key Traits</div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                  {strategy.audience.characteristics.map((c, i) => (
                    <span key={i} className="badge badge-primary">{c}</span>
                  ))}
                </div>
                <div className="decision-reasoning">
                  <strong>Reasoning:</strong> {strategy.audience.reasoning}
                </div>
              </motion.div>
            )}

            {/* Card 3: Strategy Recommendation */}
            {visibleCards >= 3 && (
              <motion.div className="strategy-card strategy" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                <span className="strategy-card-label"><Lightbulb size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> Recommended Strategy</span>
                <h3>{strategy.strategy.campaign_type}</h3>
                <p style={{ color: 'var(--color-gray-600)', marginBottom: 'var(--space-4)' }}>{strategy.strategy.approach}</p>
                <div className="grid-2" style={{ marginBottom: 'var(--space-4)' }}>
                  <div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-400)', marginBottom: 'var(--space-1)' }}>Confidence</div>
                    <div className="flex items-center gap-2">
                      <div className="progress-bar" style={{ flex: 1 }}>
                        <div className="progress-bar-fill" style={{ width: `${strategy.strategy.confidence_score * 100}%` }} />
                      </div>
                      <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>{(strategy.strategy.confidence_score * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-400)', marginBottom: 'var(--space-1)' }}>Expected Outcome</div>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{strategy.strategy.expected_outcome}</div>
                  </div>
                </div>
                <div className="decision-reasoning">
                  <strong>Reasoning:</strong> {strategy.strategy.reasoning}
                </div>
              </motion.div>
            )}

            {/* Card 4: Channel Recommendation */}
            {visibleCards >= 4 && (
              <motion.div className="strategy-card channel" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                <span className="strategy-card-label"><MessageSquare size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> Channel Recommendation</span>
                <h3>
                  <span className={`badge badge-${strategy.channel.primary_channel}`} style={{ fontSize: 'var(--text-sm)', padding: '4px 12px' }}>
                    {strategy.channel.primary_channel.toUpperCase()}
                  </span>
                </h3>
                <div className="grid-4" style={{ marginBottom: 'var(--space-4)' }}>
                  {Object.entries(strategy.channel.channel_metrics).map(([ch, metrics]) => (
                    <div key={ch} className="card card-sm" style={{ borderLeft: `3px solid ${channelColors[ch] || '#6366f1'}` }}>
                      <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', marginBottom: 'var(--space-2)', textTransform: 'capitalize' }}>{ch}</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-500)' }}>
                        <div>Read: {(metrics.read_rate * 100).toFixed(0)}%</div>
                        <div>Click: {(metrics.click_rate * 100).toFixed(0)}%</div>
                        <div>Convert: {(metrics.conversion_rate * 100).toFixed(0)}%</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="decision-reasoning">
                  <strong>Reasoning:</strong> {strategy.channel.reasoning}
                </div>
              </motion.div>
            )}

            {/* Card 5: Message Draft */}
            {visibleCards >= 5 && (
              <motion.div className="strategy-card message" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                <span className="strategy-card-label"><MessageSquare size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> Campaign Draft</span>
                <div className="card" style={{ background: 'var(--color-gray-50)', marginBottom: 'var(--space-4)' }}>
                  <h3 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-2)' }}>{strategy.message.headline}</h3>
                  <p style={{ color: 'var(--color-gray-600)', lineHeight: 'var(--leading-relaxed)', marginBottom: 'var(--space-3)' }}>{strategy.message.body}</p>
                  <button className="btn btn-primary btn-sm">{strategy.message.cta}</button>
                </div>
                <div className="flex gap-2" style={{ flexWrap: 'wrap', marginBottom: 'var(--space-2)' }}>
                  {strategy.message.personalization_tokens.map((t, i) => (
                    <span key={i} className="badge badge-gray" style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>{t}</span>
                  ))}
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-500)' }}>Tone: {strategy.message.tone}</div>
              </motion.div>
            )}

            {/* Card 6: Performance Prediction */}
            {visibleCards >= 6 && (
              <motion.div className="strategy-card performance" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                <span className="strategy-card-label"><BarChart3 size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> Predicted Performance</span>
                <div className="grid-3" style={{ gap: 'var(--space-4)' }}>
                  {[
                    { label: 'Estimated Reach', value: strategy.performance.estimated_reach.toLocaleString() },
                    { label: 'Estimated Opens', value: strategy.performance.estimated_opens.toLocaleString() },
                    { label: 'Estimated Clicks', value: strategy.performance.estimated_clicks.toLocaleString() },
                    { label: 'Estimated Conversions', value: strategy.performance.estimated_conversions.toLocaleString() },
                    { label: 'Estimated Revenue', value: formatCurrency(strategy.performance.estimated_revenue) },
                  ].map((m) => (
                    <div key={m.label} className="metric-card card-sm">
                      <div className="metric-card-value">{m.value}</div>
                      <div className="metric-card-label">{m.label}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Card 7: Decision Reasoning + Launch */}
            {visibleCards >= 7 && (
              <motion.div className="strategy-card decisions" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                <span className="strategy-card-label"><AlertCircle size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> Decision Reasoning</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
                  {strategy.decision_reasoning.map((r, i) => (
                    <div key={i} className="decision-reasoning">{r}</div>
                  ))}
                </div>

                {launched ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="btn btn-primary btn-lg w-full"
                    style={{ justifyContent: 'center', background: 'var(--color-success-500)', border: 'none', cursor: 'default' }}
                  >
                    <CheckCircle2 size={20} /> Campaign Queued! Redirecting...
                  </motion.div>
                ) : (
                  <LoadingButton
                    loading={launchLoading}
                    loadingText="Launching..."
                    icon={<Rocket size={20} />}
                    size="lg"
                    onClick={handleLaunchCampaign}
                    id="launch-campaign-btn"
                    className="w-full"
                    style={{ justifyContent: 'center' }}
                  >
                    Launch Campaign
                  </LoadingButton>
                )}
              </motion.div>
            )}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
