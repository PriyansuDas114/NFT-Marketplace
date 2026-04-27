import { Routes, Route, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import MintNFT from './pages/MintNFT';
import ListNFT from './pages/ListNFT';
import Explore from './pages/Explore';
import Gallery from './pages/Gallery';
import PageTransitionWrapper from './components/PageTransitionWrapper';
import './App.css';

const App = () => {
  const location = useLocation();
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Header />
        <div className="page-content-wrapper">
          <Routes location={location}>
            <Route path="/"        element={<PageTransitionWrapper><Dashboard /></PageTransitionWrapper>} />
            <Route path="/mint"    element={<PageTransitionWrapper><MintNFT /></PageTransitionWrapper>} />
            <Route path="/list"    element={<PageTransitionWrapper><ListNFT /></PageTransitionWrapper>} />
            <Route path="/explore" element={<PageTransitionWrapper><Explore /></PageTransitionWrapper>} />
            <Route path="/gallery" element={<PageTransitionWrapper><Gallery /></PageTransitionWrapper>} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default App;
