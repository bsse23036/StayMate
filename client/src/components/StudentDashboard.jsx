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
      console.log('🔍 Fetching dashboard for student:', user.user_id || user.id);

      // UPDATED: Now passing student_id as a query parameter
      const studentId = user.user_id || user.id;
      const response = await fetch(`${apiUrl}/bookings?student_id=${studentId}`);
      const data = await response.json();

      if (data.success) {
        // Backend now separates them for us
        setBookings(data.bookings);
        setMessSubscriptions(data.subscriptions);
        console.log('✅ Loaded:', data.bookings.length, 'rooms,', data.subscriptions.length, 'messes');
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

  // Handle Cancellation
  const handleCancel = async (id, type) => {
    // Note: Ensure your backend supports DELETE on these endpoints
    // If not, you might need to add specific DELETE routes in index.js
    if (!confirm(`Are you sure you want to cancel this ${type}?`)) return;

    try {
      // Determine endpoint based on type
      const endpoint = type === 'booking'
        ? `/bookings/${id}`  // You might need to implement this DELETE route
        : `/mess-subscriptions/${id}`; // You might need to implement this DELETE route

      const response = await fetch(`${apiUrl}${endpoint}`, { method: 'DELETE' });
      // If the backend doesn't return JSON for delete, check status
      if (response.ok) {
        alert(`${type} cancelled successfully!`);
        fetchStudentData(); // Refresh list
      } else {
        alert('Failed to cancel. Please contact support.');
      }
    } catch (error) {
      console.error('Cancel Error:', error);
      alert('Error cancelling booking');
    }
  };

  // Helper for Status Badge
  const StatusBadge = ({ status }) => {
    let color = 'bg-secondary';
    let label = status;

    if (status === 'confirmed' || status === true) {
      color = 'bg-success';
      label = 'Active';
    }
    if (status === 'pending') {
      color = 'bg-warning text-dark';
      label = 'Pending Approval';
    }
    if (status === 'cancelled') {
      color = 'bg-danger';
      label = 'Cancelled';
    }
    // Handle boolean for mess subscriptions
    if (status === false) {
      color = 'bg-danger';
      label = 'Inactive';
    }

    return (
      <span className={`badge ${color} rounded-pill px-3 py-2`}>
        {label}
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
                          {/* UPDATED: Using property_name from new SQL query */}
                          <h5 className="fw-bold mb-1">{booking.property_name}</h5>
                          <p className="text-muted small mb-0">
                            {booking.details} {/* Shows 'Single Room', etc. */}
                          </p>
                        </div>
                        <StatusBadge status={booking.status} />
                      </div>

                      <div className="d-flex justify-content-between align-items-center mt-3 border-top pt-3">
                        <small className="text-muted">
                          Start Date: {new Date(booking.start_date).toLocaleDateString()}
                        </small>
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
                          {/* UPDATED: Using property_name from new SQL query */}
                          <h5 className="fw-bold mb-1">{sub.property_name}</h5>
                          <p className="text-muted small mb-0">
                            {sub.details} {/* Shows 'Monthly Plan' */}
                          </p>
                        </div>
                        {/* UPDATED: Passing is_active boolean */}
                        <StatusBadge status={sub.is_active} />
                      </div>

                      <div className="d-flex justify-content-between align-items-center mt-3 border-top pt-3">
                        <small className="text-muted">
                          Start Date: {new Date(sub.start_date).toLocaleDateString()}
                        </small>
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