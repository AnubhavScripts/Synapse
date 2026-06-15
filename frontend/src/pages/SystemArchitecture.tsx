import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Database, Cpu, GitBranch, ArrowRight, Send, Terminal, 
  Server, Globe, Activity, Sparkles, Layers, Bot, ListChecks 
} from 'lucide-react';

export default function SystemArchitecture() {
  const [activeTab, setActiveTab] = useState<'pipeline' | 'infrastructure' | 'hybrid'>('pipeline');

  useEffect(() => {
    document.title = 'Synapse | System Architecture';
  }, []);

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 'var(--space-6)' }}>
        <div>
          <h1>System Intelligence</h1>
          <p>Technical breakdown of Synapse's hybrid decision pipeline and distributed execution layers</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: 'var(--space-2)', 
        marginBottom: 'var(--space-6)', 
        borderBottom: '1px solid var(--color-gray-200)',
        paddingBottom: '1px'
      }}>
        <button
          onClick={() => setActiveTab('pipeline')}
          className={`btn ${activeTab === 'pipeline' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0, padding: '10px 20px' }}
        >
          <GitBranch size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
          <span>Intelligence Pipeline</span>
        </button>
        <button
          onClick={() => setActiveTab('infrastructure')}
          className={`btn ${activeTab === 'infrastructure' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0, padding: '10px 20px' }}
        >
          <Server size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
          <span>Distributed Infrastructure</span>
        </button>
        <button
          onClick={() => setActiveTab('hybrid')}
          className={`btn ${activeTab === 'hybrid' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0, padding: '10px 20px' }}
        >
          <Layers size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
          <span>Deterministic vs. Generative Layer</span>
        </button>
      </div>

      {/* Tab 1: Intelligence Pipeline */}
      {activeTab === 'pipeline' && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="section"
        >
          <h2 className="section-title">End-to-End Intelligence Pipeline</h2>
          <p style={{ color: 'var(--color-gray-500)', marginBottom: 'var(--space-6)', maxWidth: 800 }}>
            Our decision-making pipeline runs continuously to scan for customer risk, evaluate opportunities, select optimal actions, customize copy via LLMs, and dispatch messages dynamically.
          </p>

          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 'var(--space-6)',
            position: 'relative',
            paddingLeft: 'var(--space-4)'
          }}>
            {/* vertical connector line on desktop */}
            <div style={{
              position: 'absolute',
              left: '30px',
              top: '20px',
              bottom: '20px',
              width: '2px',
              background: 'linear-gradient(to bottom, var(--color-primary-500), var(--color-secondary-500))',
              zIndex: 0
            }} />

            {/* Step 1 */}
            <div style={{ display: 'flex', gap: 'var(--space-4)', position: 'relative', zIndex: 1 }}>
              <div style={{ 
                width: 36, 
                height: 36, 
                borderRadius: '50%', 
                background: 'var(--color-primary-500)', 
                color: '#fff', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontWeight: 'bold',
                flexShrink: 0
              }}>
                <Database size={16} />
              </div>
              <div style={{ background: 'var(--color-surface)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-gray-100)', flex: 1 }}>
                <h3 style={{ margin: '0 0 var(--space-1) 0', fontSize: 'var(--text-md)', fontWeight: 700 }}>1. Data Ingestion &amp; Event Stream</h3>
                <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)' }}>
                  Customer transactions, page view logs, and cart activities are ingested asynchronously into the system. These trigger real-time metrics recalculations in user timelines.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div style={{ display: 'flex', gap: 'var(--space-4)', position: 'relative', zIndex: 1 }}>
              <div style={{ 
                width: 36, 
                height: 36, 
                borderRadius: '50%', 
                background: 'var(--color-primary-500)', 
                color: '#fff', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontWeight: 'bold',
                flexShrink: 0
              }}>
                <Activity size={16} />
              </div>
              <div style={{ background: 'var(--color-surface)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-gray-100)', flex: 1 }}>
                <h3 style={{ margin: '0 0 var(--space-1) 0', fontSize: 'var(--text-md)', fontWeight: 700 }}>2. Persona Engine (RFM + Affinity Scoring)</h3>
                <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)' }}>
                  Calculates Recency, Frequency, Monetary (RFM) parameters. Assigns preferred channel scores (email, SMS, WhatsApp, RCS), price sensitivities, discount thresholds, and churn probabilities.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div style={{ display: 'flex', gap: 'var(--space-4)', position: 'relative', zIndex: 1 }}>
              <div style={{ 
                width: 36, 
                height: 36, 
                borderRadius: '50%', 
                background: 'var(--color-primary-500)', 
                color: '#fff', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontWeight: 'bold',
                flexShrink: 0
              }}>
                <Cpu size={16} />
              </div>
              <div style={{ background: 'var(--color-surface)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-gray-100)', flex: 1 }}>
                <h3 style={{ margin: '0 0 var(--space-1) 0', fontSize: 'var(--text-md)', fontWeight: 700 }}>3. Opportunity Discovery Engine</h3>
                <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)' }}>
                  A background scanner runs deterministic checks (e.g. VIP hasn't purchased in 30 days, cart abandoned &gt; 2 hours) to package leakage events as **Discovered Opportunities** with concrete Value at Risk.
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div style={{ display: 'flex', gap: 'var(--space-4)', position: 'relative', zIndex: 1 }}>
              <div style={{ 
                width: 36, 
                height: 36, 
                borderRadius: '50%', 
                background: 'var(--color-secondary-500)', 
                color: '#fff', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontWeight: 'bold',
                flexShrink: 0
              }}>
                <Sparkles size={16} />
              </div>
              <div style={{ background: 'var(--color-surface)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-gray-100)', flex: 1 }}>
                <h3 style={{ margin: '0 0 var(--space-1) 0', fontSize: 'var(--text-md)', fontWeight: 700 }}>4. AI Revenue Strategist (Option Modeling)</h3>
                <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)' }}>
                  Generates and models 3 distinct candidate strategy options based on the opportunity type. Simulates expected conversion probabilities, margins, and effort, returning a structured recommendation.
                </p>
              </div>
            </div>

            {/* Step 5 */}
            <div style={{ display: 'flex', gap: 'var(--space-4)', position: 'relative', zIndex: 1 }}>
              <div style={{ 
                width: 36, 
                height: 36, 
                borderRadius: '50%', 
                background: 'var(--color-secondary-500)', 
                color: '#fff', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontWeight: 'bold',
                flexShrink: 0
              }}>
                <Bot size={16} />
              </div>
              <div style={{ background: 'var(--color-surface)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-gray-100)', flex: 1 }}>
                <h3 style={{ margin: '0 0 var(--space-1) 0', fontSize: 'var(--text-md)', fontWeight: 700 }}>5. Generative Copywriter (Gemini LLM)</h3>
                <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)' }}>
                  Once a strategy option is chosen, the engine prompts the Gemini LLM with context tags (e.g. VIP, price-sensitive, last-bought sneakers). Gemini constructs personalized, contextually tailored headliners and CTA buttons.
                </p>
              </div>
            </div>

            {/* Step 6 */}
            <div style={{ display: 'flex', gap: 'var(--space-4)', position: 'relative', zIndex: 1 }}>
              <div style={{ 
                width: 36, 
                height: 36, 
                borderRadius: '50%', 
                background: 'var(--color-success-500)', 
                color: '#fff', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontWeight: 'bold',
                flexShrink: 0
              }}>
                <Send size={16} />
              </div>
              <div style={{ background: 'var(--color-surface)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-gray-100)', flex: 1 }}>
                <h3 style={{ margin: '0 0 var(--space-1) 0', fontSize: 'var(--text-md)', fontWeight: 700 }}>6. Messaging Gateway Dispatch</h3>
                <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)' }}>
                  Queues messages for delivery through the autonomous gateway. The gateway communicates with live webhooks to dispatch to channels, tracks read/clicks, and feeds metrics back to Analytics.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Tab 2: Distributed Infrastructure */}
      {activeTab === 'infrastructure' && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="section"
        >
          <h2 className="section-title">Distributed Infrastructure Architecture</h2>
          <p style={{ color: 'var(--color-gray-500)', marginBottom: 'var(--space-6)', maxWidth: 800 }}>
            Synapse operates on a split architecture consisting of a primary Management CRM and a high-performance outbound Messaging Gateway.
          </p>

          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 'var(--space-6)' 
          }}>
            {/* Box Diagram */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 'var(--space-5)',
              alignItems: 'stretch'
            }}>
              {/* Frontend Card */}
              <div style={{
                background: '#fdfbfe',
                border: '2px solid var(--color-primary-100)',
                borderRadius: 'var(--radius-xl)',
                padding: 'var(--space-5)',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: 'var(--shadow-sm)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'var(--space-3)' }}>
                  <div className="metric-card-icon primary" style={{ width: 32, height: 32 }}><Globe size={16} /></div>
                  <h3 style={{ margin: 0, fontSize: 'var(--text-md)', fontWeight: 700 }}>Frontend Web App</h3>
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary-600)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 'var(--space-2)' }}>Vercel Host</div>
                <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)', flex: 1 }}>
                  Built with React 19, TypeScript, and Vite. Implements scoped Tailwind for marketing layers and native CSS design tokens for the internal workspace. Integrates API clients using React Query.
                </p>
              </div>

              {/* CRM API Card */}
              <div style={{
                background: '#fdfbfe',
                border: '2px solid var(--color-primary-100)',
                borderRadius: 'var(--radius-xl)',
                padding: 'var(--space-5)',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: 'var(--shadow-sm)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'var(--space-3)' }}>
                  <div className="metric-card-icon primary" style={{ width: 32, height: 32 }}><Server size={16} /></div>
                  <h3 style={{ margin: 0, fontSize: 'var(--text-md)', fontWeight: 700 }}>CRM backend (:8000)</h3>
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary-600)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 'var(--space-2)' }}>Render Server / FastAPI</div>
                <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)', flex: 1 }}>
                  Manages client state, customer database, segment definitions, analytics queries, and orchestrates the Opportunity Engine. Calls Gemini SDK for strategic copywriting.
                </p>
              </div>

              {/* Gateway Card */}
              <div style={{
                background: '#fafaff',
                border: '2px solid var(--color-secondary-100)',
                borderRadius: 'var(--radius-xl)',
                padding: 'var(--space-5)',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: 'var(--shadow-sm)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'var(--space-3)' }}>
                  <div className="metric-card-icon info" style={{ width: 32, height: 32 }}><Terminal size={16} /></div>
                  <h3 style={{ margin: 0, fontSize: 'var(--text-md)', fontWeight: 700 }}>Messaging Gateway (:8001)</h3>
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-secondary-600)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 'var(--space-2)' }}>Isolated Worker / API</div>
                <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)', flex: 1 }}>
                  Decoupled server that processes campaign dispatches asynchronously, manages webhooks, simulates channel response queues, and fires status callbacks back to the CRM API.
                </p>
              </div>

              {/* Database Card */}
              <div style={{
                background: '#fcfcfc',
                border: '2px solid var(--color-gray-200)',
                borderRadius: 'var(--radius-xl)',
                padding: 'var(--space-5)',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: 'var(--shadow-sm)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'var(--space-3)' }}>
                  <div className="metric-card-icon success" style={{ width: 32, height: 32 }}><Database size={16} /></div>
                  <h3 style={{ margin: 0, fontSize: 'var(--text-md)', fontWeight: 700 }}>PostgreSQL DB</h3>
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-success-600)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 'var(--space-2)' }}>Neon / Supabase Server</div>
                <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)', flex: 1 }}>
                  Stores relational schemas for customers, activity logs, segment rules, campaigns, and AI decision histories. Uses SQLAlchemy AsyncSession for non-blocking I/O.
                </p>
              </div>
            </div>

            {/* Network Communication Flow visual */}
            <div style={{ 
              background: 'var(--color-surface)', 
              padding: 'var(--space-4)', 
              borderRadius: 'var(--radius-lg)', 
              border: '1px solid var(--color-gray-200)',
              marginTop: 'var(--space-3)'
            }}>
              <h4 style={{ margin: '0 0 var(--space-2) 0', fontSize: 'var(--text-sm)' }}>Communication Protocol &amp; Webhook Cycle</h4>
              <div style={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                alignItems: 'center', 
                gap: 'var(--space-3)',
                fontSize: 'var(--text-xs)',
                color: 'var(--color-gray-500)',
                fontFamily: 'var(--font-data-mono)'
              }}>
                <span>[Client App]</span>
                <ArrowRight size={14} style={{ color: 'var(--color-primary-500)' }} />
                <span>POST /campaigns/:id/launch</span>
                <ArrowRight size={14} style={{ color: 'var(--color-primary-500)' }} />
                <span>[CRM API]</span>
                <ArrowRight size={14} style={{ color: 'var(--color-primary-500)' }} />
                <span>POST GATEWAY_DISPATCH_URL</span>
                <ArrowRight size={14} style={{ color: 'var(--color-secondary-500)' }} />
                <span>[Gateway Server]</span>
                <ArrowRight size={14} style={{ color: 'var(--color-secondary-500)' }} />
                <span>POST CRM_CALLBACK_URL (Delivery Status)</span>
                <ArrowRight size={14} style={{ color: 'var(--color-primary-500)' }} />
                <span>[CRM API Logged]</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Tab 3: Hybrid AI separation */}
      {activeTab === 'hybrid' && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="section"
        >
          <h2 className="section-title">AI Layer Separation: Deterministic vs. Generative</h2>
          <p style={{ color: 'var(--color-gray-500)', marginBottom: 'var(--space-6)', maxWidth: 800 }}>
            Synapse does not rely on LLMs for financial arithmetic, sorting, or base customer segmentation. We isolate generative models to qualitative actions, while keeping calculations fully deterministic.
          </p>

          <div className="grid-2">
            {/* Deterministic */}
            <div style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-gray-200)',
              borderRadius: 'var(--radius-xl)',
              padding: 'var(--space-5)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'var(--space-4)' }}>
                <div className="metric-card-icon success" style={{ width: 36, height: 36 }}><ListChecks size={18} /></div>
                <h3 style={{ margin: 0, fontSize: 'var(--text-lg)', fontWeight: 700 }}>Deterministic Layer</h3>
              </div>
              <ul style={{ paddingLeft: 'var(--space-4)', margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-gray-600)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <li>
                  <strong>RFM Segments:</strong> Customer behavior variables are processed via standard database SQL grouping logic.
                </li>
                <li>
                  <strong>Value at Risk Calculations:</strong> Calculated exactly based on customer order history and lifetime value.
                </li>
                <li>
                  <strong>Campaign Deliverability:</strong> Outbound queue routing, retry policies, and webhook tracking are handled by standard programmatic state machines.
                </li>
                <li>
                  <strong>Affinity Scores:</strong> Normalized channel engagement counts represent concrete, mathematically sound statistical scores.
                </li>
              </ul>
            </div>

            {/* Generative */}
            <div style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-gray-200)',
              borderRadius: 'var(--radius-xl)',
              padding: 'var(--space-5)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'var(--space-4)' }}>
                <div className="metric-card-icon primary" style={{ width: 36, height: 36 }}><Bot size={18} /></div>
                <h3 style={{ margin: 0, fontSize: 'var(--text-lg)', fontWeight: 700 }}>Generative Layer (LLM)</h3>
              </div>
              <ul style={{ paddingLeft: 'var(--space-4)', margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-gray-600)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <li>
                  <strong>Copywriting Personalization:</strong> Generates unique message headings, body copy, and button scripts matching individual context tags.
                </li>
                <li>
                  <strong>Why Now Reasoning:</strong> Synthesizes external parameters (e.g. inventory alerts, holiday weekends, transaction patterns) into readable explanations.
                </li>
                <li>
                  <strong>Strategy Recommendations:</strong> Reviews the quantitative outcomes of simulated campaign options to write logical rationales for selection.
                </li>
                <li>
                  <strong>Segment Queries:</strong> Interprets loose natural language prompts (e.g. "active users who bought shoes") and translates them into structured segment filters.
                </li>
              </ul>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
