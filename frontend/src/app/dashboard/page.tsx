import Link from "next/link";

interface DashboardStats {
  connected: boolean;
  record_count: number;
  error_msg: string;
}

async function getDashboardData(): Promise<DashboardStats> {
  const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  try {
    const res = await fetch(`${API}/api/dashboard/stats`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch (e: any) {
    return { connected: false, record_count: 0, error_msg: e?.message || String(e) };
  }
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="container" style={{ paddingTop: '100px', paddingBottom: '60px' }}>
      {/* Header */}
      <section className="fade-in-up" style={{ marginBottom: '3rem' }}>
        <h1 className="hero-title" style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)' }}>
          <span className="text-gradient">Dashboard</span>
        </h1>
        <p className="hero-subtitle" style={{ textAlign: 'left', marginBottom: '0' }}>
          Unified view of your sensor data and database readings.
        </p>
      </section>

      {/* Database Connection Status */}
      <section className="fade-in-up delay-100" style={{ marginBottom: '2rem' }}>
        <div className="glass-panel" style={{
          padding: '2rem',
          borderRadius: '20px',
          borderLeft: `6px solid ${data.connected ? '#16a34a' : '#dc2626'}`,
        }}>
          <div className="flex items-center gap-4" style={{ flexWrap: 'wrap' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              background: data.connected ? 'rgba(22,163,74,0.12)' : 'rgba(220,38,38,0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              flexShrink: 0,
            }}>
              {data.connected ? '✅' : '❌'}
            </div>
            <div>
              <h3 style={{ fontWeight: 700, fontSize: '1.15rem', marginBottom: '0.25rem' }}>
                MySQL Database {data.connected ? 'Connected' : 'Not Connected'}
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0, wordBreak: 'break-all' }}>
                {data.connected
                  ? `Successfully connected via FastAPI + SQLAlchemy · ${data.record_count} sensor data record(s)`
                  : `Unable to reach MySQL database. Error: ${data.error_msg}`}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Cards */}
      <section className="fade-in-up delay-200" style={{ marginBottom: '2rem' }}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <DashboardCard
            icon="🗄️"
            title="Database Records"
            value={data.connected ? `${data.record_count}` : '—'}
            subtitle="Sensor data in MySQL"
            color="#6366f1"
          />
          <DashboardCard
            icon="📡"
            title="Data Source"
            value="Open-Meteo"
            subtitle="Global Weather API"
            color="#06b6d4"
          />
          <DashboardCard
            icon="🔄"
            title="Status"
            value={data.connected ? 'Online' : 'Offline'}
            subtitle={data.connected ? 'All systems operational' : 'Database unreachable'}
            color={data.connected ? '#16a34a' : '#dc2626'}
          />
        </div>
      </section>

      {/* Placeholder Panels */}
      <section className="fade-in-up delay-300" style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '1rem' }}>Data Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px', minHeight: '240px' }}>
            <h3 style={{ fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.25rem' }}>📊</span> Sensor Data Feed
            </h3>
            <div style={{
              height: '160px',
              background: 'var(--surface)',
              borderRadius: '12px',
              border: '2px dashed var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)',
              fontSize: '0.95rem',
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📈</div>
                Connect sensors to populate this chart
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px', minHeight: '240px' }}>
            <h3 style={{ fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.25rem' }}>🗂️</span> Database Records
            </h3>
            {data.connected ? (
              <div style={{
                height: '160px',
                background: 'var(--surface)',
                borderRadius: '12px',
                border: '2px dashed var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)',
                fontSize: '0.95rem',
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🗄️</div>
                  {data.record_count > 0
                    ? `${data.record_count} record(s) found in database`
                    : 'Database empty — add records via phpMyAdmin'}
                </div>
              </div>
            ) : (
              <div style={{
                height: '160px',
                background: 'rgba(220,38,38,0.05)',
                borderRadius: '12px',
                border: '2px dashed rgba(220,38,38,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)',
                fontSize: '0.95rem',
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚠️</div>
                  Start MySQL &amp; update backend/.env to view records
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="fade-in-up delay-300" style={{ textAlign: 'center', marginTop: '2rem' }}>
        <Link href="/features" className="btn btn-secondary" id="btn-back-features">
          ← Air Quality Analytics
        </Link>
      </section>
    </div>
  );
}

function DashboardCard({
  icon,
  title,
  value,
  subtitle,
  color,
}: {
  icon: string;
  title: string;
  value: string;
  subtitle: string;
  color: string;
}) {
  return (
    <div className="feature-card glass-panel" style={{ textAlign: 'center' }}>
      <div style={{
        width: '60px',
        height: '60px',
        borderRadius: '16px',
        background: `${color}18`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.5rem',
        margin: '0 auto 1rem',
        border: `1px solid ${color}30`,
      }}>
        {icon}
      </div>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>{title}</p>
      <p style={{ fontSize: '2rem', fontWeight: 800, color, lineHeight: 1.2, marginBottom: '0.25rem' }}>{value}</p>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{subtitle}</p>
    </div>
  );
}
