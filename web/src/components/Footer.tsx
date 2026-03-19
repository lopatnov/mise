export default function Footer() {
  const linkStyle: React.CSSProperties = { color: '#2d6a4f', textDecoration: 'none' };
  return (
    <footer
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        textAlign: 'center',
        padding: '5px 16px',
        fontSize: 12,
        color: '#bbb',
        background: 'rgba(249,249,247,0.93)',
        backdropFilter: 'blur(4px)',
        borderTop: '1px solid #eee',
        zIndex: 10,
      }}
    >
      Built by{' '}
      <a href="https://github.com/lopatnov" target="_blank" rel="noopener noreferrer" style={linkStyle}>
        lopatnov
      </a>
      {' · '}
      <a href="https://github.com/lopatnov/mise" target="_blank" rel="noopener noreferrer" style={linkStyle}>
        GitHub
      </a>
      {' · '}
      <a href="https://www.linkedin.com/in/lopatnov" target="_blank" rel="noopener noreferrer" style={linkStyle}>
        LinkedIn
      </a>
    </footer>
  );
}
