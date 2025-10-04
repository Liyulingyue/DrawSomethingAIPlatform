import './AppFooter.css'

interface AppFooterProps {
  className?: string
}

function AppFooter({ className = '' }: AppFooterProps) {
  const currentYear = new Date().getFullYear()

  return (
    <footer className={`app-footer ${className}`.trim()}>
      <div className="app-footer-content">
        <p className="app-footer-text">
          © {currentYear} DrawSomething AI Platform. All rights reserved.
        </p>
        <p className="app-footer-subtext">
          Powered by AI Technology
        </p>
      </div>
    </footer>
  )
}

export default AppFooter
