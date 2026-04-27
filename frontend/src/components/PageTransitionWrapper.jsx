const PageTransitionWrapper = ({ children }) => (
  <div className="page-enter" style={{ minHeight: '100%' }}>
    {children}
  </div>
);

export default PageTransitionWrapper;
