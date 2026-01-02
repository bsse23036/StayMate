// src/components/AdminDashboard.jsx
import { useState, useEffect } from 'react';

const MOCK_USERS = [
  { id: 1, name: 'Ahmed Ali', email: 'ahmed@example.com', role: 'guest', created_at: '2024-01-15' },
  { id: 2, name: 'Sara Khan', email: 'sara@example.com', role: 'hostel_owner', created_at: '2024-02-10' },
  { id: 3, name: 'Hassan Malik', email: 'hassan@example.com', role: 'mess_owner', created_at: '2024-03-05' },
];

export default function AdminDashboard({ useMockData }) {
  const [users, setUsers] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [messes, setMesses] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllData();
  }, [useMockData]);

  const fetchAllData = async () => {
    if (useMockData) {
      setTimeout(() => {
        setUsers(MOCK_USERS);
        
        const allHostels = [];
        const allMesses = [];
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('hostels_')) {
            allHostels.push(...JSON.parse(localStorage.getItem(key)));
          }
          if (key.startsWith('messes_')) {
            allMesses.push(...JSON.parse(localStorage.getItem(key)));
          }
        });
        
        setHostels(allHostels);
        setMesses(allMesses);
        setBookings([]);
        setLoading(false);
      }, 500);
    } else {
      try {
        const [usersRes, hostelsRes, messesRes, bookingsRes] = await Promise.all([
          fetch('http://localhost:3000/api/users'),
          fetch('http://localhost:3000/api/hostels'),
          fetch('http://localhost:3000/api/messes'),
          fetch('http://localhost:3000/api/bookings')
        ]);

        setUsers(await usersRes.json());
        setHostels(await hostelsRes.json());
        setMesses(await messesRes.json());
        setBookings(await bookingsRes.json());
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }
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
      <h2 className="mb-4 fw-bold" style={{ color: '#1a3a5c' }}>📊 Admin Dashboard</h2>

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

      <div className="card mb-4 shadow border-0">
        <div className="card-header text-white" style={{ backgroundColor: '#1a3a5c' }}>
          <h5 className="mb-0">👥 All Users</h5>
        </div>
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Created At</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td>{user.id}</td>
                    <td className="fw-bold">{user.name}</td>
                    <td>{user.email}</td>
                    <td>
                      <span className="badge" style={{ 
                        backgroundColor: user.role === 'guest' ? '#1a3a5c' : 
                                       user.role === 'hostel_owner' ? '#ff8c42' : '#28a745' 
                      }}>
                        {user.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td>{new Date(user.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card shadow border-0">
        <div className="card-header text-white" style={{ backgroundColor: '#ff8c42' }}>
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
                    <th>Guest ID</th>
                    <th>Hostel ID</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.slice(0, 10).map(booking => (
                    <tr key={booking.id}>
                      <td>{booking.id}</td>
                      <td>{booking.guest_id}</td>
                      <td>{booking.hostel_id}</td>
                      <td>{new Date(booking.booking_date).toLocaleDateString()}</td>
                      <td>
                        <span className="badge bg-success">{booking.status}</span>
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
  );
}