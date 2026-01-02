// src/components/Home.jsx
import { useState, useEffect } from 'react';
import HostelCard from './HostelCard';
import MessCard from './MessCard';

export default function Home({ user, apiUrl }) {
  const [hostels, setHostels] = useState([]);
  const [messes, setMesses] = useState([]);
  const [searchLocation, setSearchLocation] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (apiUrl) {
      fetchListings();
    }
  }, [apiUrl]);

  const fetchListings = async () => {
    try {
      console.log("Fetching from AWS:", apiUrl);

      const [hostelsRes, messesRes] = await Promise.all([
        fetch(`${apiUrl}/hostels`),
        fetch(`${apiUrl}/messes`)
      ]);

      const hostelsData = await hostelsRes.json();
      const messesData = await messesRes.json();

      if (hostelsData.success && messesData.success) {
        setHostels(hostelsData.hostels || []);
        setMesses(messesData.messes || []);
      }
    } catch (error) {
      console.error('Error fetching listings:', error);
      alert("Failed to load data. Please check console for details.");
    } finally {
      setLoading(false);
    }
  };

  const filteredHostels = hostels.filter(h => {
    const matchLocation = h.city?.toLowerCase().includes(searchLocation.toLowerCase()) || 
                         h.location?.toLowerCase().includes(searchLocation.toLowerCase());
    const matchPrice = (!priceRange.min || h.price_per_month >= parseInt(priceRange.min)) &&
      (!priceRange.max || h.price_per_month <= parseInt(priceRange.max));
    return matchLocation && matchPrice;
  });

  const filteredMesses = messes.filter(m => {
    const matchLocation = m.city?.toLowerCase().includes(searchLocation.toLowerCase()) ||
                         m.location?.toLowerCase().includes(searchLocation.toLowerCase());
    const matchPrice = (!priceRange.min || m.monthly_price >= parseInt(priceRange.min)) &&
      (!priceRange.max || m.monthly_price <= parseInt(priceRange.max));
    return matchLocation && matchPrice;
  });

  const handleBooking = async (type, id) => {
    if (!user) {
      alert('Please login to book');
      return;
    }
    if (user.role !== 'student') {
      alert('Only students can book accommodations');
      return;
    }

    try {
      const res = await fetch(`${apiUrl}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: user.user_id || user.id,
          hostel_id: type === 'hostel' ? id : null,
          mess_id: type === 'mess' ? id : null,
          start_date: new Date().toISOString().split('T')[0]
        })
      });

      const data = await res.json();

      if (data.success) {
        alert(`✅ Booking Successful!`);
      } else {
        alert(`❌ Booking Failed: ${data.message}`);
      }

    } catch (err) {
      console.error(err);
      alert("Connection Error. Try again.");
    }
  };

  if (loading) {
    return (
      <div className="container-fluid text-center py-5">
        <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3 text-muted">Loading accommodations...</p>
      </div>
    );
  }

  return (
    <div className="container-fluid px-4 py-4">
      {/* Hero Section */}
      <div className="text-center mb-5 py-4" style={{ 
        background: 'linear-gradient(135deg, #1a3a5c 0%, #2c5f8d 100%)',
        borderRadius: '20px',
        color: 'white'
      }}>
        <h1 className="display-4 fw-bold mb-3">Find Your Perfect Stay</h1>
        <p className="lead mb-4">Search for Hostels & Mess services in your city</p>

        <div className="row justify-content-center">
          <div className="col-lg-8">
            <div className="input-group input-group-lg shadow-lg" style={{ borderRadius: '50px', overflow: 'hidden' }}>
              <input
                type="text"
                className="form-control border-0"
                placeholder="🔍 Search by location (e.g., Lahore, Karachi)"
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
                style={{ borderRadius: '50px 0 0 50px', padding: '15px 25px' }}
              />
              <button
                className="btn"
                style={{ backgroundColor: '#ff8c42', color: 'white', border: 'none', borderRadius: '0 50px 50px 0', padding: '15px 30px' }}
                onClick={() => setShowFilters(!showFilters)}
              >
                🎛️ Filters
              </button>
            </div>
          </div>
        </div>

        {showFilters && (
          <div className="row justify-content-center mt-4">
            <div className="col-lg-8">
              <div className="card border-0 shadow-lg" style={{ borderRadius: '20px' }}>
                <div className="card-body p-4">
                  <h6 className="fw-bold mb-3" style={{ color: '#1a3a5c' }}>💰 Price Range (Rs/month)</h6>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <input 
                        type="number" 
                        className="form-control form-control-lg" 
                        placeholder="Min Price"
                        value={priceRange.min} 
                        onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                        style={{ borderRadius: '10px' }}
                      />
                    </div>
                    <div className="col-md-6">
                      <input 
                        type="number" 
                        className="form-control form-control-lg" 
                        placeholder="Max Price"
                        value={priceRange.max} 
                        onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                        style={{ borderRadius: '10px' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Statistics */}
      <div className="row g-4 mb-5">
        <div className="col-md-4">
          <div className="card border-0 shadow-sm text-center p-4" style={{ borderRadius: '15px', borderLeft: '5px solid #ff8c42' }}>
            <h2 className="fw-bold" style={{ color: '#ff8c42' }}>{hostels.length}</h2>
            <p className="text-muted mb-0">🏨 Available Hostels</p>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 shadow-sm text-center p-4" style={{ borderRadius: '15px', borderLeft: '5px solid #28a745' }}>
            <h2 className="fw-bold" style={{ color: '#28a745' }}>{messes.length}</h2>
            <p className="text-muted mb-0">🍽️ Mess Services</p>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 shadow-sm text-center p-4" style={{ borderRadius: '15px', borderLeft: '5px solid #1a3a5c' }}>
            <h2 className="fw-bold" style={{ color: '#1a3a5c' }}>{filteredHostels.length + filteredMesses.length}</h2>
            <p className="text-muted mb-0">✨ Total Options</p>
          </div>
        </div>
      </div>

      {/* Hostels Section */}
      <section className="mb-5">
        <div className="d-flex align-items-center mb-4">
          <h2 className="h3 fw-bold mb-0" style={{ color: '#1a3a5c' }}>🏨 Available Hostels</h2>
          <span className="badge ms-3" style={{ backgroundColor: '#ff8c42', padding: '10px 20px', borderRadius: '20px' }}>
            {filteredHostels.length}
          </span>
        </div>
        {filteredHostels.length === 0 ? (
          <div className="alert alert-info" style={{ borderRadius: '15px' }}>
            No hostels found matching your criteria.
          </div>
        ) : (
          <div className="row row-cols-1 row-cols-md-2 row-cols-lg-4 g-4">
            {filteredHostels.map(hostel => (
              <HostelCard
                key={hostel.hostel_id || hostel.id}
                hostel={hostel}
                onBook={() => handleBooking('hostel', hostel.hostel_id || hostel.id)}
                showBookButton={user?.role === 'student'}
              />
            ))}
          </div>
        )}
      </section>

      {/* Messes Section */}
      <section>
        <div className="d-flex align-items-center mb-4">
          <h2 className="h3 fw-bold mb-0" style={{ color: '#1a3a5c' }}>🍽️ Available Mess Services</h2>
          <span className="badge ms-3" style={{ backgroundColor: '#28a745', padding: '10px 20px', borderRadius: '20px' }}>
            {filteredMesses.length}
          </span>
        </div>
        {filteredMesses.length === 0 ? (
          <div className="alert alert-info" style={{ borderRadius: '15px' }}>
            No mess services found matching your criteria.
          </div>
        ) : (
          <div className="row row-cols-1 row-cols-md-2 row-cols-lg-4 g-4">
            {filteredMesses.map(mess => (
              <MessCard
                key={mess.mess_id || mess.id}
                mess={mess}
                showBookButton={user?.role === 'student'}
                onBook={() => handleBooking('mess', mess.mess_id || mess.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}