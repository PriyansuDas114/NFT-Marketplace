import { NavLink } from 'react-router-dom';
import { useState, useEffect } from 'react';
import './Sidebar.css';

const icons = {
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5"/>
      <rect x="14" y="3" width="7" height="7" rx="1.5"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5"/>
      <rect x="14" y="14" width="7" height="7" rx="1.5"/>
    </svg>
  ),
  mint: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z"/>
      <path d="M2 17l10 5 10-5"/>
      <path d="M2 12l10 5 10-5"/>
    </svg>
  ),
  list: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
      <rect x="9" y="3" width="6" height="4" rx="1"/>
      <line x1="9" y1="12" x2="15" y2="12"/>
      <line x1="9" y1="16" x2="13" y2="16"/>
    </svg>
  ),
  explore: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <path d="M21 21l-4.35-4.35"/>
    </svg>
  ),
  gallery: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <path d="M21 15l-5-5L5 21"/>
    </svg>
  ),
  chevron: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18l6-6-6-6"/>
    </svg>
  ),
};

const navItems = [
  { to: '/',        label: 'Dashboard', icon: 'dashboard' },
  { to: '/mint',    label: 'Mint NFT',  icon: 'mint' },
  { to: '/list',    label: 'List NFT',  icon: 'list' },
  { to: '/explore', label: 'Explore',   icon: 'explore' },
  { to: '/gallery', label: 'Gallery',   icon: 'gallery' },
];

const Sidebar = () => {
  const [expanded, setExpanded] = useState(() =>
    localStorage.getItem('sidebar-expanded') === 'true'
  );

  useEffect(() => {
    localStorage.setItem('sidebar-expanded', expanded);
  }, [expanded]);

  return (
    <>
      <div className={`sidebar-overlay ${expanded ? 'visible' : ''}`}
           onClick={() => setExpanded(false)} />
      <div className="sidebar-wrapper">
        <aside className={`sidebar ${expanded ? 'expanded' : ''}`}>
          {/* Logo */}
          <NavLink to="/" className="sidebar-logo">
            <div className="sidebar-logo-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </div>
            <span className="sidebar-logo-text">NexMint</span>
          </NavLink>

          {/* Nav */}
          <nav className="nav-links">
            {navItems.map(({ to, label, icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              >
                <span className="nav-link-icon">{icons[icon]}</span>
                <span className="nav-item">{label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Toggle */}
          <div className="sidebar-toggle">
            <button
              className="sidebar-toggle-btn"
              onClick={() => setExpanded(p => !p)}
              title={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              {icons.chevron}
            </button>
          </div>
        </aside>
      </div>
    </>
  );
};

export default Sidebar;
