export function GlowBackground() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        background: '#050a0e',
      }}
    >
      {/* Top-left teal orb */}
      <div style={{
        position: 'absolute',
        top: '-18%',
        left: '-8%',
        width: '55vw',
        height: '55vw',
        maxWidth: '800px',
        maxHeight: '800px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(13,148,136,0.12) 0%, rgba(13,148,136,0.04) 40%, transparent 70%)',
        filter: 'blur(60px)',
      }} />

      {/* Center-right blue orb */}
      <div style={{
        position: 'absolute',
        top: '30%',
        right: '-12%',
        width: '50vw',
        height: '50vw',
        maxWidth: '700px',
        maxHeight: '700px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(56,100,220,0.09) 0%, rgba(56,100,220,0.03) 40%, transparent 70%)',
        filter: 'blur(70px)',
      }} />

      {/* Bottom-left accent */}
      <div style={{
        position: 'absolute',
        bottom: '-10%',
        left: '15%',
        width: '40vw',
        height: '40vw',
        maxWidth: '600px',
        maxHeight: '600px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(13,148,136,0.08) 0%, transparent 60%)',
        filter: 'blur(80px)',
      }} />

      {/* Top-right subtle warm accent */}
      <div style={{
        position: 'absolute',
        top: '5%',
        right: '20%',
        width: '30vw',
        height: '30vw',
        maxWidth: '450px',
        maxHeight: '450px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 60%)',
        filter: 'blur(50px)',
      }} />

      {/* Noise texture overlay for depth */}
      <div style={{
        position: 'absolute',
        inset: 0,
        opacity: 0.03,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        backgroundSize: '128px 128px',
      }} />
    </div>
  );
}
