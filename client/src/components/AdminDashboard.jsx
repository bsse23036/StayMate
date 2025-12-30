// src/components/AdminDashboard.jsx
import { useState, useEffect } from 'react';

export default function AdminDashboard({ user, apiUrl }) {
  const [users, setUsers] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [messes, setMesses] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllData();
  }, [apiUrl]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      // Fetch all data from AWS
      const [usersRes, hostelsRes, messesRes, bookingsRes] = await Promise.all([
        fetch(`${apiUrl}/users`),
        fetch(`${apiUrl}/hostels`),
        fetch(`${apiUrl}/messes`),
        fetch(`${apiUrl}/bookings`)
      ]);

      const [usersData, hostelsData, messesData, bookingsData] = await Promise.all([
        usersRes.json(),
        hostelsRes.json(),
        messesRes.json(),
        bookingsRes.json()
      ]);

      setUsers(Array.isArray(usersData) ? usersData : usersData.users || []);
      setHostels(Array.isArray(hostelsData) ? hostelsData : hostelsData.hostels || []);
      setMesses(Array.isArray(messesData) ? messesData : messesData.messes || []);
      setBookings(Array.isArray(bookingsData) ? bookingsData : bookingsData.bookings || []);
      
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Failed to load admin data. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeColor = (role) => {
    switch(role) {
      case 'student': return '#1a3a5c';
      case 'hostel_owner': return '#ff8c42';
      case 'mess_owner': return '#28a745';
      case 'admin': return '#dc3545';
      default: return '#6c757d';
    }
  };

  if (loading) {
    return (
      <div className="container-fluid text-center py-5">
        <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2">Loading admin data...</p>
      </div>
    );
  }

  return (
    <div className="container-fluid px-4 py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold" style={{ color: '#1a3a5c' }}>📊 Admin Dashboard</h2>
        <button 
          onClick={fetchAllData}
          className="btn btn-outline-primary"
          disabled={loading}
        >
          🔄 Refresh Data
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="row g-4 mb-4">
        <div className="col-md-3">
          <div className="card text-center shadow border-0 h-100" style={{ borderLeft: '4px solid #1a3a5c' }}>
            <div className="card-body">
              <h3 className="fw-bold" style={{ color: '#1a3a5c' }}>{users.length}</h3>
              <p className="text-muted mb-0">👥 Total Users</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card text-center shadow border-0 h-100" style={{ borderLeft: '4px solid #ff8c42' }}>
            <div className="card-body">
              <h3 className="fw-bold" style={{ color: '#ff8c42' }}>{hostels.length}</h3>
              <p className="text-muted mb-0">🏨 Total Hostels</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card text-center shadow border-0 h-100" style={{ borderLeft: '4px solid #28a745' }}>
            <div className="card-body">
              <h3 className="fw-bold text-success">{messes.length}</h3>
              <p className="text-muted mb-0">🍽️ Total Messes</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card text-center shadow border-0 h-100" style={{ borderLeft: '4px solid #17a2b8' }}>
            <div className="card-body">
              <h3 className="fw-bold text-info">{bookings.length}</h3>
              <p className="text-muted mb-0">📋 Total Bookings</p>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="card mb-4 shadow border-0">
        <div className="card-header text-white" style={{ backgroundColor: '#1a3a5c' }}>
          <h5 className="mb-0">👥 All Users</h5>
        </div>
        <div className="card-body">
          {users.length === 0 ? (
            <p className="text-muted mb-0">No users found</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Role</th>
                    <th>Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.user_id}>
                      <td>{user.user_id}</td>
                      <td className="fw-bold">{user.full_name}</td>
                      <td>{user.email}</td>
                      <td>{user.phone_number || 'N/A'}</td>
                      <td>
                        <span className="badge" style={{ backgroundColor: getRoleBadgeColor(user.role) }}>
                          {user.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td>{new Date(user.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Hostels Table */}
      <div className="card mb-4 shadow border-0">
        <div className="card-header text-white" style={{ backgroundColor: '#ff8c42' }}>
          <h5 className="mb-0">🏨 All Hostels</h5>
        </div>
        <div className="card-body">
          {hostels.length === 0 ? (
            <p className="text-muted mb-0">No hostels found</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>City</th>
                    <th>Owner ID</th>
                    <th>Price/Month</th>
                    <th>WiFi</th>
                    <th>Generator</th>
                  </tr>
                </thead>
                <tbody>
                  {hostels.map(hostel => (
                    <tr key={hostel.hostel_id}>
                      <td>{hostel.hostel_id}</td>
                      <td className="fw-bold">{hostel.name}</td>
                      <td>{hostel.city}</td>
                      <td>{hostel.owner_id}</td>
                      <td>Rs. {hostel.price_per_month}</td>
                      <td>{hostel.wifi_available ? '✅' : '❌'}</td>
                      <td>{hostel.generator_available ? '✅' : '❌'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Messes Table */}
      <div className="card mb-4 shadow border-0">
        <div className="card-header text-white bg-success">
          <h5 className="mb-0">🍽️ All Mess Services</h5>
        </div>
        <div className="card-body">
          {messes.length === 0 ? (
            <p className="text-muted mb-0">No mess services found</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>City</th>
                    <th>Owner ID</th>
                    <th>Price/Month</th>
                    <th>Delivery Range</th>
                  </tr>
                </thead>
                <tbody>
                  {messes.map(mess => (
                    <tr key={mess.mess_id}>
                      <td>{mess.mess_id}</td>
                      <td className="fw-bold">{mess.name}</td>
                      <td>{mess.city}</td>
                      <td>{mess.owner_id}</td>
                      <td>Rs. {mess.monthly_price}</td>
                      <td>{mess.delivery_radius_km ? `${mess.delivery_radius_km} km` : 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Bookings Table */}
      <div className="card shadow border-0">
        <div className="card-header text-white bg-info">
          <h5 className="mb-0">📋 Recent Bookings</h5>
        </div>
        <div className="card-body">
          {bookings.length === 0 ? (
            <p className="text-muted mb-0">No bookings yet</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Booking ID</th>
                    <th>Student ID</th>
                    <th>Room/Mess ID</th>
                    <th>Start Date</th>
                    <th>Status</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.slice(0, 20).map(booking => (
                    <tr key={booking.booking_id || booking.subscription_id}>
                      <td>{booking.booking_id || booking.subscription_id}</td>
                      <td>{booking.student_id}</td>
                      <td>{booking.room_id || booking.mess_id}</td>
                      <td>{new Date(booking.start_date).toLocaleDateString()}</td>
                      <td>
                        <span className={`badge ${booking.status === 'confirmed' || booking.is_active ? 'bg-success' : booking.status === 'pending' ? 'bg-warning' : 'bg-danger'}`}>
                          {booking.status || (booking.is_active ? 'Active' : 'Inactive')}
                        </span>
                      </td>
                      <td>{new Date(booking.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}