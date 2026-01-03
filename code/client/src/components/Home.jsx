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

  // --- MODAL STATES ---
  const [selectedHostel, setSelectedHostel] = useState(null);
  const [hostelRooms, setHostelRooms] = useState([]);

  const [selectedMess, setSelectedMess] = useState(null);

  const [currentReviews, setCurrentReviews] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  // --- INITIAL FETCH ---
  useEffect(() => {
    if (apiUrl) fetchListings();
  }, [apiUrl]);

  const fetchListings = async () => {
    try {
      setLoading(true);
      const [hostelsRes, messesRes] = await Promise.all([
        fetch(`${apiUrl}/hostels`),
        fetch(`${apiUrl}/messes`)
      ]);
      const hData = await hostelsRes.json();
      const mData = await messesRes.json();
      if (hData.success) setHostels(hData.hostels || []);
      if (mData.success) setMesses(mData.messes || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // --- FETCH REVIEWS HELPER ---
  const fetchReviews = async (type, id) => {
    try {
      const url = type === 'hostel'
        ? `${apiUrl}/reviews?hostel_id=${id}`
        : `${apiUrl}/reviews?mess_id=${id}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) setCurrentReviews(data.reviews);
    } catch (err) {
      console.error("Failed to load reviews", err);
    }
  };

  // --- OPEN HOSTEL MODAL ---
  const openHostelModal = async (hostel) => {
    if (!user) return alert('Please login to view details');
    if (user.role !== 'student') return alert('Only students can book');

    setSelectedHostel(hostel);
    setLoadingData(true);
    setHostelRooms([]);
    setCurrentReviews([]);

    await Promise.all([
      fetch(`${apiUrl}/rooms/${hostel.hostel_id || hostel.id}`).then(res => res.json()).then(data => {
        if (data.success) setHostelRooms(data.rooms);
      }),
      fetchReviews('hostel', hostel.hostel_id || hostel.id)
    ]);

    setLoadingData(false);
  };

  // --- OPEN MESS MODAL ---
  const openMessModal = async (mess) => {
    if (!user) return alert('Please login to view details');
    if (user.role !== 'student') return alert('Only students can book');

    setSelectedMess(mess);
    setLoadingData(true);
    setCurrentReviews([]);

    await fetchReviews('mess', mess.mess_id || mess.id);
    setLoadingData(false);
  };

  // --- BOOKING HANDLERS ---
  const handleRoomBooking = async (roomType) => {
    if (!confirm(`Request booking for ${roomType} Room?`)) return;
    try {
      const res = await fetch(`${apiUrl}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: user.user_id || user.id,
          hostel_id: selectedHostel.hostel_id || selectedHostel.id,
          room_type: roomType,
          start_date: new Date().toISOString().split('T')[0]
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(`✅ Request Sent!`);
        setSelectedHostel(null);
      } else {
        alert(`❌ Failed: ${data.message}`);
      }
    } catch (err) { alert("Error connecting to server"); }
  };

  const handleMessSubscription = async () => {
    if (!confirm(`Confirm subscription to ${selectedMess.name}?`)) return;

    try {
      const res = await fetch(`${apiUrl}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: user.user_id || user.id,
          mess_id: selectedMess.mess_id || selectedMess.id,
          start_date: new Date().toISOString().split('T')[0]
        })
      });

      const data = await res.json();

      if (data.success) {
        // --- NEW CODE: ---
        alert(`✅ Success! You are now subscribed to ${selectedMess.name}.`);
        setSelectedMess(null); // Close the modal
      } else {
        alert(`❌ Failed: ${data.message}`);
      }
    } catch (err) {
      alert("Error connecting to server");
    }
  };

  // --- HELPER COMPONENT: REVIEW FORM ---
  const ReviewForm = ({ targetType, targetId, onSuccess }) => {
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
      e.preventDefault();
      if (!comment.trim()) return alert("Please write a comment");

      setSubmitting(true);
      try {
        const payload = {
          student_id: user.user_id || user.id,
          rating: parseInt(rating),
          comment: comment,
          hostel_id: targetType === 'hostel' ? targetId : null,
          mess_id: targetType === 'mess' ? targetId : null
        };

        const res = await fetch(`${apiUrl}/reviews`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (data.success) {
          setComment('');
          onSuccess(); // Refresh reviews
        } else {
          alert(data.message);
        }
      } catch (err) { alert('Review failed'); }
      finally { setSubmitting(false); }
    };

    return (
      <form onSubmit={handleSubmit} className="p-3 bg-white border rounded mb-3 shadow-sm">
        <h6 className="fw-bold mb-2">Write a Review</h6>
        <div className="mb-2">
          {[1, 2, 3, 4, 5].map(star => (
            <span
              key={star}
              style={{ cursor: 'pointer', fontSize: '1.2rem', color: star <= rating ? '#ffc107' : '#e4e5e9' }}
              onClick={() => setRating(star)}
            >★</span>
          ))}
        </div>
        <textarea
          className="form-control mb-2"
          rows="2"
          placeholder="Share your experience..."
          value={comment}
          onChange={e => setComment(e.target.value)}
          required
        ></textarea>
        <button className="btn btn-primary btn-sm w-100" disabled={submitting}>
          {submitting ? 'Posting...' : 'Submit Review'}
        </button>
      </form>
    );
  };

  // --- HELPER COMPONENT: REVIEWS LIST ---
  const ReviewsList = ({ reviews }) => (
    <div className="mt-3">
      <h5 className="fw-bold border-bottom pb-2 mb-3">Student Reviews ({reviews.length})</h5>
      {reviews.length === 0 ? (
        <p className="text-muted fst-italic">No reviews yet.</p>
      ) : (
        <div className="vstack gap-3" style={{ maxHeight: '300px', overflowY: 'auto' }}>
          {reviews.map((r, i) => (
            <div key={i} className="p-3 bg-light rounded-3 border">
              <div className="d-flex justify-content-between">
                <span className="fw-bold text-dark">{r.student_name || 'Anonymous'}</span>
                <span className="text-warning">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
              </div>
              <p className="mb-1 mt-1 text-secondary small">{r.comment}</p>
              <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                {new Date(r.created_at).toLocaleDateString()}
              </small>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // --- FILTERING ---
  const filteredHostels = hostels.filter(h => {
    const term = searchLocation.toLowerCase();
    const matchLoc = (h.city || '').toLowerCase().includes(term) || (h.location || '').toLowerCase().includes(term);
    const price = h.price_per_month || h.price || 0;
    const matchPrice = (!priceRange.min || price >= parseInt(priceRange.min)) && (!priceRange.max || price <= parseInt(priceRange.max));
    return matchLoc && matchPrice;
  });

  const filteredMesses = messes.filter(m => {
    const term = searchLocation.toLowerCase();
    const matchLoc = (m.city || '').toLowerCase().includes(term) || (m.location || '').toLowerCase().includes(term);
    const price = m.monthly_price || m.price || 0;
    const matchPrice = (!priceRange.min || price >= parseInt(priceRange.min)) && (!priceRange.max || price <= parseInt(priceRange.max));
    return matchLoc && matchPrice;
  });

  if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;

  return (
    <div className="container-fluid px-4 py-4">

      {/* --- HERO SECTION --- */}
      <div className="text-center mb-5 py-4 text-white rounded-4" style={{ background: 'linear-gradient(135deg, #1a3a5c 0%, #2c5f8d 100%)' }}>
        <h1 className="display-4 fw-bold mb-3">Find Your Perfect Stay</h1>
        <p className="lead mb-4">Search for Hostels & Mess services</p>
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <div className="input-group input-group-lg shadow-lg rounded-pill overflow-hidden">
              <input type="text" className="form-control border-0 px-4" placeholder="Search by city..." value={searchLocation} onChange={e => setSearchLocation(e.target.value)} />
              <button className="btn text-white px-4" style={{ backgroundColor: '#ff8c42' }} onClick={() => setShowFilters(!showFilters)}>🎛️ Filters</button>
            </div>
          </div>
        </div>
        {/* Filters UI */}
        {showFilters && (
          <div className="row justify-content-center mt-4">
            <div className="col-lg-6">
              <div className="card text-dark p-3 shadow">
                <div className="row g-2">
                  <div className="col"><input type="number" className="form-control" placeholder="Min Price" value={priceRange.min} onChange={e => setPriceRange({ ...priceRange, min: e.target.value })} /></div>
                  <div className="col"><input type="number" className="form-control" placeholder="Max Price" value={priceRange.max} onChange={e => setPriceRange({ ...priceRange, max: e.target.value })} /></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* --- LISTINGS SECTIONS --- */}
      <section className="mb-5">
        <h3 className="fw-bold mb-3" style={{ color: '#1a3a5c' }}>🏨 Hostels <span className="badge bg-light text-dark fs-6 ms-2">{filteredHostels.length}</span></h3>
        <div className="row row-cols-1 row-cols-md-2 row-cols-lg-4 g-4">
          {filteredHostels.map(h => (
            <HostelCard key={h.hostel_id || h.id} hostel={h} onBook={() => openHostelModal(h)} showBookButton={user?.role === 'student'} />
          ))}
        </div>
      </section>

      <section className="mb-5">
        <h3 className="fw-bold mb-3" style={{ color: '#1a3a5c' }}>🍽️ Mess Services <span className="badge bg-light text-dark fs-6 ms-2">{filteredMesses.length}</span></h3>
        <div className="row row-cols-1 row-cols-md-2 row-cols-lg-4 g-4">
          {filteredMesses.map(m => (
            <MessCard key={m.mess_id || m.id} mess={m} onBook={() => openMessModal(m)} showBookButton={user?.role === 'student'} />
          ))}
        </div>
      </section>

      {/* ========================================= */}
      {/* 1. HOSTEL DETAILS MODAL          */}
      {/* ========================================= */}
      {selectedHostel && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1050 }} onClick={() => setSelectedHostel(null)}>
          <div className="bg-white p-4 rounded-4 shadow-lg" style={{ maxWidth: '900px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>

            <div className="d-flex justify-content-between align-items-start mb-3">
              <div>
                <h3 className="fw-bold m-0 text-primary">{selectedHostel.name}</h3>
                <p className="text-muted m-0">📍 {selectedHostel.city}</p>
              </div>
              <button onClick={() => setSelectedHostel(null)} className="btn-close"></button>
            </div>

            {loadingData ? (
              <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
            ) : (
              <div className="row">
                {/* LEFT: ROOMS */}
                <div className="col-md-7 border-end">
                  <h5 className="fw-bold mb-3">🛏️ Available Rooms</h5>
                  {hostelRooms.length === 0 ? <div className="alert alert-warning">No rooms listed.</div> : (
                    <div className="vstack gap-2">
                      {hostelRooms.map(room => (
                        <div key={room.room_id} className="p-3 border rounded hover-shadow d-flex justify-content-between align-items-center">
                          <div>
                            <div className="fw-bold">{room.room_type}</div>
                            <div className="small text-muted">{room.has_attached_bath ? 'Attached Bath' : 'Shared Bath'}</div>
                            <div className={`small fw-bold ${room.available_beds > 0 ? 'text-success' : 'text-danger'}`}>{room.available_beds} beds left</div>
                          </div>
                          <div className="text-end">
                            <div className="fw-bold text-primary">Rs. {room.price_per_month}</div>
                            <button className="btn btn-sm btn-dark rounded-pill mt-1" disabled={room.available_beds <= 0} onClick={() => handleRoomBooking(room.room_type)}>Book</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* RIGHT: REVIEWS + FORM */}
                <div className="col-md-5 bg-light p-3 rounded">
                  <ReviewForm
                    targetType="hostel"
                    targetId={selectedHostel.hostel_id || selectedHostel.id}
                    onSuccess={() => fetchReviews('hostel', selectedHostel.hostel_id || selectedHostel.id)}
                  />
                  <ReviewsList reviews={currentReviews} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* 2. MESS DETAILS MODAL           */}
      {/* ========================================= */}
      {selectedMess && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1050 }} onClick={() => setSelectedMess(null)}>
          <div className="bg-white p-4 rounded-4 shadow-lg" style={{ maxWidth: '500px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>

            <div className="d-flex justify-content-between align-items-start mb-3">
              <div>
                <h3 className="fw-bold m-0 text-success">{selectedMess.name}</h3>
                <p className="text-muted m-0">📍 {selectedMess.city}</p>
              </div>
              <button onClick={() => setSelectedMess(null)} className="btn-close"></button>
            </div>

            {loadingData ? (
              <div className="text-center py-5"><div className="spinner-border text-success"></div></div>
            ) : (
              <>
                <div className="text-center p-3 bg-light rounded-3 mb-3">
                  <h2 className="fw-bold text-success mb-0">Rs. {selectedMess.monthly_price}<small className="fs-6 text-muted">/mo</small></h2>
                  <p className="text-muted small mb-0">{selectedMess.delivery_radius_km ? `🚚 Delivery Radius: ${selectedMess.delivery_radius_km} km` : '🥡 Pickup Only'}</p>
                </div>

                <button className="btn btn-success w-100 fw-bold py-2 rounded-pill shadow-sm mb-4" onClick={handleMessSubscription}>
                  ✅ Subscribe Now
                </button>

                <div className="bg-light p-3 rounded">
                  <ReviewForm
                    targetType="mess"
                    targetId={selectedMess.mess_id || selectedMess.id}
                    onSuccess={() => fetchReviews('mess', selectedMess.mess_id || selectedMess.id)}
                  />
                  <ReviewsList reviews={currentReviews} />
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
}