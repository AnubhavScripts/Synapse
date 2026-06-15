import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

// Shader code definitions
const vs = `
attribute vec2 a_position;
varying vec2 v_texCoord;
void main() {
  v_texCoord = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const fs = `
precision highp float;
varying vec2 v_texCoord;
uniform float u_time;
uniform vec2 u_resolution;

void main() {
    vec2 uv = v_texCoord;
    vec3 color1 = vec3(0.388, 0.4, 0.945);
    vec3 color2 = vec3(0.976, 0.98, 0.984);
    vec3 color3 = vec3(0.31, 0.275, 0.898);
    float noise = sin(uv.x * 3.0 + u_time * 0.2) * cos(uv.y * 2.0 - u_time * 0.1) * 0.5 + 0.5;
    vec3 bg = mix(color2, mix(color1, color3, uv.y), noise * 0.1);
    gl_FragColor = vec4(bg, 1.0);
}
`;

export default function LandingPage() {
  const navigate = useNavigate();
  const canvasRef1 = useRef<HTMLCanvasElement>(null);
  const canvasRef2 = useRef<HTMLCanvasElement>(null);

  const setupShader = (canvas: HTMLCanvasElement) => {
    const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (!gl) return null;
    const cs = (type: number, src: string) => {
      const s = gl.createShader(type);
      if (!s) return null;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram();
    if (!prog) return null;
    const vertexShader = cs(gl.VERTEX_SHADER, vs);
    const fragmentShader = cs(gl.FRAGMENT_SHADER, fs);
    if (!vertexShader || !fragmentShader) return null;
    gl.attachShader(prog, vertexShader);
    gl.attachShader(prog, fragmentShader);
    gl.linkProgram(prog);
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(prog, 'a_position');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
    const uTime = gl.getUniformLocation(prog, 'u_time');
    const uRes = gl.getUniformLocation(prog, 'u_resolution');
    let animationId: number;
    const syncSize = () => {
      const w = canvas.clientWidth || 1280;
      const h = canvas.clientHeight || 720;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    };
    syncSize();
    const render = (t: number) => {
      syncSize();
      gl.viewport(0, 0, canvas.width, canvas.height);
      if (uTime) gl.uniform1f(uTime, t * 0.001);
      if (uRes) gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      animationId = requestAnimationFrame(render);
    };
    render(0);
    return () => { cancelAnimationFrame(animationId); };
  };

  useEffect(() => {
    document.title = 'Synapse | Autonomous Customer Growth';
    let cleanup1: (() => void) | null = null;
    let cleanup2: (() => void) | null = null;
    if (canvasRef1.current) { const res = setupShader(canvasRef1.current); if (res) cleanup1 = res; }
    if (canvasRef2.current) { const res = setupShader(canvasRef2.current); if (res) cleanup2 = res; }
    return () => {
      if (cleanup1) cleanup1();
      if (cleanup2) cleanup2();
    };
  }, []);

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', backgroundColor: '#fcf8ff', color: '#1b1b23', overflowX: 'hidden' }}>

      {/* ── NAV ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(198,196,215,0.3)', height: 72,
        display: 'flex', alignItems: 'center',
        boxShadow: '0 1px 12px rgba(70,72,212,0.06)'
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 40px', width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: 20, color: '#4648d4', letterSpacing: '-0.5px' }}>Synapse</div>
          <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
            {['Platform', 'Solutions', 'Developers', 'Pricing'].map((item, i) => (
              <a key={item} href={['#platform','#features','#architecture','#benefits'][i]}
                style={{ fontSize: 14, fontWeight: 500, textDecoration: 'none', color: i === 0 ? '#4648d4' : '#464554', borderBottom: i === 0 ? '2px solid #4648d4' : 'none', paddingBottom: i === 0 ? 2 : 0, transition: 'color 0.2s' }}>
                {item}
              </a>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button onClick={() => navigate('/signin')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500, color: '#464554' }}>Sign In</button>
            <button onClick={() => navigate('/signin')} style={{ background: '#4648d4', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(70,72,212,0.25)' }}>Get a Demo</button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section id="platform" style={{ position: 'relative', minHeight: '100vh', paddingTop: 120, paddingBottom: 80, display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.45 }}>
          <canvas ref={canvasRef1} style={{ display: 'block', width: '100%', height: '100%' }} />
        </div>
        <div style={{ position: 'relative', zIndex: 10, maxWidth: 1280, margin: '0 auto', padding: '0 40px', width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: 'rgba(70,72,212,0.1)', color: '#4648d4', borderRadius: 100, marginBottom: 24, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>auto_awesome</span>
              Autonomous Growth Platform
            </div>
            <h1 style={{ fontSize: 52, fontWeight: 800, lineHeight: 1.1, marginBottom: 24, color: '#1b1b23', letterSpacing: '-1.5px', margin: '0 0 24px' }}>
              Turn Customer Behavior Into{' '}
              <span style={{ color: '#4648d4' }}>Revenue Growth</span>{' '}
              Automatically
            </h1>
            <p style={{ fontSize: 18, lineHeight: 1.65, color: '#6b6a80', marginBottom: 40, maxWidth: 500, margin: '0 0 40px' }}>
              A hybrid intelligence engine continuously analyzes customer behavior, detects revenue opportunities, recommends optimal campaign strategies, and executes personalized communication at scale.
            </p>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <button onClick={() => navigate('/signin')} style={{ background: '#4648d4', border: 'none', color: '#fff', padding: '16px 32px', borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 8px 24px rgba(70,72,212,0.28)', transition: 'transform 0.2s' }}>
                Start Free Trial
              </button>
              <button onClick={() => navigate('/signin')} style={{ background: '#fff', border: '1px solid #c7c4d7', color: '#1b1b23', padding: '16px 32px', borderRadius: 14, fontSize: 16, fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }}>
                View Architecture
              </button>
            </div>
          </div>

          <div style={{ position: 'relative' }}>
            <div style={{ background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(16px)', borderRadius: 28, padding: 32, border: '1px solid rgba(255,255,255,0.6)', boxShadow: '0 20px 60px rgba(70,72,212,0.12)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(70,72,212,0.1)', border: '1px solid rgba(70,72,212,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4648d4' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 28 }}>database</span>
                </div>
                <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, rgba(70,72,212,0.2), rgba(75,65,225,0.2))', margin: '0 8px' }} />
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(75,65,225,0.1)', border: '1px solid rgba(75,65,225,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4b41e1' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 28 }}>psychology</span>
                </div>
                <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, rgba(75,65,225,0.2), rgba(70,72,212,0.2))', margin: '0 8px' }} />
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(70,72,212,0.1)', border: '1px solid rgba(70,72,212,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4648d4' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 28 }}>rocket_launch</span>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 4px 16px rgba(0,0,0,0.08)', transform: 'rotate(-2deg)' }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#464554', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Churn Risk</p>
                  <p style={{ fontSize: 28, fontWeight: 800, color: '#ba1a1a', margin: '0 0 10px', fontFamily: 'JetBrains Mono, monospace' }}>92%</p>
                  <div style={{ height: 4, background: '#f0f0f0', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: '92%', height: '100%', background: '#ba1a1a', borderRadius: 4 }} />
                  </div>
                </div>
                <div style={{ background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 4px 16px rgba(0,0,0,0.08)', transform: 'rotate(3deg)' }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#464554', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Revenue At Risk</p>
                  <p style={{ fontSize: 24, fontWeight: 800, color: '#1b1b23', margin: '0 0 4px', fontFamily: 'JetBrains Mono, monospace' }}>₹68,200</p>
                  <p style={{ fontSize: 12, color: '#4648d4', fontWeight: 600, margin: 0 }}>+12.4% from avg</p>
                </div>
              </div>
            </div>
            <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, background: 'rgba(70,72,212,0.08)', borderRadius: '50%', filter: 'blur(40px)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: -40, left: -40, width: 160, height: 160, background: 'rgba(75,65,225,0.08)', borderRadius: '50%', filter: 'blur(40px)', pointerEvents: 'none' }} />
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF ── */}
      <section style={{ padding: '40px 0', background: '#f9f9fc', borderTop: '1px solid #e9e6f3', borderBottom: '1px solid #e9e6f3' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 40px', textAlign: 'center' }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#9998ae', marginBottom: 24 }}>Trusted by modern consumer brands</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 48, opacity: 0.55 }}>
            {['Nike', 'Starbucks', 'Nykaa', 'boAt', 'Mamaearth', 'Zara'].map(brand => (
              <span key={brand} style={{ fontSize: 20, fontWeight: 800, color: '#1b1b23', letterSpacing: '-0.5px' }}>{brand}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section style={{ padding: '64px 0', background: '#fff' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 40px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 32, textAlign: 'center' }}>
            {[
              { value: '12M+', label: 'Interactions Processed' },
              { value: '38%', label: 'Higher Campaign Conversion' },
              { value: '₹24Cr', label: 'Revenue Recovered' },
              { value: '99.98%', label: 'Delivery Reliability' },
            ].map(stat => (
              <div key={stat.value}>
                <p style={{ fontSize: 40, fontWeight: 900, color: '#4648d4', margin: '0 0 8px', fontFamily: 'JetBrains Mono, monospace' }}>{stat.value}</p>
                <p style={{ fontSize: 13, color: '#6b6a80', fontWeight: 500, margin: 0 }}>{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROBLEMS ── */}
      <section id="features" style={{ padding: '80px 0', background: '#fff' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 40px' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={{ fontSize: 36, fontWeight: 800, color: '#1b1b23', margin: '0 0 16px', letterSpacing: '-0.8px' }}>Most brands react after revenue is already lost</h2>
            <p style={{ fontSize: 16, color: '#6b6a80', maxWidth: 560, margin: '0 auto' }}>Traditional engagement tools are reactive. Synapse shifts you to proactive growth.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {[
              { icon: 'timer_off', title: 'Delayed Detection', desc: 'Finding out a customer churned 30 days after their last login is too late.' },
              { icon: 'emergency_home', title: 'Manual Segmentation', desc: 'Static lists become obsolete the moment they are generated. Dynamic needs are missed.' },
              { icon: 'chat_bubble_outline', title: 'Generic Messaging', desc: 'Sending the same discount to a VIP and a low-value user burns margin and brand equity.' },
              { icon: 'broken_image', title: 'Data Silos', desc: "Behavioral data and execution channels don't talk, leading to broken experiences." },
              { icon: 'bar_chart', title: 'Blind Execution', desc: 'Sending campaigns without knowing the probability of conversion is pure guesswork.' },
              { icon: 'psychology_alt', title: 'Static Logic', desc: 'Hard-coded workflows cannot adapt to changing market conditions or user trends.' },
            ].map(item => (
              <div key={item.title} style={{ padding: 32, borderRadius: 20, border: '1px solid rgba(198,196,215,0.4)', transition: 'box-shadow 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 8px 32px rgba(70,72,212,0.1)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>
                <span className="material-symbols-outlined" style={{ fontSize: 28, color: '#4648d4', display: 'block', marginBottom: 16 }}>{item.icon}</span>
                <h3 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 10px', color: '#1b1b23' }}>{item.title}</h3>
                <p style={{ fontSize: 14, color: '#6b6a80', lineHeight: 1.6, margin: 0 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CUSTOMER INTELLIGENCE ── */}
      <section style={{ padding: '80px 0', background: '#f8f7ff', overflow: 'hidden' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 40px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <div style={{ background: '#fff', borderRadius: 28, padding: 32, boxShadow: '0 12px 48px rgba(70,72,212,0.1)', position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h4 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Customer Profile</h4>
                <span style={{ padding: '4px 12px', borderRadius: 100, background: 'rgba(186,26,26,0.08)', color: '#ba1a1a', fontSize: 12, fontWeight: 700 }}>High Priority</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: 20, background: '#f5f2fe', borderRadius: 16, marginBottom: 16 }}>
                <div>
                  <p style={{ fontSize: 12, color: '#6b6a80', margin: '0 0 4px' }}>Customer Risk</p>
                  <p style={{ fontSize: 20, fontWeight: 800, margin: 0, fontFamily: 'JetBrains Mono, monospace' }}>Dormant</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 12, color: '#6b6a80', margin: '0 0 4px' }}>Growth Score</p>
                  <p style={{ fontSize: 20, fontWeight: 800, color: '#4648d4', margin: 0, fontFamily: 'JetBrains Mono, monospace' }}>72/100</p>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[{ label: 'LTV Potential', value: '₹1.2L' }, { label: 'Last Activity', value: '14d ago' }].map(item => (
                  <div key={item.label} style={{ padding: 16, border: '1px solid rgba(198,196,215,0.4)', borderRadius: 14 }}>
                    <p style={{ fontSize: 10, color: '#9998ae', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px' }}>{item.label}</p>
                    <p style={{ fontSize: 18, fontWeight: 800, margin: 0, fontFamily: 'JetBrains Mono, monospace' }}>{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(70,72,212,0.05)', borderRadius: 28, transform: 'rotate(-3deg)', zIndex: 0, top: -8, left: -8, right: 8, bottom: 8 }} />
          </div>
          <div>
            <h2 style={{ fontSize: 36, fontWeight: 800, margin: '0 0 20px', letterSpacing: '-0.8px' }}>Deep Customer Intelligence</h2>
            <p style={{ fontSize: 16, color: '#6b6a80', lineHeight: 1.65, margin: '0 0 32px' }}>
              Synapse builds a real-time behavioral graph for every user. We don't just see what they did; we predict what they'll do next using proprietary engagement modeling.
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {['Dynamic Engagement Scoring (0–100)', 'Predictive Churn & Dormancy Detection', 'Automated RFM (Recency, Frequency, Monetary) Tracking'].map(item => (
                <li key={item} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 15, color: '#1b1b23', fontWeight: 500 }}>
                  <span className="material-symbols-outlined" style={{ color: '#4648d4', fontSize: 22 }}>check_circle</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── OPPORTUNITY DISCOVERY ── */}
      <section style={{ padding: '80px 0' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 40px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 48, gap: 24 }}>
            <div style={{ maxWidth: 520 }}>
              <h2 style={{ fontSize: 36, fontWeight: 800, margin: '0 0 12px', letterSpacing: '-0.8px' }}>Discovery: Where the money is hiding</h2>
              <p style={{ fontSize: 16, color: '#6b6a80', margin: 0 }}>Our AI scans millions of signals to highlight specific revenue leakage points in real-time.</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {['chevron_left', 'chevron_right'].map(icon => (
                <div key={icon} style={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid #c7c4d7', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{icon}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 28 }}>
            {[
              { icon: 'analytics', color: '#4648d4', bg: 'rgba(70,72,212,0.08)', borderColor: '#4648d4', id: '#OPP-882', title: 'Dormant Recovery', desc: '4,210 users showing 85% churn probability in the next 48 hours.', value: '₹6.8L', priority: '92/100', priorityColor: '#4648d4' },
              { icon: 'shopping_cart', color: '#4b41e1', bg: 'rgba(75,65,225,0.08)', borderColor: '#4b41e1', id: '#OPP-412', title: 'Upsell Potential', desc: 'High-value users with low average order value compared to segment.', value: '₹12.4L', priority: '78/100', priorityColor: '#4b41e1' },
              { icon: 'person_celebrate', color: '#904900', bg: 'rgba(144,73,0,0.08)', borderColor: '#b55d00', id: '#OPP-715', title: 'Loyalty Reinforcement', desc: 'Top 1% users reaching milestone without engagement in 30 days.', value: '₹3.2L', priority: '85/100', priorityColor: '#904900' },
            ].map(card => (
              <div key={card.id} style={{ background: '#fff', borderRadius: 20, padding: 32, borderTop: `4px solid ${card.borderColor}`, boxShadow: '0 2px 12px rgba(0,0,0,0.05)', transition: 'box-shadow 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 8px 32px rgba(70,72,212,0.12)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.05)')}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 24, color: card.color, padding: 8, background: card.bg, borderRadius: 10 }}>{card.icon}</span>
                  <span style={{ fontSize: 11, background: '#f5f2fe', padding: '4px 10px', borderRadius: 6, fontFamily: 'JetBrains Mono, monospace', color: '#464554' }}>{card.id}</span>
                </div>
                <h4 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 10px' }}>{card.title}</h4>
                <p style={{ fontSize: 14, color: '#6b6a80', margin: '0 0 28px', lineHeight: 1.55 }}>{card.desc}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(198,196,215,0.35)', paddingTop: 24 }}>
                  <div>
                    <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9998ae', margin: '0 0 4px' }}>Value at Risk</p>
                    <p style={{ fontSize: 22, fontWeight: 800, margin: 0, fontFamily: 'JetBrains Mono, monospace' }}>{card.value}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9998ae', margin: '0 0 4px' }}>Priority</p>
                    <p style={{ fontSize: 22, fontWeight: 800, color: card.priorityColor, margin: 0, fontFamily: 'JetBrains Mono, monospace' }}>{card.priority}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI STRATEGIST ── */}
      <section style={{ padding: '80px 0', background: '#f0eeff' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 40px' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={{ fontSize: 36, fontWeight: 800, margin: '0 0 16px', letterSpacing: '-0.8px' }}>AI Revenue Strategist</h2>
            <p style={{ fontSize: 16, color: '#6b6a80', maxWidth: 520, margin: '0 auto' }}>The AI doesn't just find problems; it designs the perfect experimental solution for each user.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr', gap: 24, alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {[
                { num: '1', title: 'Deep Analysis', desc: 'User "Rajesh" has ₹4,500 cart value but dropped off at shipping. Sensitivity: Medium.', active: true },
                { num: '2', title: 'Why Now?', desc: 'Contextual window: Payday weekend + high inventory levels for selected items.', active: false },
              ].map(step => (
                <div key={step.num} style={{ padding: 24, background: step.active ? '#fff' : 'rgba(255,255,255,0.55)', borderRadius: 20, border: step.active ? '1px solid rgba(70,72,212,0.25)' : '1px solid rgba(198,196,215,0.3)', boxShadow: step.active ? '0 4px 24px rgba(70,72,212,0.08)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <span style={{ width: 32, height: 32, borderRadius: '50%', background: step.active ? '#4648d4' : '#e9e6f3', color: step.active ? '#fff' : '#464554', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14 }}>{step.num}</span>
                    <h5 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: step.active ? '#1b1b23' : '#6b6a80' }}>{step.title}</h5>
                  </div>
                  <p style={{ fontSize: 13, color: '#6b6a80', margin: 0, lineHeight: 1.55 }}>{step.desc}</p>
                </div>
              ))}
            </div>

            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 0' }}>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 200, height: 200, background: 'rgba(70,72,212,0.1)', borderRadius: '50%', filter: 'blur(48px)' }} />
              </div>
              <div style={{ position: 'relative', background: '#fff', borderRadius: 28, padding: 28, border: '2px solid #4648d4', textAlign: 'center', width: '100%', boxShadow: '0 12px 40px rgba(70,72,212,0.15)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#4648d4', display: 'block', marginBottom: 12 }}>smart_toy</span>
                <h4 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 20px' }}>Strategy Selection</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ padding: '14px 16px', background: '#4648d4', borderRadius: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff' }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>Option A: 10% Discount</span>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check_circle</span>
                  </div>
                  {['Option B: Free Shipping — High Risk', 'Option C: Flash Sale — Wait'].map(opt => (
                    <div key={opt} style={{ padding: '14px 16px', background: 'rgba(255,255,255,0.7)', borderRadius: 14, border: '1px solid rgba(198,196,215,0.4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#6b6a80' }}>
                      <span style={{ fontSize: 13 }}>{opt.split('—')[0]}</span>
                      <span style={{ fontSize: 11, opacity: 0.6 }}>{opt.split('—')[1]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ padding: 24, background: '#fff', borderRadius: 20, border: '1px solid rgba(198,196,215,0.3)', boxShadow: '0 4px 24px rgba(75,65,225,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <span style={{ width: 32, height: 32, borderRadius: '50%', background: '#4b41e1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14 }}>3</span>
                  <h5 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Execution Payload</h5>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {['100%', '75%', '50%'].map((w, i) => (
                    <div key={i} style={{ height: 6, background: '#efecf8', borderRadius: 3, overflow: 'hidden', width: w === '100%' ? '100%' : w === '75%' ? '75%' : '50%' }}>
                      <div style={{ height: '100%', background: '#4b41e1', borderRadius: 3, width: '100%' }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── GENERATIVE PERSONALIZATION ── */}
      <section id="architecture" style={{ padding: '80px 0' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 40px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: 36, fontWeight: 800, margin: '0 0 20px', letterSpacing: '-0.8px' }}>Generative Personalization</h2>
            <p style={{ fontSize: 16, color: '#6b6a80', lineHeight: 1.65, margin: '0 0 32px' }}>
              Stop creating a hundred versions of the same email. Our engine generates unique creative assets, copy, and channel paths for every single customer interaction.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {[
                { label: 'WhatsApp', icon: 'chat', bg: '#d1fae5', color: '#065f46' },
                { label: 'Email', icon: 'mail', bg: '#ede9fe', color: '#5b21b6' },
                { label: 'SMS', icon: 'sms', bg: '#dbeafe', color: '#1e40af' },
                { label: 'RCS', icon: 'bolt', bg: '#fef3c7', color: '#92400e' },
              ].map(ch => (
                <span key={ch.label} style={{ padding: '8px 16px', borderRadius: 10, background: ch.bg, color: ch.color, fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{ch.icon}</span>
                  {ch.label}
                </span>
              ))}
            </div>
          </div>

          <div style={{ background: '#f5f2fe', padding: 24, borderRadius: 28, border: '1px solid rgba(198,196,215,0.35)' }}>
            <div style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', maxWidth: 360, margin: '0 auto', boxShadow: '0 12px 40px rgba(0,0,0,0.1)' }}>
              <div style={{ background: '#4648d4', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Campaign Preview</span>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#fff', cursor: 'pointer' }}>close</span>
              </div>
              <div style={{ padding: 24 }}>
                <div style={{ width: '100%', height: 180, background: '#f0eeff', borderRadius: 14, marginBottom: 20, overflow: 'hidden', position: 'relative' }}>
                  <img src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=400" alt="Campaign visual" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', bottom: 12, left: 12, right: 12, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)', borderRadius: 10, padding: '8px 12px' }}>
                    <p style={{ fontSize: 11, fontWeight: 800, color: '#4648d4', margin: 0 }}>Exclusive for you, Rajesh</p>
                  </div>
                </div>
                <h5 style={{ fontSize: 17, fontWeight: 800, margin: '0 0 10px' }}>We noticed you left something...</h5>
                <p style={{ fontSize: 13, color: '#6b6a80', lineHeight: 1.55, margin: '0 0 20px' }}>Hi Rajesh, your favorite sneakers are still waiting. Use code <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#4648d4' }}>GROW24</span> for 10% off today.</p>
                <button onClick={() => navigate('/signin')} style={{ width: '100%', padding: '14px', background: '#4648d4', border: 'none', color: '#fff', borderRadius: 14, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                  Complete Purchase
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── EXECUTION ENGINE ── */}
      <section style={{ padding: '80px 0', background: '#1b1b23', color: '#fff', overflow: 'hidden', position: 'relative' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 40px', position: 'relative', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <h2 style={{ fontSize: 36, fontWeight: 800, margin: '0 0 16px', color: '#fff', letterSpacing: '-0.8px' }}>Distributed Execution Engine</h2>
            <p style={{ fontSize: 16, color: '#9998ae', maxWidth: 520, margin: '0 auto' }}>High-scale infrastructure designed for enterprise delivery. Zero latency, 100% reliability.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 32, position: 'relative' }}>
            <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'linear-gradient(to right, transparent, rgba(70,72,212,0.5), transparent)', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            {[
              { icon: 'api', label: 'CRM API', sub: 'Ingress' },
              { icon: 'hub', label: 'Gateway', sub: 'Router' },
              { icon: 'terminal', label: 'Webhook', sub: 'Executor' },
              { icon: 'bar_chart', label: 'Analytics', sub: 'Feedback', highlight: true },
            ].map(node => (
              <div key={node.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, position: 'relative' }}>
                <div style={{ width: 80, height: 80, borderRadius: 20, background: node.highlight ? 'rgba(70,72,212,0.2)' : 'rgba(255,255,255,0.07)', border: `1px solid ${node.highlight ? 'rgba(70,72,212,0.4)' : 'rgba(255,255,255,0.12)'}`, backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 32 }}>{node.icon}</span>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>{node.label}</p>
                  <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#c0c1ff', fontFamily: 'JetBrains Mono, monospace' }}>{node.sub}</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 56, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12 }}>
            {['Batch Processing', 'Async Workers', 'Exponential Retry', 'Dead Letter Queues', 'TLS 1.3 Encryption'].map(tag => (
              <span key={tag} style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 100, fontSize: 12, color: '#fff', fontFamily: 'JetBrains Mono, monospace' }}>{tag}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── LIVE ANALYTICS ── */}
      <section style={{ padding: '80px 0' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 40px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
          <div>
            <div style={{ padding: 32, background: '#f5f2fe', borderRadius: 28, border: '1px solid rgba(198,196,215,0.35)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
                <h4 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Live Campaign Performance</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, background: '#10b981', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
                  <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}>Live</span>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
                {[{ label: 'Conversion Rate', value: '12.8%', delta: '↑ 2.4%' }, { label: 'Recovery Revenue', value: '₹1.4L', delta: '↑ 18.2%' }].map(m => (
                  <div key={m.label} style={{ padding: 20, background: '#fff', borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid rgba(198,196,215,0.3)' }}>
                    <p style={{ fontSize: 12, color: '#6b6a80', margin: '0 0 6px' }}>{m.label}</p>
                    <p style={{ fontSize: 22, fontWeight: 900, margin: '0 0 4px', color: '#1b1b23' }}>{m.value}</p>
                    <p style={{ fontSize: 11, color: '#059669', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, margin: 0 }}>{m.delta}</p>
                  </div>
                ))}
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9998ae', margin: '0 0 16px' }}>Execution Timeline</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingLeft: 24, borderLeft: '1px solid rgba(198,196,215,0.4)' }}>
                  {[
                    { time: '12:04:01', label: 'Campaign Created', color: '#4648d4' },
                    { time: '12:04:05', label: 'AI Payload Generated', color: '#4648d4' },
                    { time: '12:04:12', label: 'WhatsApp Delivery Successful', color: '#4b41e1' },
                  ].map(ev => (
                    <div key={ev.time} style={{ display: 'flex', alignItems: 'center', gap: 16, position: 'relative' }}>
                      <div style={{ position: 'absolute', left: -28, width: 8, height: 8, borderRadius: '50%', background: ev.color, boxShadow: `0 0 0 4px ${ev.color}20` }} />
                      <span style={{ fontSize: 11, color: '#9998ae', fontFamily: 'JetBrains Mono, monospace' }}>{ev.time}</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#1b1b23' }}>{ev.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div>
            <h2 style={{ fontSize: 36, fontWeight: 800, margin: '0 0 20px', letterSpacing: '-0.8px' }}>Measure Every Cent of Impact</h2>
            <p style={{ fontSize: 16, color: '#6b6a80', lineHeight: 1.65, margin: '0 0 36px' }}>
              No more "estimated reach." Synapse provides granular attribution for every recovered dollar. See exactly which hybrid engine strategy worked and why.
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 24 }}>
              {[
                { icon: 'track_changes', title: 'Real-time Attribution', desc: 'Track conversions from delivery to checkout in milliseconds.' },
                { icon: 'psychology', title: 'Strategy Insights', desc: 'Understand which personalization triggers are driving the most lift.' },
              ].map(item => (
                <li key={item.title} style={{ display: 'flex', gap: 16 }}>
                  <span style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(70,72,212,0.08)', color: '#4648d4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 22 }}>{item.icon}</span>
                  </span>
                  <div>
                    <h6 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px' }}>{item.title}</h6>
                    <p style={{ fontSize: 14, color: '#6b6a80', margin: 0 }}>{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── PERPETUAL GROWTH ENGINE ── */}
      <section id="benefits" style={{ padding: '80px 0', background: '#f8f7ff', overflow: 'hidden' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 40px', textAlign: 'center' }}>
          <h2 style={{ fontSize: 36, fontWeight: 800, margin: '0 0 64px', letterSpacing: '-0.8px' }}>The Perpetual Growth Engine</h2>
          <div style={{ position: 'relative', width: 440, height: 440, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'absolute', inset: 0, border: '2px dashed rgba(70,72,212,0.2)', borderRadius: '50%' }} />
            {[
              { icon: 'currency_exchange', label: 'Converts', angle: 0 },
              { icon: 'trending_up', label: 'Revenue', angle: 60 },
              { icon: 'person_search', label: 'Persona', angle: 120 },
              { icon: 'warning', label: 'Risk', angle: 180 },
              { icon: 'groups', label: 'Segment', angle: 240 },
              { icon: 'explore', label: 'Opportunities', angle: 300 },
            ].map(node => {
              const rad = (node.angle - 90) * (Math.PI / 180);
              const r = 200;
              const x = 50 + (r / 4.4) * Math.cos(rad);
              const y = 50 + (r / 4.4) * Math.sin(rad);
              return (
                <div key={node.label} style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#fff', border: '1px solid rgba(70,72,212,0.2)', boxShadow: '0 4px 16px rgba(70,72,212,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4648d4' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 22 }}>{node.icon}</span>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, background: '#fff', padding: '2px 8px', borderRadius: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', color: '#1b1b23' }}>{node.label}</span>
                </div>
              );
            })}
            <div style={{ width: 144, height: 144, background: '#4648d4', borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 12px 48px rgba(70,72,212,0.35)', position: 'relative', zIndex: 1 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 36, marginBottom: 6 }}>all_inclusive</span>
              <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Synapse Core</span>
            </div>
          </div>
          <p style={{ marginTop: 48, fontSize: 15, color: '#6b6a80', maxWidth: 480, margin: '48px auto 0', lineHeight: 1.65 }}>
            Every action leads to learning. Synapse continuously tunes its customer scores based on conversion feedback, getting smarter every second.
          </p>
        </div>
      </section>

      {/* ── BENEFITS GRID ── */}
      <section style={{ padding: '80px 0', background: '#fff', borderTop: '1px solid rgba(198,196,215,0.3)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 40px' }}>
          <h2 style={{ fontSize: 36, fontWeight: 800, textAlign: 'center', margin: '0 0 56px', letterSpacing: '-0.8px' }}>Built for Scale, Designed for Impact</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
            {[
              { title: '99.99% Uptime', desc: 'Global infrastructure ensuring your revenue recovery never stops.' },
              { title: 'SOC2 Type II', desc: 'Enterprise-grade security and data privacy out of the box.' },
              { title: '1-Click Integration', desc: 'Connect to Segment, Shopify, or Custom CRM in minutes.' },
              { title: 'Auto-Scaling', desc: 'Handle million-user peaks without latency drops.' },
              { title: 'Dark Mode SDK', desc: 'Developer-friendly tooling for deep product embeddings.' },
              { title: 'Multivariate Testing', desc: 'Automatic A/B testing of messaging and templates.' },
              { title: 'Global Localization', desc: 'Support for 50+ languages and regional delivery nuances.' },
              { title: 'Priority Support', desc: '24/7 dedicated technical assistance for enterprise partners.' },
            ].map(b => (
              <div key={b.title} style={{ padding: 24, background: '#f8f7ff', borderRadius: 18, border: '1px solid rgba(198,196,215,0.35)', transition: 'border-color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(70,72,212,0.3)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(198,196,215,0.35)')}>
                <h6 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 8px', color: '#1b1b23' }}>{b.title}</h6>
                <p style={{ fontSize: 13, color: '#6b6a80', margin: 0, lineHeight: 1.5 }}>{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section style={{ position: 'relative', padding: '96px 0', background: '#4648d4', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.1 }}>
          <canvas ref={canvasRef2} style={{ display: 'block', width: '100%', height: '100%' }} />
        </div>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 40px', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <h2 style={{ fontSize: 44, fontWeight: 900, color: '#fff', margin: '0 0 20px', letterSpacing: '-1px' }}>Autonomous Customer Growth Starts Here</h2>
          <p style={{ fontSize: 18, color: 'rgba(224,221,255,0.9)', maxWidth: 520, margin: '0 auto 40px', lineHeight: 1.6 }}>
            Join forward-thinking consumer brands who have recovered over ₹24Cr in revenue with Synapse.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/signin')} style={{ padding: '18px 40px', background: '#fff', border: 'none', color: '#4648d4', borderRadius: 18, fontSize: 17, fontWeight: 800, cursor: 'pointer', boxShadow: '0 8px 32px rgba(0,0,0,0.2)', transition: 'transform 0.2s' }}>
              Get Started Now
            </button>
            <button onClick={() => navigate('/signin')} style={{ padding: '18px 40px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff', borderRadius: 18, fontSize: 17, fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s' }}>
              Talk to Sales
            </button>
          </div>
          <p style={{ marginTop: 28, fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>No credit card required. Setup takes less than 15 minutes.</p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: '#f9f9fc', borderTop: '1px solid rgba(198,196,215,0.3)', padding: '40px 0' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 24 }}>
          <div style={{ fontWeight: 800, fontSize: 18, color: '#4648d4' }}>Synapse</div>
          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
            {['Privacy Policy', 'Terms of Service', 'Security', 'Status'].map(link => (
              <a key={link} href="#" style={{ fontSize: 13, color: '#6b6a80', textDecoration: 'none', transition: 'color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#4648d4')}
                onMouseLeave={e => (e.currentTarget.style.color = '#6b6a80')}>
                {link}
              </a>
            ))}
          </div>
          <div style={{ fontSize: 13, color: '#9998ae' }}>© 2024 Synapse AI. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}