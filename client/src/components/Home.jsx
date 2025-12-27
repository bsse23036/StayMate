import { useState, useEffect } from 'react';
import HostelCard from './HostelCard';
import MessCard from './MessCard';

// ⚠️ We accept 'apiUrl' here to talk to AWS
export default function Home({ user, apiUrl }) {
  const [hostels, setHostels] = useState([]);
  const [messes, setMesses] = useState([]);
  const [searchLocation, setSearchLocation] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [loading, setLoading] = useState(true);

  // Load data as soon as the page opens
  useEffect(() => {
    if (apiUrl) {
      fetchListings();
    }
  }, [apiUrl]);

  const fetchListings = async () => {
    try {
      console.log("Fetching from AWS:", apiUrl); // Debug log

      // Fetch both Hostels and Messes in parallel
      const [hostelsRes, messesRes] = await Promise.all([
        fetch(`${apiUrl}/hostels`),
        fetch(`${apiUrl}/messes`)
      ]);

      const hostelsData = await hostelsRes.json();
      const messesData = await messesRes.json();

      setHostels(hostelsData);
      setMesses(messesData);
    } catch (error) {
      console.error('Error fetching listings:', error);
      alert("Failed to load data. Check your API Gateway URL.");
    } finally {
      setLoading(false);
    }
  };

  // --- FILTERS (Keep your existing logic) ---
  const filteredHostels = hostels.filter(h => {
    const matchLocation = h.location.toLowerCase().includes(searchLocation.toLowerCase());
    const matchPrice = (!priceRange.min || h.price >= parseInt(priceRange.min)) &&
      (!priceRange.max || h.price <= parseInt(priceRange.max));
    return matchLocation && matchPrice;
  });

  const filteredMesses = messes.filter(m => {
    const matchLocation = m.location.toLowerCase().includes(searchLocation.toLowerCase());
    const matchPrice = (!priceRange.min || m.price >= parseInt(priceRange.min)) &&
      (!priceRange.max || m.price <= parseInt(priceRange.max));
    return matchLocation && matchPrice;
  });

  // --- REAL BOOKING LOGIC ---
  const handleBooking = async (type, id) => {
    if (!user) {
      alert('Please login to book');
      return;
    }
    if (user.role !== 'guest') {
      alert('Only guests can book accommodations');
      return;
    }

    try {
      // Send the booking to AWS Database
      const res = await fetch(`${apiUrl}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guest_id: user.id,
          guest_name: user.name,
          hostel_id: type === 'hostel' ? id : null, // Handle mess vs hostel logic if needed
          mess_id: type === 'mess' ? id : null
        })
      });

      const data = await res.json();

      if (data.success) {
        alert(`✅ Booking Successful! Check your email.`);
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
        <p className="mt-2">Connecting to AWS...</p>
      </div>
    );
  }

  return (
    <div className="container-fluid px-4 py-4">
      <div className="text-center mb-5">
        <h1 className="display-3 fw-bold" style={{ color: '#1a3a5c' }}>Find Your Thikana</h1>
        <p className="lead" style={{ color: '#6c757d' }}>Search for Hostels & Mess services in your city</p>

        {/* SEARCH BAR */}
        <div className="row justify-content-center mt-4">
          <div className="col-lg-8">
            <div className="input-group input-group-lg shadow">
              <input
                type="text"
                className="form-control"
                placeholder="🔍 Search by location (e.g., Lahore, Karachi)"
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
              />
              <button
                className="btn text-white"
                style={{ backgroundColor: '#ff8c42' }}
                onClick={() => setShowFilters(!showFilters)}
              >
                🎛️ Filters
              </button>
            </div>
          </div>
        </div>

        {/* FILTERS */}
        {showFilters && (
          <div className="row justify-content-center mt-3">
            <div className="col-lg-8">
              <div className="card border-0 shadow-sm">
                <div className="card-body">
                  <h6 className="fw-bold mb-3" style={{ color: '#1a3a5c' }}>💰 Price Range (Rs/month)</h6>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <input type="number" className="form-control" placeholder="Min Price"
                        value={priceRange.min} onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })} />
                    </div>
                    <div className="col-md-6">
                      <input type="number" className="form-control" placeholder="Max Price"
                        value={priceRange.max} onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* HOSTELS SECTION */}
      <section className="mb-5">
        <div className="d-flex align-items-center mb-4">
          <h2 className="h3 fw-bold mb-0" style={{ color: '#1a3a5c' }}>🏨 Available Hostels</h2>
          <span className="badge ms-3" style={{ backgroundColor: '#ff8c42' }}>{filteredHostels.length}</span>
        </div>
        {filteredHostels.length === 0 ? (
          <div className="alert alert-info">No hostels found.</div>
        ) : (
          <div className="row row-cols-1 row-cols-md-2 row-cols-lg-4 g-4">
            {filteredHostels.map(hostel => (
              <HostelCard
                key={hostel.id}
                hostel={hostel}
                onBook={() => handleBooking('hostel', hostel.id)}
                showBookButton={user?.role === 'guest'}
              />
            ))}
          </div>
        )}
      </section>

      {/* MESSES SECTION */}
      <section>
        <div className="d-flex align-items-center mb-4">
          <h2 className="h3 fw-bold mb-0" style={{ color: '#1a3a5c' }}>🍽️ Available Mess Services</h2>
          <span className="badge ms-3" style={{ backgroundColor: '#ff8c42' }}>{filteredMesses.length}</span>
        </div>
        {filteredMesses.length === 0 ? (
          <div className="alert alert-info">No mess services found.</div>
        ) : (
          <div className="row row-cols-1 row-cols-md-2 row-cols-lg-4 g-4">
            {filteredMesses.map(mess => (
              <MessCard
                key={mess.id}
                mess={mess}
                showBookButton={user?.role === 'guest'}
                onBook={() => handleBooking('mess', mess.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}