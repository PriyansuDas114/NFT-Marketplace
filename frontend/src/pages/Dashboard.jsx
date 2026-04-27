import { useState, useEffect, useRef, useCallback } from 'react';
import CountUp from 'react-countup';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, ArcElement, Tooltip, Filler
} from 'chart.js';
import useSocket from '../hooks/useSocket';
import './Dashboard.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Filler);

const ACCENT   = '#f97316';
const VIOLET   = '#8b5cf6';
const GREEN    = '#22c55e';
const GOLD     = '#eab308';
const SURFACE2 = '#17171e';

const defaultLineData = {
  labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  datasets: [{
    label: 'Volume (ETH)',
    data: [0.4, 1.2, 0.8, 2.1, 1.7, 3.4, 2.8],
    borderColor: ACCENT,
    backgroundColor: 'rgba(249,115,22,0.08)',
    pointBackgroundColor: ACCENT,
    pointBorderColor: '#0b0b0d',
    pointBorderWidth: 2,
    pointRadius: 4,
    pointHoverRadius: 6,
    borderWidth: 2.5,
    tension: 0.42,
    fill: true,
  }],
};

const defaultDoughnutData = {
  labels: ['Art', 'Gaming', 'Music', 'Domains'],
  datasets: [{
    data: [38, 27, 21, 14],
    backgroundColor: [ACCENT, VIOLET, GREEN, GOLD],
    borderColor: '#111116',
    borderWidth: 3,
    hoverOffset: 6,
  }],
};

const lineOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: {
    backgroundColor: '#17171e',
    borderColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    titleColor: '#9d9aa0',
    bodyColor: '#f0ede8',
    bodyFont: { family: "'DM Mono', monospace", size: 12 },
    padding: 12,
    displayColors: false,
  }},
  scales: {
    x: { grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false }, ticks: { color: '#5c5960', font: { size: 11 } } },
    y: { grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false }, ticks: { color: '#5c5960', font: { size: 11 }, callback: v => v + ' ETH' } },
  },
};

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '68%',
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#17171e',
      borderColor: 'rgba(255,255,255,0.08)',
      borderWidth: 1,
      titleColor: '#9d9aa0',
      bodyColor: '#f0ede8',
      bodyFont: { family: "'DM Mono', monospace", size: 12 },
      padding: 10,
    },
  },
};

const MetricIcon = ({ type }) => {
  const paths = {
    volume:  <><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></>,
    users:   <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>,
    minted:  <><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></>,
    listed:  <><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/></>,
  };
  return (
    <svg className="metric-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths[type]}
    </svg>
  );
};

const recentActivity = [
  { type: 'mint',   title: 'Cosmic Dreams #42',  sub: '0x1a2B...4f9C',  value: '' },
  { type: 'buy',    title: 'Pixel Samurai #7',   sub: '0xBead...c0fF',  value: '0.85 ETH' },
  { type: 'list',   title: 'Meta Domain .xyz',   sub: '0xDead...Beef',  value: '3.1 ETH' },
  { type: 'mint',   title: 'Galaxy Racer #12',   sub: '0xCafe...B00B',  value: '' },
  { type: 'cancel', title: 'Synthwave Beat #3',  sub: '0x7357...Ab1e',  value: '' },
];

const legendColors = [ACCENT, VIOLET, GREEN, GOLD];
const legendLabels = ['Art', 'Gaming', 'Music', 'Domains'];
const legendVals   = ['38%', '27%', '21%', '14%'];

