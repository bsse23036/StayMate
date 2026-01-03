// src/components/StudentDashboard.jsx
import { useState, useEffect } from 'react';

export default function StudentDashboard({ user, apiUrl }) {
  const [bookings, setBookings] = useState([]);
  const [messSubscriptions, setMessSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch all bookings for the logged-in student
  const fetchStudentData = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching dashboard for student:', user.user_id);

      // We fetch ALL bookings and then filter by student_id client-side 
      // (or you can create a specific backend endpoint /bookings/student/:id for better performance)
      const response = await fetch(`${apiUrl}/bookings`);
      const data = await response.json();

      if (data.success) {
        // Filter Room Bookings
        const myRooms = data.bookings.filter(b =>
          b.student_id === user.user_id && b.room_id // Ensure it's a room booking
        );

        // Filter Mess Subscriptions
        const myMess = data.bookings.filter(b =>
          b.student_id === user.user_id && b.mess_id // Ensure it's a mess sub
        );

        setBookings(myRooms);
        setMessSubscriptions(myMess);
        console.log('✅ Loaded:', myRooms.length, 'rooms,', myMess.length, 'messes');
      } else {
        console.error('❌ Failed to load bookings:', data.message);
      }
    } catch (error) {
      console.error('💥 Error fetching student data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && apiUrl) {
      fetchStudentData();
    }
  }, [user, apiUrl]);

  // Handle Cancellation (Works for both Rooms and Mess)
  const handleCancel = async (id, type) => {
    if (!confirm(`Are you sure you want to cancel this ${type}?`)) return;

    try {
      // Assuming your backend supports DELETE /bookings/:id or /mess-subscriptions/:id
      // If not, you might need to add a "status: cancelled" update logic here.
      // For now, let's simulate a delete request.

      const endpoint = type === 'booking' ? `/bookings/${id}` : `/mess-subscriptions/${id}`;
      // Note: You need to ensure your backend has DELETE routes for these. 
      // If not, you can ask me to add them to index.js!

      const response = await fetch(`${apiUrl}${endpoint}`, { method: 'DELETE' });
      const data = await response.json();

      if (data.success) {
        alert(`${type} cancelled successfully!`);
        fetchStudentData(); // Refresh list
      } else {
        alert('Failed to cancel: ' + (data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Cancel Error:', error);
      alert('Error cancelling booking');
    }
  };

  // Helper for Status Badge
  const StatusBadge = ({ status }) => {
    let color = 'bg-secondary';
    if (status === 'confirmed' || status === true) color = 'bg-success';
    if (status === 'pending') color = 'bg-warning text-dark';
    if (status === 'cancelled') color = 'bg-danger';

    return (
      <span className={`badge ${color} rounded-pill px-3 py-2`}>
        {status === true ? 'Active' : status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}></div>
        <p className="mt-3 text-muted fw-bold">Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="container-fluid px-4 py-4">
      {/* Header */}
      <div className="mb-5">
        <h2 className="fw-bold" style={{ color: '#1a3a5c' }}>
          🎓 Student Dashboard
        </h2>
        <p className="text-muted">Welcome back, {user.full_name}! Here are your active bookings.</p>
      </div>

      <div className="row g-4">

        {/* LEFT COLUMN: Room Bookings */}
        <div className="col-lg-6">
          <div className="card shadow-sm border-0 h-100" style={{ borderRadius: '15px' }}>
            <div className="card-header bg-white border-0 pt-4 px-4">
              <h4 className="fw-bold mb-0" style={{ color: '#1a3a5c' }}>🛏️ My Room Bookings</h4>
            </div>
            <div className="card-body p-4">
              {bookings.length === 0 ? (
                <div className="alert alert-info text-center" style={{ borderRadius: '10px' }}>
                  You haven't booked any rooms yet.
                  <br />
                  <a href="#" className="fw-bold text-decoration-none mt-2 d-inline-block">Browse Hostels</a>
                </div>
              ) : (
                <div className="vstack gap-3">
                  {bookings.map((booking) => (
                    <div key={booking.booking_id} className="p-3 border rounded-3 bg-light position-relative">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div>
                          <h5 className="fw-bold mb-1">Room #{booking.room_id}</h5>
                          <p className="text-muted small mb-0">
                            📅 Booked on: {new Date(booking.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <StatusBadge status={booking.status} />
                      </div>

                      <div className="d-flex justify-content-between align-items-center mt-3 border-top pt-3">
                        <small className="text-muted">Start Date: {new Date(booking.start_date).toLocaleDateString()}</small>
                        <button
                          className="btn btn-sm btn-outline-danger rounded-pill px-3"
                          onClick={() => handleCancel(booking.booking_id, 'booking')}
                        >
                          Cancel Booking
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Mess Subscriptions */}
        <div className="col-lg-6">
          <div className="card shadow-sm border-0 h-100" style={{ borderRadius: '15px' }}>
            <div className="card-header bg-white border-0 pt-4 px-4">
              <h4 className="fw-bold mb-0" style={{ color: '#ff8c42' }}>🍽️ My Mess Plans</h4>
            </div>
            <div className="card-body p-4">
              {messSubscriptions.length === 0 ? (
                <div className="alert alert-warning text-center" style={{ borderRadius: '10px' }}>
                  No active mess plans.
                  <br />
                  <a href="#" className="fw-bold text-decoration-none mt-2 d-inline-block text-warning">Find a Mess</a>
                </div>
              ) : (
                <div className="vstack gap-3">
                  {messSubscriptions.map((sub) => (
                    <div key={sub.subscription_id} className="p-3 border rounded-3 bg-light position-relative">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div>
                          <h5 className="fw-bold mb-1">Mess Service #{sub.mess_id}</h5>
                          <p className="text-muted small mb-0">
                            📅 Subscribed: {new Date(sub.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <StatusBadge status={sub.is_active} />
                      </div>

                      <div className="d-flex justify-content-between align-items-center mt-3 border-top pt-3">
                        <small className="text-muted">Start Date: {new Date(sub.start_date).toLocaleDateString()}</small>
                        <button
                          className="btn btn-sm btn-outline-danger rounded-pill px-3"
                          onClick={() => handleCancel(sub.subscription_id, 'subscription')}
                        >
                          Cancel Plan
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}