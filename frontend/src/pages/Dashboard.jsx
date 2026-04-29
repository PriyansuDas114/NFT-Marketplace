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
  { type: 'buy',    nft: 'Nebula #42',       price: '0.42 ETH', from: '0xBead...c0fF' },
  { type: 'mint',   nft: 'Solar Punk #91',   price: '—',        from: '0xF00d...D0gE' },
  { type: 'list',   nft: 'Beat Drop #8',     price: '0.88 ETH', from: '0xCafe...1337' },
  { type: 'buy',    nft: 'Glitch Ape #17',   price: '1.05 ETH', from: '0x1a2b...4f9C' },
  { type: 'list',   nft: 'meta.eth #3300',   price: '3.2 ETH',  from: '0xDead...Beef' },
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
            <div>
              <div className="activity-card__title">Top Collections</div>
              <div className="activity-card__subtitle">by 24h volume</div>
            </div>
            <button className="activity-card__see-all">SEE ALL</button>
          </div>
          <div className="collections-list">
            {[
              { rank: 1, name: 'Glitch Apes', icon: '🦍', items: '10,000', vol: '847 ETH', change: '+14.2%', up: true },
              { rank: 2, name: 'Nebula Protocol', icon: '🌌', items: '5,000', vol: '442 ETH', change: '+7.8%', up: true },
              { rank: 3, name: 'Chain Knights', icon: '⚔️', items: '8,888', vol: '231 ETH', change: '-3.1%', up: false },
              { rank: 4, name: 'Sound Waves', icon: '🎵', items: '2,100', vol: '188 ETH', change: '+22.4%', up: true },
              { rank: 5, name: 'Meta Domains', icon: '🌐', items: '9,999', vol: '104 ETH', change: '+1.5%', up: true },
            ].map((col) => (
              <div className="collection-card" key={col.rank}>
                <div className="collection-card__rank">#{col.rank}</div>
                <div className="collection-card__icon">{col.icon}</div>
                <div className="collection-card__info">
                  <div className="collection-card__name">{col.name}</div>
                  <div className="collection-card__items">{col.items} items</div>
                </div>
                <div className="collection-card__volume">{col.vol}</div>
                <div className={`collection-card__change ${col.up ? 'up' : 'down'}`}>
                  {col.change}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="activity-card">
          <div className="activity-card__header">
            <div>
              <div className="activity-card__title">Recent Activity</div>
              <div className="activity-card__subtitle">Live feed</div>
            </div>
            <span className="live-indicator">● LIVE</span>
          </div>
          <div className="activity-table">
            <div className="activity-table__header">
              <div className="activity-table__col activity-table__col--event">EVENT</div>
              <div className="activity-table__col activity-table__col--nft">NFT</div>
              <div className="activity-table__col activity-table__col--price">PRICE</div>
              <div className="activity-table__col activity-table__col--from">FROM</div>
            </div>
            <div className="activity-table__body">
              {recentActivity.map((item, i) => (
                <div className="activity-table__row" key={i}>
                  <div className="activity-table__col activity-table__col--event">
                    <span className={`activity-badge activity-badge--${item.type}`}>
                      {item.type.toUpperCase()}
                    </span>
                  </div>
                  <div className="activity-table__col activity-table__col--nft">
                    {item.nft}
                  </div>
                  <div className="activity-table__col activity-table__col--price">
                    {item.price}
                  </div>
                  <div className="activity-table__col activity-table__col--from">
                    {item.from}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