const Dashboard = () => {
  const [metrics, setMetrics] = useState({ totalVolume: 0, activeUsers: 0, mintedNFTs: 0, listedNFTs: 0 });
  const [lineData, setLineData] = useState(defaultLineData);
  const [doughnutData, setDoughnutData] = useState(defaultDoughnutData);

  const handleMetricsUpdate = useCallback((data) => {
    if (data?.metrics) setMetrics(data.metrics);
    if (data?.lineChart)    setLineData(prev => ({ ...prev, ...data.lineChart }));
    if (data?.doughnutChart) setDoughnutData(prev => ({ ...prev, ...data.doughnutChart }));
  }, []);

  useSocket(handleMetricsUpdate);

  const metricCards = [
    { key: 'totalVolume', label: 'Total Volume', icon: 'volume', value: metrics.totalVolume, suffix: ' ETH', accent: ACCENT,  change: '+12.4%', up: true },
    { key: 'activeUsers', label: 'Active Users',  icon: 'users',  value: metrics.activeUsers, suffix: '',      accent: VIOLET, change: '+8.1%',  up: true },
    { key: 'mintedNFTs',  label: 'NFTs Minted',   icon: 'minted', value: metrics.mintedNFTs,  suffix: '',      accent: GREEN,  change: '+22.5%', up: true },
    { key: 'listedNFTs',  label: 'Listed NFTs',   icon: 'listed', value: metrics.listedNFTs,  suffix: '',      accent: GOLD,   change: '-3.2%',  up: false },
  ];

  return (
    <div className="dashboard">
      <div className="dash-header">
        <h1>Overview</h1>
        <p>Real-time marketplace performance</p>
      </div>

      {/* Metrics */}
      <div className="metrics-grid">
        {metricCards.map((card, i) => (
          <div
            key={card.key}
            className="metric-card"
            style={{ '--card-accent': card.accent, animationDelay: `${i * 0.07}s` }}
          >
            <div className="metric-card__label">
              <MetricIcon type={card.icon} />
              {card.label}
            </div>
            <div className="metric-card__value">
              <CountUp end={card.value} duration={1.6} separator="," suffix={card.suffix} decimals={card.suffix === ' ETH' ? 1 : 0} />
            </div>
            <div className={`metric-card__change ${card.up ? 'up' : 'down'}`}>
              {card.up ? '↑' : '↓'} {card.change} this week
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="charts-section">
        <div className="chart-card">
          <div className="chart-card__header">
            <span className="chart-card__title">Volume over Time</span>
            <span className="chart-card__period">7 days</span>
          </div>
          <div className="chart-wrap">
            <Line data={lineData} options={lineOptions} />
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-card__header">
            <span className="chart-card__title">Categories</span>
            <span className="chart-card__period">All time</span>
          </div>
          <div className="chart-wrap-pie">
            <Doughnut data={doughnutData} options={doughnutOptions} />
          </div>
          <div className="legend">
            {legendLabels.map((l, i) => (
              <div className="legend-item" key={l}>
                <span className="legend-dot" style={{ background: legendColors[i] }} />
                <span className="legend-label">{l}</span>
                <span className="legend-val">{legendVals[i]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activity */}
      <div className="activity-section">
        <div className="activity-card">
          <div className="activity-card__header">
            Recent Activity
            <button className="activity-card__see-all">see all →</button>
          </div>
          <div className="activity-list">
            {recentActivity.map((item, i) => (
              <div className="activity-item" key={i}>
                <span className={`activity-dot activity-dot--${item.type}`} />
                <div className="activity-item__info">
                  <div className="activity-item__title">{item.title}</div>
                  <div className="activity-item__sub">{item.sub} · {item.type}</div>
                </div>
                {item.value && <span className="activity-item__value">{item.value}</span>}
              </div>
            ))}
          </div>
        </div>

        <div className="activity-card">
          <div className="activity-card__header">Top Collections</div>
          <div className="activity-list">
            {[
              { name: 'Cosmic Dreams', floor: '0.42', vol: '12.4 ETH' },
              { name: 'Pixel Warriors', floor: '0.18', vol: '8.1 ETH' },
              { name: 'Sound Waves', floor: '0.65', vol: '6.3 ETH' },
              { name: 'Meta Domains', floor: '1.20', vol: '5.7 ETH' },
            ].map((col, i) => (
              <div className="activity-item" key={i}>
                <span className="activity-dot activity-dot--buy" />
                <div className="activity-item__info">
                  <div className="activity-item__title">{col.name}</div>
                  <div className="activity-item__sub">Floor: {col.floor} ETH</div>
                </div>
                <span className="activity-item__value">{col.vol}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
