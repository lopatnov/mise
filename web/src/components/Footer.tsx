export default function Footer() {
  return (
    <footer className="site-footer no-print">
      Built by{' '}
      <a href="https://github.com/lopatnov" target="_blank" rel="noopener noreferrer" className="site-footer__link">
        lopatnov
      </a>
      {' · '}
      <a href="https://github.com/lopatnov/mise" target="_blank" rel="noopener noreferrer" className="site-footer__link">
        GitHub
      </a>
      {' · '}
      <a
        href="https://www.linkedin.com/in/lopatnov"
        target="_blank"
        rel="noopener noreferrer"
        className="site-footer__link"
      >
        LinkedIn
      </a>
    </footer>
  );
}
