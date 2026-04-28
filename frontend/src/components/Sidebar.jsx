import { NavLink } from 'react-router-dom';
import { useState } from 'react';
import './Sidebar.css';

const icons = {
  dashboard: (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="2" width="6" height="6" rx="1.5"/><rect x="10" y="2" width="6" height="6" rx="1.5"/>
      <rect x="2" y="10" width="6" height="6" rx="1.5"/><rect x="10" y="10" width="6" height="6" rx="1.5"/>
    </svg>
  ),
  explore: (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="5"/><path d="M13 13L16 16" strokeLinecap="round"/>
    </svg>
  ),
  gallery: (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="2" width="14" height="10" rx="2"/><path d="M6 16h6M9 12v4" strokeLinecap="round"/>
    </svg>
  ),
  mint: (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="9" cy="9" r="7"/><path d="M9 6v6M6 9h6" strokeLinecap="round"/>
    </svg>
  ),
  list: (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 5h14M2 9h10M2 13h6" strokeLinecap="round"/>
      <circle cx="14" cy="13" r="3"/>
      <path d="M14 11.5v1.5l1 1" strokeLinecap="round"/>
    </svg>
  ),
  chevron: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18l6-6-6-6"/>
    </svg>
  ),
};

const navSections = [
  {
    label: 'Marketplace',
    items: [
      { to: '/', label: 'Dashboard', icon: 'dashboard' },
      { to: '/explore', label: 'Explore', icon: 'explore' },
      { to: '/gallery', label: 'Gallery', icon: 'gallery' },
    ]
  },
  {
    label: 'My Tokens',
    items: [
      { to: '/mint', label: 'Mint NFT', icon: 'mint' },
      { to: '/list', label: 'List NFT', icon: 'list' },
    ]
  }
];

const Sidebar = () => {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <div className={`sidebar-overlay ${expanded ? 'visible' : ''}`}
           onClick={() => setExpanded(false)} />
      <div 
        className="sidebar-wrapper"
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
      >
        <aside className={`sidebar ${expanded ? 'expanded' : ''}`}>
          {/* Logo */}
          <NavLink to="/" className="sidebar-logo">
            <div className="sidebar-logo-icon">
              <svg viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 2L15 5.5V12.5L9 16L3 12.5V5.5L9 2Z" fill="white" fillOpacity="0.9"/>
                <path d="M9 6L12 7.75V11.25L9 13L6 11.25V7.75L9 6Z" fill="#ff4d00"/>
              </svg>
            </div>
            <span className="sidebar-logo-text">NEXMINT</span>
          </NavLink>

          {/* Nav */}
          <nav className="sidebar-nav">
            {navSections.map((section, idx) => (
              <div key={idx}>
                <span className="nav-section-label">{section.label}</span>
                {section.items.map(({ to, label, icon }) => (
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
              </div>
            ))}
          </nav>
        </aside>
      </div>
    </>
  );
};

export default Sidebar;
