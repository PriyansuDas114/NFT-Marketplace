import './Spinner.css';

export const SkeletonCard = () => (
  <div className="skeleton-card">
    <div className="skeleton skeleton-img" />
    <div className="skeleton-body">
      <div className="skeleton skeleton-line" />
      <div className="skeleton skeleton-line-sm" />
    </div>
  </div>
);

const Spinner = ({ text = 'Loading...' }) => (
  <div className="spinner-overlay">
    <div className="spinner" />
    {text && <span className="spinner-text">{text}</span>}
  </div>
);

export default Spinner;
