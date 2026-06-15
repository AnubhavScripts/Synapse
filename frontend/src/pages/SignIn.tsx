import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

// Same WebGL shader as the landing page
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

export default function SignIn() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const DEMO_EMAIL = 'admin@synapse.ai';
  const DEMO_PASSWORD = 'password';

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
    const vs_ = cs(gl.VERTEX_SHADER, vs);
    const fs_ = cs(gl.FRAGMENT_SHADER, fs);
    if (!vs_ || !fs_) return null;
    gl.attachShader(prog, vs_);
    gl.attachShader(prog, fs_);
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
    let animId: number;
    const syncSize = () => {
      const w = canvas.clientWidth || 1280;
      const h = canvas.clientHeight || 720;
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    };
    syncSize();
    const render = (t: number) => {
      syncSize();
      gl.viewport(0, 0, canvas.width, canvas.height);
      if (uTime) gl.uniform1f(uTime, t * 0.001);
      if (uRes) gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      animId = requestAnimationFrame(render);
    };
    render(0);
    return () => cancelAnimationFrame(animId);
  };

  useEffect(() => {
    document.title = 'Synapse | Sign In';
    if (canvasRef.current) {
      const cleanup = setupShader(canvasRef.current);
      return cleanup ?? undefined;
    }
  }, []);

  const handleAutofill = () => {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (email === DEMO_EMAIL && password === DEMO_PASSWORD) {
        localStorage.setItem('isAuthenticated', 'true');
        navigate('/dashboard');
      } else {
        setError('Invalid credentials. Click "Autofill Demo Credentials" below.');
      }
    }, 800);
  };

  const inputBase: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    background: '#fff',
    border: '1px solid #c7c4d7',
    borderRadius: 12,
    padding: '13px 16px 13px 44px',
    color: '#1b1b23',
    fontSize: 14,
    outline: 'none',
    fontFamily: 'Inter, sans-serif',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fcf8ff', fontFamily: 'Inter, sans-serif', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

      {/* WebGL animated background — same as hero, full opacity */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.5, pointerEvents: 'none' }}>
        <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
      </div>

      {/* Same nav as landing page */}
      <nav style={{
        position: 'relative', zIndex: 20,
        background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(198,196,215,0.35)',
        height: 72, display: 'flex', alignItems: 'center',
        boxShadow: '0 1px 12px rgba(70,72,212,0.06)',
        flexShrink: 0,
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 40px', width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={() => navigate('/')}
            style={{ fontWeight: 800, fontSize: 20, color: '#4648d4', letterSpacing: '-0.5px', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'Inter, sans-serif' }}
          >
            Synapse
          </button>
          <button
            onClick={() => navigate('/')}
            style={{ background: 'none', border: 'none', color: '#464554', fontSize: 14, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'Inter, sans-serif' }}
          >
            ← Back to home
          </button>
        </div>
      </nav>

      {/* Centered content */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 16px', position: 'relative', zIndex: 10 }}>
        <div style={{ width: '100%', maxWidth: 440 }}>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '5px 14px',
              background: 'rgba(70,72,212,0.08)',
              border: '1px solid rgba(70,72,212,0.18)',
              borderRadius: 100, marginBottom: 20,
              color: '#4648d4', fontSize: 11, fontWeight: 700,
              letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>auto_awesome</span>
              Demo Sandbox
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 800, color: '#1b1b23', letterSpacing: '-0.8px', margin: '0 0 10px' }}>
              Welcome to <span style={{ color: '#4648d4' }}>Synapse</span>
            </h1>
            <p style={{ fontSize: 15, color: '#6b6a80', margin: 0, lineHeight: 1.5 }}>
              Sign in to access your autonomous customer growth dashboard
            </p>
          </div>

          {/* Card — matches landing page card style */}
          <div style={{
            background: 'rgba(255,255,255,0.75)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.7)',
            borderRadius: 24,
            padding: 36,
            boxShadow: '0 8px 40px rgba(70,72,212,0.1), 0 2px 8px rgba(0,0,0,0.04)',
          }}>

            {/* Error */}
            {error && (
              <div style={{
                background: 'rgba(186,26,26,0.06)', border: '1px solid rgba(186,26,26,0.2)',
                color: '#ba1a1a', padding: '12px 16px', borderRadius: 12,
                fontSize: 13, marginBottom: 20, display: 'flex', alignItems: 'flex-start', gap: 10, lineHeight: 1.4,
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 17, flexShrink: 0, marginTop: 1 }}>error</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Email */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: '#464554', marginBottom: 9 }}>
                  Work Email
                </label>
                <div style={{ position: 'relative' }}>
                  <span className="material-symbols-outlined" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 18, color: '#9998ae', pointerEvents: 'none' }}>mail</span>
                  <input
                    type="email" value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    required
                    style={inputBase}
                    onFocus={e => { e.target.style.borderColor = '#4648d4'; e.target.style.boxShadow = '0 0 0 3px rgba(70,72,212,0.1)'; }}
                    onBlur={e => { e.target.style.borderColor = '#c7c4d7'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 9 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: '#464554' }}>Password</label>
                  <span style={{ fontSize: 12, color: '#4648d4', cursor: 'pointer', fontWeight: 500 }}>Forgot password?</span>
                </div>
                <div style={{ position: 'relative' }}>
                  <span className="material-symbols-outlined" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 18, color: '#9998ae', pointerEvents: 'none' }}>lock</span>
                  <input
                    type="password" value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    style={inputBase}
                    onFocus={e => { e.target.style.borderColor = '#4648d4'; e.target.style.boxShadow = '0 0 0 3px rgba(70,72,212,0.1)'; }}
                    onBlur={e => { e.target.style.borderColor = '#c7c4d7'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
              </div>

              {/* Submit — same primary button style as landing */}
              <button
                type="submit" disabled={loading}
                style={{
                  width: '100%', padding: '15px',
                  background: loading ? 'rgba(70,72,212,0.6)' : '#4648d4',
                  border: 'none', borderRadius: 14,
                  color: '#fff', fontSize: 15, fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: '0 6px 24px rgba(70,72,212,0.28)',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                  fontFamily: 'Inter, sans-serif',
                  marginTop: 4,
                }}
                onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 10px 32px rgba(70,72,212,0.35)'; } }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(70,72,212,0.28)'; }}
              >
                {loading
                  ? <div style={{ width: 20, height: 20, border: '2.5px solid rgba(255,255,255,0.35)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.75s linear infinite' }} />
                  : <>
                      <span>Launch Workspace</span>
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
                    </>
                }
              </button>
            </form>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '24px 0' }}>
              <div style={{ flex: 1, height: 1, background: '#e9e6f3' }} />
              <span style={{ fontSize: 12, color: '#9998ae', whiteSpace: 'nowrap' }}>or use demo access</span>
              <div style={{ flex: 1, height: 1, background: '#e9e6f3' }} />
            </div>

            {/* Autofill demo — matches landing's "View Architecture" secondary button */}
            <button
              onClick={handleAutofill}
              style={{
                width: '100%', padding: '13px',
                background: '#fff',
                border: '1px solid #c7c4d7',
                borderRadius: 14, color: '#1b1b23',
                fontSize: 14, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'background 0.15s, border-color 0.15s',
                fontFamily: 'Inter, sans-serif',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f5f2fe'; e.currentTarget.style.borderColor = '#a5a3c7'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#c7c4d7'; }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 17, color: '#4648d4' }}>bolt</span>
              Autofill Demo Credentials
            </button>

            {/* Credential hint */}
            <div style={{ marginTop: 14, padding: '11px 16px', background: '#f5f2fe', borderRadius: 10, textAlign: 'center' }}>
              <span style={{ fontSize: 12, color: '#6b6a80', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.02em' }}>
                admin@synapse.ai&nbsp;&nbsp;·&nbsp;&nbsp;password
              </span>
            </div>
          </div>

          {/* Trust badges — mirrors the landing's social proof style */}
          <div style={{ marginTop: 28, display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap' }}>
            {[
              { icon: 'lock', label: 'SOC2 Secured' },
              { icon: 'verified_user', label: 'GDPR Compliant' },
              { icon: 'flash_on', label: '99.99% Uptime' },
            ].map(badge => (
              <div key={badge.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#6b6a80', fontWeight: 500 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#4648d4' }}>{badge.icon}</span>
                {badge.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: #b0aec0; }
      `}</style>
    </div>
  );
}