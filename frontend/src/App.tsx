import React, { useState, useEffect, useMemo } from 'react';
import { 
  Hotel, 
  Search, 
  BarChart3, 
  Sliders, 
  Brain, 
  TrendingUp, 
  DollarSign, 
  Percent, 
  MapPin, 
  Sparkles, 
  AlertCircle,
  Database,
  RefreshCw
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  BarChart, 
  Bar, 
  AreaChart, 
  Area 
} from 'recharts';

const BACKEND_URL = 'http://localhost:8000';

interface HotelData {
  name: string;
  location: string;
  rating: number;
  original_price: number;
  price_discount: number;
  discount_percentage: number;
  tax_info: string;
  cluster_id?: number;
  cluster_name?: string;
  topsis_score?: number;
  topsis_rank?: number;
}

interface ClusterSummary {
  cluster_id: number;
  cluster_name: string;
  count: number;
  avg_price: number;
  avg_rating: number;
  avg_discount: number;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'topsis' | 'ml'>('dashboard');
  const [hotels, setHotels] = useState<HotelData[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search/Filter states in Dashboard
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [minRating, setMinRating] = useState(0);

  // TOPSIS Weights
  const [wPrice, setWPrice] = useState(0.4);
  const [wRating, setWRating] = useState(0.4);
  const [wDiscount, setWDiscount] = useState(0.2);
  const [topsisResults, setTopsisResults] = useState<HotelData[]>([]);
  const [topsisLoading, setTopsisLoading] = useState(false);

  // ML Clusters
  const [clusterData, setClusterData] = useState<HotelData[]>([]);
  const [clusterSummary, setClusterSummary] = useState<ClusterSummary[]>([]);
  const [clusterCount, setClusterCount] = useState(4);
  const [mlLoading, setMlLoading] = useState(false);

  // Price Predictor
  const [predLocation, setPredLocation] = useState('');
  const [predRating, setPredRating] = useState(8.5);
  const [predictedPrice, setPredictedPrice] = useState<number | null>(null);
  const [predicting, setPredicting] = useState(false);

  // Scraping states
  const [scrapingStatus, setScrapingStatus] = useState<'idle' | 'scraping' | 'success' | 'error'>('idle');
  const [scrapingMessage, setScrapingMessage] = useState('');
  const [numItemsToScrape, setNumItemsToScrape] = useState(15);

  const handleScrape = async () => {
    try {
      setScrapingStatus('scraping');
      setScrapingMessage('Crawling hotel directories...');
      
      const res = await fetch(`${BACKEND_URL}/api/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ num_items: numItemsToScrape })
      });
      
      if (!res.ok) throw new Error('Harvester returned an error.');
      const data = await res.json();
      
      setScrapingStatus('success');
      setScrapingMessage(data.message);
      
      // Reload hotel list
      const hotelsRes = await fetch(`${BACKEND_URL}/api/hotels`);
      if (hotelsRes.ok) {
        const hotelsData = await hotelsRes.json();
        setHotels(hotelsData);
      }
    } catch (err: any) {
      setScrapingStatus('error');
      setScrapingMessage(err.message || 'Scraper failed to run.');
    }
  };

  // Fetch initial data
  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        const [hotelsRes, locsRes] = await Promise.all([
          fetch(`${BACKEND_URL}/api/hotels`),
          fetch(`${BACKEND_URL}/api/locations`)
        ]);

        if (!hotelsRes.ok || !locsRes.ok) {
          throw new Error('Failed to load data from backend server.');
        }

        const hotelsData = await hotelsRes.json();
        const locationsData = await locsRes.json();

        setHotels(hotelsData);
        setLocations(locationsData);
        if (locationsData.length > 0) {
          setPredLocation(locationsData[0]);
        }
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Server error. Is the backend running?');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // Fetch TOPSIS rankings when weights change or tab opens
  const fetchTopsis = async () => {
    try {
      setTopsisLoading(true);
      const res = await fetch(`${BACKEND_URL}/api/topsis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weight_price: wPrice,
          weight_rating: wRating,
          weight_discount: wDiscount,
        })
      });
      if (!res.ok) throw new Error('Failed to calculate TOPSIS scores.');
      const data = await res.json();
      setTopsisResults(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setTopsisLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'topsis') {
      fetchTopsis();
    }
  }, [activeTab, wPrice, wRating, wDiscount]);

  // Fetch clusters when tab opens or cluster count changes
  const fetchClusters = async () => {
    try {
      setMlLoading(true);
      const res = await fetch(`${BACKEND_URL}/api/clusters?k=${clusterCount}`);
      if (!res.ok) throw new Error('Failed to fetch K-Means clusters.');
      const data = await res.json();
      setClusterData(data.hotels);
      setClusterSummary(data.summary);
    } catch (err: any) {
      console.error(err);
    } finally {
      setMlLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'ml') {
      fetchClusters();
    }
  }, [activeTab, clusterCount]);

  // Predict price
  const handlePredict = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setPredicting(true);
      const res = await fetch(`${BACKEND_URL}/api/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: predLocation,
          rating: predRating,
        })
      });
      if (!res.ok) throw new Error('Prediction request failed.');
      const data = await res.json();
      setPredictedPrice(data.predicted_price);
    } catch (err: any) {
      console.error(err);
    } finally {
      setPredicting(false);
    }
  };

  // Helper formats
  const formatRp = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Dashboard Stats Calculations
  const dashboardStats = useMemo(() => {
    if (hotels.length === 0) return { count: 0, avgPrice: 0, avgRating: 0, avgDiscount: 0 };
    const count = hotels.length;
    const avgPrice = hotels.reduce((sum, h) => sum + h.price_discount, 0) / count;
    const avgRating = hotels.reduce((sum, h) => sum + h.rating, 0) / count;
    const avgDiscount = hotels.reduce((sum, h) => sum + h.discount_percentage, 0) / count;
    return { count, avgPrice, avgRating, avgDiscount };
  }, [hotels]);

  // Filtered Hotels list for Dashboard Table
  const filteredHotels = useMemo(() => {
    return hotels.filter(h => {
      const matchSearch = h.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          h.location.toLowerCase().includes(searchTerm.toLowerCase());
      const matchLocation = selectedLocation === 'All' || h.location === selectedLocation;
      const matchRating = h.rating >= minRating;
      return matchSearch && matchLocation && matchRating;
    });
  }, [hotels, searchTerm, selectedLocation, minRating]);

  // Chart Data: Hotels by rating bins
  const ratingChartData = useMemo(() => {
    const bins = Array(11).fill(0).map((_, i) => ({ rating: i, count: 0 }));
    hotels.forEach(h => {
      const rounded = Math.round(h.rating);
      if (rounded >= 0 && rounded <= 10) {
        bins[rounded].count += 1;
      }
    });
    return bins.filter(b => b.count > 0);
  }, [hotels]);

  // Chart Data: Top 8 locations by avg price
  const locationChartData = useMemo(() => {
    const groups: { [key: string]: { sum: number; count: number } } = {};
    hotels.forEach(h => {
      if (!groups[h.location]) {
        groups[h.location] = { sum: 0, count: 0 };
      }
      groups[h.location].sum += h.price_discount;
      groups[h.location].count += 1;
    });
    
    return Object.entries(groups)
      .map(([name, stat]) => ({
        name: name.replace(', Bali', ''),
        avg_price: Math.round(stat.sum / stat.count),
        count: stat.count
      }))
      .sort((a, b) => b.avg_price - a.avg_price)
      .slice(0, 8);
  }, [hotels]);

  // Cluster colors mapping
  const getClusterColor = (cid: number) => {
    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    return colors[cid % colors.length] || '#94a3b8';
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', width: '100%', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: '#0b0f19' }}>
        <div className="loader-container">
          <div className="spinner"></div>
          <h2>Loading Bali Hotel Analytics Platform...</h2>
          <p>Fetching data from Google Spreadsheets & training initial models</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', width: '100%', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: '#0b0f19', padding: '20px' }}>
        <div className="card" style={{ maxWidth: '500px', textAlign: 'center' }}>
          <AlertCircle size={48} color="#ef4444" style={{ marginBottom: '16px' }} />
          <h2 style={{ color: '#ef4444', marginBottom: '8px' }}>Connection Failure</h2>
          <p style={{ color: '#94a3b8', marginBottom: '20px' }}>{error}</p>
          <p style={{ fontSize: '14px', color: '#64748b' }}>
            Please make sure your FastAPI backend server is running on <strong>http://localhost:8000</strong>.
          </p>
          <button className="button-primary" style={{ marginTop: '24px' }} onClick={() => window.location.reload()}>
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="logo-section">
          <div className="logo-icon">
            <Hotel size={22} />
          </div>
          <span className="logo-title">GASKEUN HOTEL ANALYSIS</span>
        </div>

        <nav className="nav-menu">
          <button 
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <BarChart3 size={18} />
            Overview Dashboard
          </button>

          <button 
            className={`nav-item ${activeTab === 'topsis' ? 'active' : ''}`}
            onClick={() => setActiveTab('topsis')}
          >
            <Sliders size={18} />
            TOPSIS Decision Solver
          </button>

          <button 
            className={`nav-item ${activeTab === 'ml' ? 'active' : ''}`}
            onClick={() => setActiveTab('ml')}
          >
            <Brain size={18} />
            ML Segmentation
          </button>
        </nav>

        <div className="sidebar-footer">
          <p>Gaskeun Team &copy; 2026</p>
          <p style={{ fontSize: '10px', marginTop: '4px' }}>Decision Support System v2.0</p>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="main-content">
        
        {/* TAB 1: OVERVIEW DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div>
            <div className="page-header">
              <h1 className="page-title">Bali Hotel Analytics Dashboard</h1>
              <p className="page-subtitle">Real-time data visualization of hotel properties, pricing, and ratings across Bali</p>
            </div>

            {/* Scraper Panel */}
            <div className="card" style={{ marginBottom: '24px', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', borderLeft: '4px solid var(--color-primary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Database size={20} />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <h4 style={{ fontSize: '15px', fontWeight: 'bold' }}>Dynamic Web Data Harvester</h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Scrape & merge new listings from travel registries to expand the dataset.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                {scrapingStatus === 'scraping' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
                    <span>{scrapingMessage}</span>
                  </div>
                )}
                {scrapingStatus === 'success' && (
                  <span style={{ fontSize: '13px', color: 'var(--color-success)', fontWeight: 500 }}>
                    ✓ {scrapingMessage}
                  </span>
                )}
                {scrapingStatus === 'error' && (
                  <span style={{ fontSize: '13px', color: 'var(--color-danger)', fontWeight: 500 }}>
                    ⚠ {scrapingMessage}
                  </span>
                )}

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <select 
                    className="select-input" 
                    style={{ width: '130px', padding: '8px 12px', fontSize: '13px' }}
                    value={numItemsToScrape}
                    onChange={(e) => setNumItemsToScrape(Number(e.target.value))}
                    disabled={scrapingStatus === 'scraping'}
                  >
                    <option value="15">15 Hotels</option>
                    <option value="30">30 Hotels</option>
                    <option value="50">50 Hotels</option>
                  </select>

                  <button 
                    className="button-primary" 
                    style={{ padding: '8px 16px', fontSize: '13px', width: 'auto' }}
                    onClick={handleScrape}
                    disabled={scrapingStatus === 'scraping'}
                  >
                    <RefreshCw size={14} />
                    Harvest Data
                  </button>
                </div>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-icon-wrapper" style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
                  <Hotel size={24} />
                </div>
                <div className="metric-details">
                  <span className="metric-label">Total Properties</span>
                  <span className="metric-value">{dashboardStats.count}</span>
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-icon-wrapper" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                  <DollarSign size={24} />
                </div>
                <div className="metric-details">
                  <span className="metric-label">Average Price</span>
                  <span className="metric-value">{formatRp(dashboardStats.avgPrice)}</span>
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-icon-wrapper" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
                  <TrendingUp size={24} />
                </div>
                <div className="metric-details">
                  <span className="metric-label">Average Rating</span>
                  <span className="metric-value">{dashboardStats.avgRating.toFixed(1)} / 10</span>
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-icon-wrapper" style={{ backgroundColor: 'rgba(14, 165, 233, 0.1)', color: '#0ea5e9' }}>
                  <Percent size={24} />
                </div>
                <div className="metric-details">
                  <span className="metric-label">Average Discount</span>
                  <span className="metric-value">{dashboardStats.avgDiscount.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {/* Visual Charts Grid */}
            <div className="grid-2">
              <div className="card">
                <h3 className="card-title">Average Discount Price by Location (Top 8)</h3>
                <div style={{ width: '100%', height: '260px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={locationChartData} layout="vertical" margin={{ left: 10, right: 10 }}>
                      <XAxis type="number" stroke="#94a3b8" tickFormatter={(v) => `${(v/1e6).toFixed(1)}M`} />
                      <YAxis dataKey="name" type="category" stroke="#94a3b8" width={90} style={{ fontSize: '12px' }} />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="chart-tooltip">
                                <p className="label">{payload[0].payload.name}</p>
                                <p style={{ color: '#6366f1' }}>Avg Price: {formatRp(payload[0].value as number)}</p>
                                <p style={{ color: '#94a3b8' }}>Sample Size: {payload[0].payload.count} hotels</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="avg_price" fill="#6366f1" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="card">
                <h3 className="card-title">Rating Distribution Bins</h3>
                <div style={{ width: '100%', height: '260px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={ratingChartData} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
                      <XAxis dataKey="rating" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="chart-tooltip">
                                <p className="label">Rating: {payload[0].payload.rating}.0</p>
                                <p style={{ color: '#10b981' }}>Properties: {payload[0].value}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area type="monotone" dataKey="count" stroke="#10b981" fill="rgba(16, 185, 129, 0.1)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Interactive Search & Explore Table */}
            <div className="card" style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
                <h3 className="card-title" style={{ margin: 0 }}>Explore & Filter Properties</h3>
                
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', flexGrow: 1, justifyContent: 'flex-end' }}>
                  {/* Search box */}
                  <div style={{ position: 'relative', width: '220px' }}>
                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                    <input 
                      type="text" 
                      placeholder="Search name..." 
                      className="text-input" 
                      style={{ paddingLeft: '36px' }}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  {/* Location selector */}
                  <select 
                    className="select-input" 
                    style={{ width: '180px' }}
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                  >
                    <option value="All">All Locations</option>
                    {locations.map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>

                  {/* Min rating slider */}
                  <div style={{ width: '160px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8' }}>
                      <span>Min Rating:</span>
                      <span style={{ fontWeight: 'bold' }}>{minRating}</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="10" 
                      step="1"
                      value={minRating}
                      className="slider-input"
                      onChange={(e) => setMinRating(Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>

              <div className="table-container" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Hotel Name</th>
                      <th>Location</th>
                      <th>Rating</th>
                      <th>Discount Price</th>
                      <th>Original Price</th>
                      <th>Discount %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHotels.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', color: '#64748b', padding: '32px' }}>
                          No properties match your filters. Try adjusting them above!
                        </td>
                      </tr>
                    ) : (
                      filteredHotels.map((hotel, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 600 }}>{hotel.name}</td>
                          <td>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#94a3b8' }}>
                              <MapPin size={13} />
                              {hotel.location.replace(', Bali', '')}
                            </span>
                          </td>
                          <td>
                            <span className="badge badge-warning">★ {hotel.rating.toFixed(1)}</span>
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                            {formatRp(hotel.price_discount)}
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)', color: '#64748b', textDecoration: 'line-through' }}>
                            {formatRp(hotel.original_price)}
                          </td>
                          <td>
                            {hotel.discount_percentage > 0 ? (
                              <span className="badge badge-success">-{hotel.discount_percentage.toFixed(0)}%</span>
                            ) : (
                              <span className="badge badge-info">Regular</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TOPSIS DECISION SOLVER */}
        {activeTab === 'topsis' && (
          <div>
            <div className="page-header">
              <h1 className="page-title">TOPSIS Decision Support Solver</h1>
              <p className="page-subtitle">Rank hotels mathematically based on the weights of your custom criteria</p>
            </div>

            <div className="grid-3" style={{ marginBottom: '32px' }}>
              <div className="card" style={{ gridColumn: 'span 1' }}>
                <h3 className="card-title">
                  <Sliders size={20} color="#6366f1" />
                  Criteria Weight Panel
                </h3>
                <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '24px' }}>
                  Adjust weights below. The solver will normalize your weights and rank properties based on similarity to the ideal hotel.
                </p>

                <div className="form-group">
                  <div className="form-label">
                    <span>Price Importance (Cost)</span>
                    <span className="value">{Math.round(wPrice * 100)}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.05" 
                    value={wPrice}
                    className="slider-input" 
                    onChange={(e) => setWPrice(Number(e.target.value))}
                  />
                  <p style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>We want to minimize the discounted price</p>
                </div>

                <div className="form-group">
                  <div className="form-label">
                    <span>Rating Importance (Benefit)</span>
                    <span className="value">{Math.round(wRating * 100)}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.05" 
                    value={wRating}
                    className="slider-input" 
                    onChange={(e) => setWRating(Number(e.target.value))}
                  />
                  <p style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>We want to maximize user ratings</p>
                </div>

                <div className="form-group">
                  <div className="form-label">
                    <span>Discount Size (Benefit)</span>
                    <span className="value">{Math.round(wDiscount * 100)}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.05" 
                    value={wDiscount}
                    className="slider-input" 
                    onChange={(e) => setWDiscount(Number(e.target.value))}
                  />
                  <p style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>We want to maximize the deal size</p>
                </div>

                <div style={{ backgroundColor: 'rgba(99, 102, 241, 0.05)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.15)', marginTop: '24px' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '4px', color: '#8f94fb' }}>TOPSIS Formula</h4>
                  <p style={{ fontSize: '11px', color: '#94a3b8' }}>
                    Calculates relative closeness to the positive ideal solution ($S_i^-$) over ($S_i^* + S_i^-$). Ideal price is the minimum available; ideal rating/discount are the maximums.
                  </p>
                </div>
              </div>

              {/* Rankings Table */}
              <div className="card" style={{ gridColumn: 'span 2' }}>
                <h3 className="card-title">
                  <Sparkles size={20} color="#10b981" />
                  TOPSIS Optimal Rankings (Top 50)
                </h3>

                {topsisLoading ? (
                  <div className="loader-container">
                    <div className="spinner"></div>
                    <p>Re-solving multi-criteria decision model...</p>
                  </div>
                ) : (
                  <div className="table-container" style={{ maxHeight: '520px', overflowY: 'auto' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Rank</th>
                          <th>Hotel Name</th>
                          <th>Location</th>
                          <th>Rating</th>
                          <th>Discount Price</th>
                          <th>TOPSIS Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topsisResults.slice(0, 50).map((hotel, idx) => (
                          <tr key={idx} style={idx === 0 ? { backgroundColor: 'rgba(16, 185, 129, 0.04)' } : {}}>
                            <td>
                              <span 
                                className="badge" 
                                style={{
                                  backgroundColor: idx === 0 ? '#10b981' : idx === 1 ? '#f59e0b' : idx === 2 ? '#3b82f6' : 'transparent',
                                  color: idx < 3 ? 'white' : 'var(--text-secondary)',
                                  width: '24px',
                                  height: '24px',
                                  justifyContent: 'center',
                                  padding: 0
                                }}
                              >
                                {hotel.topsis_rank}
                              </span>
                            </td>
                            <td style={{ fontWeight: 600 }}>
                              {hotel.name}
                              {idx === 0 && <span style={{ marginLeft: '8px', fontSize: '10px', verticalAlign: 'middle' }} className="badge badge-success">OPTIMAL CHOICE</span>}
                            </td>
                            <td>{hotel.location.replace(', Bali', '')}</td>
                            <td>★ {hotel.rating.toFixed(1)}</td>
                            <td style={{ fontFamily: 'var(--font-mono)' }}>{formatRp(hotel.price_discount)}</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ width: '45px', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                                  {(hotel.topsis_score || 0).toFixed(4)}
                                </span>
                                <div style={{ width: '60px', height: '6px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                                  <div style={{ height: '100%', width: `${(hotel.topsis_score || 0) * 100}%`, backgroundColor: idx === 0 ? '#10b981' : '#6366f1' }}></div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: MACHINE LEARNING SEGMENTATION */}
        {activeTab === 'ml' && (
          <div>
            <div className="page-header">
              <h1 className="page-title">Machine Learning Insights</h1>
              <p className="page-subtitle">Explore K-Means segmentation profiles and forecast prices with Linear Regression</p>
            </div>

            {/* Clustering Section */}
            <div className="grid-3" style={{ marginBottom: '32px' }}>
              <div className="card" style={{ gridColumn: 'span 2' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 className="card-title" style={{ margin: 0 }}>
                    <Brain size={20} color="#6366f1" />
                    K-Means Cluster Space (Rating vs Price)
                  </h3>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', color: '#94a3b8' }}>Clusters (K):</span>
                    <select 
                      className="select-input" 
                      style={{ width: '70px', padding: '6px 12px' }}
                      value={clusterCount}
                      onChange={(e) => setClusterCount(Number(e.target.value))}
                    >
                      <option value="3">3</option>
                      <option value="4">4</option>
                      <option value="5">5</option>
                      <option value="6">6</option>
                    </select>
                  </div>
                </div>

                {mlLoading ? (
                  <div className="loader-container">
                    <div className="spinner"></div>
                    <p>Training K-Means clusters on features...</p>
                  </div>
                ) : (
                  <div>
                    <div style={{ width: '100%', height: '320px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 10, left: 10 }}>
                          <XAxis 
                            type="number" 
                            dataKey="rating" 
                            name="Rating" 
                            domain={[4, 10]} 
                            stroke="#94a3b8" 
                            label={{ value: 'User Rating', position: 'insideBottom', offset: -5, fill: '#94a3b8' }} 
                          />
                          <YAxis 
                            type="number" 
                            dataKey="price_discount" 
                            name="Price (Rp)" 
                            stroke="#94a3b8" 
                            tickFormatter={(v) => `${(v/1e6).toFixed(1)}M`}
                            label={{ value: 'Price after Discount', angle: -90, position: 'insideLeft', offset: -10, fill: '#94a3b8' }} 
                          />
                          <Tooltip 
                            cursor={{ strokeDasharray: '3 3' }} 
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className="chart-tooltip">
                                    <p className="label">{data.name}</p>
                                    <p style={{ color: '#94a3b8' }}>Location: {data.location}</p>
                                    <p style={{ color: '#f59e0b' }}>Rating: {data.rating.toFixed(1)}</p>
                                    <p style={{ color: '#10b981' }}>Price: {formatRp(data.price_discount)}</p>
                                    <p style={{ fontWeight: 'bold', color: getClusterColor(data.cluster_id) }}>Segment: {data.cluster_name}</p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          {clusterSummary.map((sum) => (
                            <Scatter 
                              key={sum.cluster_id} 
                              name={sum.cluster_name} 
                              data={clusterData.filter(h => h.cluster_id === sum.cluster_id)} 
                              fill={getClusterColor(sum.cluster_id)} 
                            />
                          ))}
                          <Legend />
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>

              <div className="card" style={{ gridColumn: 'span 1', display: 'flex', flexDirection: 'column' }}>
                <h3 className="card-title">Segment Profiles</h3>
                
                {mlLoading ? (
                  <p style={{ color: '#64748b' }}>Calculating centroids...</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', flexGrow: 1, maxHeight: '320px' }}>
                    {clusterSummary.map((sum) => (
                      <div key={sum.cluster_id} style={{ borderLeft: `4px solid ${getClusterColor(sum.cluster_id)}`, paddingLeft: '12px', paddingTop: '4px', paddingBottom: '4px' }}>
                        <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: 'white' }}>{sum.cluster_name}</h4>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                          <span>Size: <strong>{sum.count} hotels</strong></span>
                          <span>Avg Rating: <strong>★{sum.avg_rating.toFixed(1)}</strong></span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8' }}>
                          <span>Avg Price: <strong>{formatRp(sum.avg_price)}</strong></span>
                          <span>Avg Disc: <strong>{sum.avg_discount.toFixed(0)}%</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Regression Price Predictor */}
            <div className="grid-3">
              <div className="card" style={{ gridColumn: 'span 1' }}>
                <h3 className="card-title">
                  <TrendingUp size={20} color="#0ea5e9" />
                  Price Predictor Form
                </h3>
                <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '20px' }}>
                  Input a targeted location and user rating to estimate the expected market rate using our Linear Regression model.
                </p>

                <form onSubmit={handlePredict}>
                  <div className="form-group">
                    <label className="form-label">Location</label>
                    <select 
                      className="select-input"
                      value={predLocation}
                      onChange={(e) => setPredLocation(e.target.value)}
                    >
                      {locations.map(loc => (
                        <option key={loc} value={loc}>{loc}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <div className="form-label">
                      <span>Target Rating</span>
                      <span className="value">{predRating.toFixed(1)}</span>
                    </div>
                    <input 
                      type="range" 
                      min="5" 
                      max="10" 
                      step="0.1" 
                      value={predRating}
                      className="slider-input" 
                      onChange={(e) => setPredRating(Number(e.target.value))}
                    />
                  </div>

                  <button type="submit" className="button-primary" style={{ marginTop: '24px' }} disabled={predicting}>
                    {predicting ? 'Estimating...' : 'Forecast Expected Price'}
                  </button>
                </form>
              </div>

              <div className="card" style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <h3 className="card-title">Forecast Output</h3>
                
                {predictedPrice !== null ? (
                  <div className="pred-output">
                    <p style={{ fontSize: '14px', color: '#94a3b8' }}>
                      Based on current market trends for hotels in <strong>{predLocation.replace(', Bali', '')}</strong> with a rating of <strong>★ {predRating.toFixed(1)}</strong>:
                    </p>
                    <div className="pred-price">{formatRp(predictedPrice)}</div>
                    <p style={{ fontSize: '11px', color: '#64748b', marginTop: '12px' }}>
                      Confidence interval: &plusmn; 15% depending on seasonal fluctuations.
                    </p>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    <Brain size={48} style={{ opacity: 0.15, marginBottom: '16px' }} />
                    <p>Enter parameters on the left panel and submit to execute the regression forecasting algorithm.</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

      </main>
    </div>
  );
}
