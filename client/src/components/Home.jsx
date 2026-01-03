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

  // --- NEW STATES FOR BOOKING MODAL ---
  const [selectedHostel, setSelectedHostel] = useState(null);
  const [hostelRooms, setHostelRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);

  useEffect(() => {
    if (apiUrl) {
      fetchListings();
    }
  }, [apiUrl]);

  const fetchListings = async () => {
    try {
      setLoading(true);
      const [hostelsRes, messesRes] = await Promise.all([
        fetch(`${apiUrl}/hostels`),
        fetch(`${apiUrl}/messes`)
      ]);

      const hostelsData = await hostelsRes.json();
      const messesData = await messesRes.json();

      if (hostelsData.success) setHostels(hostelsData.hostels || []);
      if (messesData.success) setMesses(messesData.messes || []);

    } catch (error) {
      console.error('Error fetching listings:', error);
    } finally {
      setLoading(false);
    }
  };

  // --- NEW: OPEN MODAL TO VIEW ROOMS ---
  const openBookingModal = async (hostel) => {
    if (!user) {
      alert('Please login to book');
      return;
    }
    if (user.role !== 'student') {
      alert('Only students can book accommodations');
      return;
    }

    setSelectedHostel(hostel);
    setLoadingRooms(true);
    setHostelRooms([]);

    try {
      const res = await fetch(`${apiUrl}/rooms/${hostel.hostel_id || hostel.id}`);
      const data = await res.json();
      if (data.success) {
        setHostelRooms(data.rooms);
      }
    } catch (error) {
      alert("Error loading rooms");
    } finally {
      setLoadingRooms(false);
    }
  };

  // --- NEW: BOOK A SPECIFIC ROOM TYPE ---
  const handleRoomBooking = async (roomType) => {
    if (!confirm(`Request booking for ${roomType} Room?`)) return;

    try {
      const res = await fetch(`${apiUrl}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: user.user_id || user.id,
          hostel_id: selectedHostel.hostel_id || selectedHostel.id,
          room_type: roomType, // Send the specific type
          start_date: new Date().toISOString().split('T')[0]
        })
      });

      const data = await res.json();

      if (data.success) {
        alert(`✅ Request Sent! Waiting for Owner Approval.`);
        setSelectedHostel(null); // Close modal
      } else {
        alert(`❌ Booking Failed: ${data.message}`);
      }
    } catch (err) {
      alert("Connection Error. Try again.");
    }
  };

  // --- EXISTING: HANDLE MESS BOOKING (Direct) ---
  const handleMessBooking = async (messId) => {
    if (!user || user.role !== 'student') {
      alert('Only students can book messes');
      return;
    }
    if (!confirm("Confirm subscription to this Mess?")) return;

    try {
      const res = await fetch(`${apiUrl}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: user.user_id || user.id,
          mess_id: messId,
          start_date: new Date().toISOString().split('T')[0]
        })
      });

      const data = await res.json();
      if (data.success) {
        alert(`✅ Subscription Request Sent!`);
      } else {
        alert(`❌ Failed: ${data.message}`);
      }
    } catch (err) {
      alert("Connection Error");
    }
  };

  // --- FILTER LOGIC (UNCHANGED) ---
  const filteredHostels = hostels.filter(h => {
    const term = searchLocation.toLowerCase();
    const matchLocation = (h.city || '').toLowerCase().includes(term) ||
      (h.location || '').toLowerCase().includes(term) ||
      (h.name || '').toLowerCase().includes(term);

    const price = h.price_per_month || h.price || 0;
    const matchPrice = (!priceRange.min || price >= parseInt(priceRange.min)) &&
      (!priceRange.max || price <= parseInt(priceRange.max));
    return matchLocation && matchPrice;
  });

  const filteredMesses = messes.filter(m => {
    const term = searchLocation.toLowerCase();
    const matchLocation = (m.city || '').toLowerCase().includes(term) ||
      (m.location || '').toLowerCase().includes(term) ||
      (m.name || '').toLowerCase().includes(term);

    const price = m.monthly_price || m.price || 0;
    const matchPrice = (!priceRange.min || price >= parseInt(priceRange.min)) &&
      (!priceRange.max || price <= parseInt(priceRange.max));
    return matchLocation && matchPrice;
  });

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
                placeholder="🔍 Search by city or name..."
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
                // UPDATE: Open Modal instead of direct booking
                onBook={() => openBookingModal(hostel)}
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
                // UPDATE: Keep direct booking for mess
                onBook={() => handleMessBooking(mess.mess_id || mess.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* --- ROOM SELECTION MODAL --- */}
      {selectedHostel && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1050 }}
          onClick={() => setSelectedHostel(null)} // Close on background click
        >
          <div
            className="bg-white p-4 rounded-4 shadow-lg"
            style={{ maxWidth: '600px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()} // Prevent close on modal click
          >
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div>
                <h3 className="fw-bold m-0" style={{ color: '#1a3a5c' }}>{selectedHostel.name}</h3>
                <small className="text-muted">Select a room type to request booking</small>
              </div>
              <button onClick={() => setSelectedHostel(null)} className="btn-close"></button>
            </div>

            {loadingRooms ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary"></div>
                <p className="mt-2">Loading rooms...</p>
              </div>
            ) : hostelRooms.length === 0 ? (
              <div className="alert alert-warning text-center">
                ⚠️ No rooms listed for this hostel yet.
              </div>
            ) : (
              <div className="vstack gap-3">
                {hostelRooms.map((room) => (
                  <div key={room.room_id} className="d-flex justify-content-between align-items-center p-3 border rounded-3 shadow-sm bg-light">
                    <div>
                      <h5 className="fw-bold mb-1" style={{ color: '#1a3a5c' }}>{room.room_type} Room</h5>
                      <div className="text-muted small">
                        {room.has_attached_bath ? '✅ Attached Bath' : '🚿 Shared Bath'} • {room.total_beds} Beds Total
                      </div>
                      <div className={`mt-1 fw-bold ${room.available_beds > 0 ? 'text-success' : 'text-danger'}`}>
                        {room.available_beds > 0 ? `✔ ${room.available_beds} beds available` : '❌ Fully Booked'}
                      </div>
                    </div>
                    <div className="text-end">
                      <h5 className="text-primary fw-bold mb-2">Rs. {room.price_per_month}</h5>
                      <button
                        onClick={() => handleRoomBooking(room.room_type)}
                        disabled={room.available_beds <= 0}
                        className={`btn btn-sm rounded-pill px-4 fw-bold ${room.available_beds > 0 ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ backgroundColor: room.available_beds > 0 ? '#1a3a5c' : '#6c757d' }}
                      >
                        {room.available_beds > 0 ? 'Request Booking' : 'Full'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}