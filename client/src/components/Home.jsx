// src/components/Home.jsx
import { useState, useEffect } from 'react';
import HostelCard from './HostelCard';
import MessCard from './MessCard';

// Mock Data
const MOCK_HOSTELS = [
  { id: 1, name: 'Royal Hostel', price: 8000, location: 'Lahore', description: 'Comfortable rooms with WiFi and AC', image_url: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=400' },
  { id: 2, name: 'City Center Hostel', price: 6500, location: 'Karachi', description: 'Budget-friendly near main city', image_url: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400' },
  { id: 3, name: 'Student Paradise', price: 7000, location: 'Islamabad', description: 'Perfect for students with study rooms', image_url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400' },
];

const MOCK_MESSES = [
  { id: 1, name: 'Desi Khana Mess', price: 4500, location: 'Lahore', menu_description: 'Mon: Biryani, Tue: Daal Chawal, Wed: Chicken Karahi', image_url: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400' },
  { id: 2, name: 'Healthy Meals', price: 5000, location: 'Karachi', menu_description: 'Fresh vegetables, lean proteins, balanced diet', image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400' },
  { id: 3, name: 'Taste of Home', price: 4000, location: 'Islamabad', menu_description: 'Home-style cooking, daily fresh meals', image_url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400' },
];

export default function Home({ user, useMockData }) {
  const [hostels, setHostels] = useState([]);
  const [messes, setMesses] = useState([]);
  const [searchLocation, setSearchLocation] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchListings();
  }, [useMockData]);

  const fetchListings = async () => {
    if (useMockData) {
      setTimeout(() => {
        setHostels(MOCK_HOSTELS);
        setMesses(MOCK_MESSES);
        setLoading(false);
      }, 500);
    } else {
      try {
        const [hostelsRes, messesRes] = await Promise.all([
          fetch('http://localhost:3000/api/hostels'),
          fetch('http://localhost:3000/api/messes')
        ]);
        setHostels(await hostelsRes.json());
        setMesses(await messesRes.json());
      } catch (error) {
        console.error('Error fetching listings:', error);
      } finally {
        setLoading(false);
      }
    }
  };

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

  const handleBooking = (type, id) => {
    if (!user) {
      alert('Please login to book');
      return;
    }
    if (user.role !== 'guest') {
      alert('Only guests can book accommodations');
      return;
    }
    alert(`Booking successful for ${type} ID: ${id}!`);
  };

  if (loading) {
    return (
      <div className="container-fluid text-center py-5">
        <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid px-4 py-4">
      <div className="text-center mb-5">
        <h1 className="display-3 fw-bold" style={{ color: '#1a3a5c' }}>Find Your Thikana</h1>
        <p className="lead" style={{ color: '#6c757d' }}>Search for Hostels & Mess services in your city</p>
        
        <div className="row justify-content-center mt-4">
          <div className="col-lg-8">
            <div className="input-group input-group-lg shadow">
              <input
                type="text"
                className="form-control"
                placeholder="🔍 Search by location (e.g., Lahore, Karachi, Islamabad)"
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

        {showFilters && (
          <div className="row justify-content-center mt-3">
            <div className="col-lg-8">
              <div className="card border-0 shadow-sm">
                <div className="card-body">
                  <h6 className="fw-bold mb-3" style={{ color: '#1a3a5c' }}>💰 Price Range (Rs/month)</h6>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <input
                        type="number"
                        className="form-control"
                        placeholder="Min Price"
                        value={priceRange.min}
                        onChange={(e) => setPriceRange({...priceRange, min: e.target.value})}
                      />
                    </div>
                    <div className="col-md-6">
                      <input
                        type="number"
                        className="form-control"
                        placeholder="Max Price"
                        value={priceRange.max}
                        onChange={(e) => setPriceRange({...priceRange, max: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <section className="mb-5">
        <div className="d-flex align-items-center mb-4">
          <h2 className="h3 fw-bold mb-0" style={{ color: '#1a3a5c' }}>🏨 Available Hostels</h2>
          <span className="badge ms-3" style={{ backgroundColor: '#ff8c42' }}>{filteredHostels.length}</span>
        </div>
        {filteredHostels.length === 0 ? (
          <div className="alert alert-info">No hostels found matching your criteria</div>
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

      <section>
        <div className="d-flex align-items-center mb-4">
          <h2 className="h3 fw-bold mb-0" style={{ color: '#1a3a5c' }}>🍽️ Available Mess Services</h2>
          <span className="badge ms-3" style={{ backgroundColor: '#ff8c42' }}>{filteredMesses.length}</span>
        </div>
        {filteredMesses.length === 0 ? (
          <div className="alert alert-info">No mess services found matching your criteria</div>
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