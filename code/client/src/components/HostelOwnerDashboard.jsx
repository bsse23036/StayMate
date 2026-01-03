// src/components/HostelOwnerDashboard.jsx
import { useState, useEffect } from 'react';
import HostelCard from './HostelCard';

export default function HostelOwnerDashboard({ user, apiUrl }) {
  const [hostels, setHostels] = useState([]);
  const [bookings, setBookings] = useState([]); // New state for bookings
  const [activeTab, setActiveTab] = useState('hostels'); // 'hostels' or 'requests'
  const [showForm, setShowForm] = useState(false);
  const [editingHostel, setEditingHostel] = useState(null);
  const [managingRooms, setManagingRooms] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    city: '',
    address: '',
    description: '',
    main_image_url: '',
    wifi_available: false,
    generator_available: false
  });

  const [roomForm, setRoomForm] = useState({
    room_type: '',
    price_per_month: '',
    total_beds: '',
    has_attached_bath: true
  });

  const fetchHostels = async () => {
    try {
      console.log('🔍 Fetching hostels for owner:', user.user_id || user.id);
      console.log('🔍 URL:', `${apiUrl}/hostels/owner/${user.user_id || user.id}`);

      setLoading(true);
      const response = await fetch(`${apiUrl}/hostels/owner/${user.user_id || user.id}`);

      console.log('📊 Response status:', response.status);
      console.log('📊 Response ok:', response.ok);

      const data = await response.json();
      console.log('📦 Response data:', data);

      if (response.ok && data.success) {
        console.log('✅ Hostels loaded:', data.hostels.length);
        setHostels(data.hostels || []);
      } else {
        console.error('❌ Failed to fetch hostels:', data.message);
        alert('Failed to load hostels: ' + (data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('💥 Error fetching hostels:', error);
      alert('Error loading hostels: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchRooms = async (hostelId) => {
    try {
      console.log('🔍 Fetching rooms for hostel:', hostelId);
      const response = await fetch(`${apiUrl}/rooms/${hostelId}`);
      const data = await response.json();

      console.log('📦 Rooms data:', data);

      if (data.success) {
        console.log('✅ Rooms loaded:', data.rooms.length);
        setRooms(data.rooms || []);
      }
    } catch (error) {
      console.error('💥 Error fetching rooms:', error);
    }
  };

  // Fetch Hostels AND Bookings
  useEffect(() => {
    if (user && apiUrl) {
      fetchData();
    }
  }, [user, apiUrl]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Get Hostels
      const hostelRes = await fetch(`${apiUrl}/hostels/owner/${user.user_id}`);
      const hostelData = await hostelRes.json();
      if (hostelData.success) setHostels(hostelData.hostels);

      // 2. Get Booking Requests
      const bookingRes = await fetch(`${apiUrl}/bookings/owner/${user.user_id}`);
      const bookingData = await bookingRes.json();
      if (bookingData.success) setBookings(bookingData.bookings);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Handle Approve/Reject
  const handleBookingAction = async (bookingId, newStatus) => {
    try {
      const res = await fetch(`${apiUrl}/bookings/${bookingId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchData(); // Refresh list
      } else {
        alert('Error: ' + data.message);
      }
    } catch (err) {
      alert('Action failed');
    }
  };

  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleRoomChange = (e) => {
    const { name, type, checked, value } = e.target;
    setRoomForm({
      ...roomForm,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleImageUpload = async (file) => {
    // 1. Safety Check: If no file selected, stop immediately
    if (!file) return;

    setUploadingImage(true);

    try {
      console.log('📸 Starting Upload for:', file.name);

      // 2. Step 1: Get the Pre-signed URL from your Backend
      const uploadUrlResponse = await fetch(`${apiUrl}/get-upload-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type || 'application/octet-stream' // Fallback to prevent S3 errors
        })
      });

      const data = await uploadUrlResponse.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to get upload URL');
      }

      const { uploadUrl, finalImageUrl } = data;

      // 3. Step 2: Upload directly to S3 (Using the pre-signed URL)
      await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || 'application/octet-stream'
        },
        body: file
      });

      console.log('✅ Image uploaded successfully:', finalImageUrl);

      // 4. Update Form Data (Using "Previous State" to be safe)
      setFormData(prevData => ({
        ...prevData,
        main_image_url: finalImageUrl
      }));

      alert('Image uploaded successfully!');

    } catch (error) {
      console.error('💥 Upload Error:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };
  const handleSubmit = async () => {
    if (!formData.name || !formData.city || !formData.address) {
      alert('Please fill all required fields: Name, City, and Address');
      return;
    }

    try {
      setLoading(true);

      const payload = {
        ...formData,
        owner_id: user.user_id || user.id
      };

      console.log('=== SUBMITTING HOSTEL ===');
      console.log('Method:', editingHostel ? 'PUT' : 'POST');
      console.log('Payload:', payload);

      const url = editingHostel
        ? `${apiUrl}/hostels/${editingHostel.hostel_id}`
        : `${apiUrl}/hostels`;

      const response = await fetch(url, {
        method: editingHostel ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      console.log('📊 Response status:', response.status);
      const data = await response.json();
      console.log('📦 Response data:', data);

      if (response.ok && data.success) {
        console.log('✅ Hostel saved successfully');
        alert(data.message);
        await fetchHostels();
        resetForm();
      } else {
        console.error('❌ Failed to save hostel:', data.message);
        alert('Error: ' + (data.message || 'Failed to save hostel'));
      }
    } catch (error) {
      console.error('💥 Submit error:', error);
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRoom = async () => {
    if (!roomForm.room_type || !roomForm.price_per_month || !roomForm.total_beds) {
      alert('Please fill all room fields: Type, Price, and Total Beds');
      return;
    }

    try {
      console.log('🛏️ Adding room to hostel:', managingRooms.hostel_id);

      const response = await fetch(`${apiUrl}/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...roomForm,
          hostel_id: managingRooms.hostel_id,
          price_per_month: parseFloat(roomForm.price_per_month),
          total_beds: parseInt(roomForm.total_beds)
        })
      });

      const data = await response.json();
      console.log('📦 Room response:', data);

      if (data.success) {
        console.log('✅ Room added');
        alert(data.message);
        await fetchRooms(managingRooms.hostel_id);
        setRoomForm({
          room_type: '',
          price_per_month: '',
          total_beds: '',
          has_attached_bath: true
        });
      } else {
        alert('Error: ' + data.message);
      }
    } catch (error) {
      console.error('💥 Room add error:', error);
      alert('Error: ' + error.message);
    }
  };

  const handleDeleteRoom = async (roomId) => {
    if (!confirm('Delete this room?')) return;

    try {
      console.log('🗑️ Deleting room:', roomId);
      const response = await fetch(`${apiUrl}/rooms/${roomId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      console.log('📦 Delete response:', data);

      if (data.success) {
        console.log('✅ Room deleted');
        alert(data.message);
        await fetchRooms(managingRooms.hostel_id);
      }
    } catch (error) {
      console.error('💥 Delete error:', error);
      alert('Error: ' + error.message);
    }
  };

  const handleEdit = (hostel) => {
    console.log('✏️ Editing hostel:', hostel);
    setEditingHostel(hostel);
    setFormData({
      name: hostel.name,
      city: hostel.city,
      address: hostel.address,
      description: hostel.description || '',
      main_image_url: hostel.main_image_url || '',
      wifi_available: hostel.wifi_available || false,
      generator_available: hostel.generator_available || false
    });
    setShowForm(true);
    setManagingRooms(null);
  };

  const handleManageRooms = (hostel) => {
    console.log('🛏️ Managing rooms for hostel:', hostel.hostel_id);
    setManagingRooms(hostel);
    fetchRooms(hostel.hostel_id);
    setShowForm(false);
    setEditingHostel(null);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this hostel? This will also delete all associated rooms.')) return;

    try {
      console.log('🗑️ Deleting hostel:', id);
      setLoading(true);
      const response = await fetch(`${apiUrl}/hostels/${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      console.log('📦 Delete response:', data);

      if (response.ok && data.success) {
        console.log('✅ Hostel deleted');
        alert(data.message);
        await fetchHostels();
      } else {
        console.error('❌ Delete failed:', data.message);
        alert('Error: ' + (data.message || 'Failed to delete hostel'));
      }
    } catch (error) {
      console.error('💥 Delete error:', error);
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      city: '',
      address: '',
      description: '',
      main_image_url: '',
      wifi_available: false,
      generator_available: false
    });
    setEditingHostel(null);
    setShowForm(false);
  };

  return (
    <div className="container-fluid px-4 py-4">

      {/* --- 1. HEADER & TABS --- */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-5 gap-3">
        <h2 className="fw-bold m-0" style={{ color: '#1a3a5c' }}>
          🏨 Owner Dashboard
        </h2>

        {/* Tab Navigation */}
        <div className="btn-group shadow-sm" role="group" style={{ borderRadius: '25px', overflow: 'hidden' }}>
          <button
            className={`btn fw-bold px-4 py-2 ${activeTab === 'hostels' ? 'btn-primary' : 'bg-white text-secondary'}`}
            onClick={() => setActiveTab('hostels')}
            style={{ border: 'none' }}
          >
            My Hostels
          </button>
          <button
            className={`btn fw-bold px-4 py-2 ${activeTab === 'requests' ? 'btn-primary' : 'bg-white text-secondary'}`}
            onClick={() => setActiveTab('requests')}
            style={{ border: 'none' }}
          >
            Requests
            {bookings.filter(b => b.status === 'pending').length > 0 && (
              <span className="badge bg-danger ms-2 rounded-pill">
                {bookings.filter(b => b.status === 'pending').length}
              </span>
            )}
          </button>
        </div>

        {/* Add Button (Only visible on Hostels tab) */}
        <div style={{ width: '150px', textAlign: 'right' }}>
          {activeTab === 'hostels' && (
            <button
              className="btn btn-lg fw-bold w-100"
              onClick={() => {
                setShowForm(!showForm);
                setManagingRooms(null);
              }}
              style={{
                backgroundColor: '#ff8c42',
                color: 'white',
                border: 'none',
                borderRadius: '25px'
              }}
              disabled={loading}
            >
              {showForm ? '✖️ Cancel' : '➕ Add Hostel'}
            </button>
          )}
        </div>
      </div>

      {/* --- 2. BOOKING REQUESTS VIEW --- */}
      {activeTab === 'requests' && (
        <div className="card shadow-lg border-0" style={{ borderRadius: '15px' }}>
          <div className="card-body p-4">
            <h4 className="fw-bold mb-4" style={{ color: '#1a3a5c' }}>📩 Pending Requests</h4>

            {bookings.length === 0 ? (
              <div className="alert alert-info">No booking requests found.</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>Student Name</th>
                      <th>Contact Info</th>
                      <th>Hostel / Room</th>
                      <th>Requested Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map(booking => (
                      <tr key={booking.booking_id}>
                        <td className="fw-bold">{booking.student_name}</td>
                        <td>
                          <div>📧 {booking.student_email}</div>
                          <div className="small text-muted">📞 {booking.phone_number}</div>
                        </td>
                        <td>
                          <div className="fw-bold">{booking.hostel_name}</div>
                          <div className="badge bg-light text-dark border">{booking.room_type}</div>
                        </td>
                        <td>{new Date(booking.created_at).toLocaleDateString()}</td>
                        <td>
                          <span className={`badge ${booking.status === 'confirmed' ? 'bg-success' :
                            booking.status === 'pending' ? 'bg-warning text-dark' : 'bg-danger'
                            }`}>
                            {booking.status.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          {booking.status === 'pending' && (
                            <div className="d-flex gap-2">
                              <button
                                className="btn btn-sm btn-success rounded-pill px-3"
                                onClick={() => handleBookingAction(booking.booking_id, 'confirmed')}
                              >
                                ✔ Accept
                              </button>
                              <button
                                className="btn btn-sm btn-outline-danger rounded-pill px-3"
                                onClick={() => handleBookingAction(booking.booking_id, 'cancelled')}
                              >
                                ✖ Reject
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- 3. MY HOSTELS VIEW --- */}
      {activeTab === 'hostels' && (
        <>
          {/* Hostel Form */}
          {showForm && (
            <div className="card mb-4 shadow-lg border-0" style={{ borderRadius: '15px' }}>
              <div className="card-body p-4">
                <h5 className="card-title mb-4 fw-bold" style={{ color: '#1a3a5c' }}>
                  {editingHostel ? '✏️ Edit Hostel' : '➕ Add New Hostel'}
                </h5>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label fw-bold">Hostel Name *</label>
                    <input
                      type="text"
                      className="form-control form-control-lg"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      style={{ borderRadius: '10px' }}
                      placeholder="e.g., Green View Hostel"
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold">City *</label>
                    <input
                      type="text"
                      className="form-control form-control-lg"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      placeholder="e.g., Lahore"
                      style={{ borderRadius: '10px' }}
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-bold">Complete Address *</label>
                    <input
                      type="text"
                      className="form-control form-control-lg"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="Full street address"
                      style={{ borderRadius: '10px' }}
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-bold">Description</label>
                    <textarea
                      className="form-control"
                      name="description"
                      rows="3"
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="Describe your hostel..."
                      style={{ borderRadius: '10px' }}
                    />
                  </div>
                  {/* Image Upload */}
                  <div className="col-12">
                    <label className="form-label fw-bold">Hostel Image</label>

                    {/* 1. File Input */}
                    <input
                      type="file"
                      className="form-control form-control-lg"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files[0]) {
                          handleImageUpload(e.target.files[0]);
                        }
                      }}
                      disabled={uploadingImage}
                      style={{ borderRadius: '10px' }}
                      // Clear value so selecting the same file twice works if needed
                      value={""}
                    />

                    {/* 2. Loading State */}
                    {uploadingImage && (
                      <div className="mt-3 text-primary fw-bold">
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Uploading image to Cloud... please wait.
                      </div>
                    )}

                    {/* 3. Image Preview with Remove Button */}
                    {formData.main_image_url && !uploadingImage && (
                      <div className="mt-3 p-3 border rounded bg-light text-center position-relative">
                        <button
                          type="button"
                          className="btn-close position-absolute top-0 end-0 m-2"
                          aria-label="Remove image"
                          onClick={() => {
                            if (confirm("Remove this image?")) {
                              setFormData({ ...formData, main_image_url: '' });
                            }
                          }}
                          title="Remove Image"
                        ></button>

                        <p className="small text-muted mb-2">Current Image:</p>
                        <img
                          src={formData.main_image_url}
                          alt="Hostel Preview"
                          className="img-fluid shadow-sm"
                          style={{ height: '200px', objectFit: 'cover', borderRadius: '10px' }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="col-md-6">
                    <div className="form-check">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        name="wifi_available"
                        checked={formData.wifi_available}
                        onChange={handleChange}
                        id="wifi"
                      />
                      <label className="form-check-label" htmlFor="wifi">
                        📶 WiFi Available
                      </label>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="form-check">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        name="generator_available"
                        checked={formData.generator_available}
                        onChange={handleChange}
                        id="generator"
                      />
                      <label className="form-check-label" htmlFor="generator">
                        ⚡ Generator Available
                      </label>
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <button
                    onClick={handleSubmit}
                    className="btn btn-lg fw-bold me-2"
                    style={{
                      backgroundColor: '#1a3a5c',
                      color: 'white',
                      border: 'none',
                      borderRadius: '25px'
                    }}
                    disabled={loading || uploadingImage}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Processing...
                      </>
                    ) : (
                      (editingHostel ? '💾 Update' : '➕ Add') + ' Hostel'
                    )}
                  </button>
                  <button
                    onClick={resetForm}
                    className="btn btn-lg btn-secondary"
                    disabled={loading}
                    style={{ borderRadius: '25px' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Room Management */}
          {managingRooms && (
            <div className="card mb-4 shadow-lg border-0" style={{ borderRadius: '15px' }}>
              <div className="card-body p-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h5 className="fw-bold mb-0" style={{ color: '#1a3a5c' }}>
                    🛏️ Rooms for {managingRooms.name}
                  </h5>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setManagingRooms(null)}
                    style={{ borderRadius: '25px' }}
                  >
                    Close
                  </button>
                </div>

                {/* Add Room Form */}
                <div className="card mb-3" style={{ backgroundColor: '#f8f9fa', borderRadius: '10px' }}>
                  <div className="card-body">
                    <h6 className="fw-bold mb-3">Add New Room</h6>
                    <div className="row g-3">
                      <div className="col-md-3">
                        <input
                          type="text"
                          className="form-control"
                          name="room_type"
                          value={roomForm.room_type}
                          onChange={handleRoomChange}
                          placeholder="Room Type (e.g., Single)"
                          style={{ borderRadius: '10px' }}
                        />
                      </div>
                      <div className="col-md-3">
                        <input
                          type="number"
                          className="form-control"
                          name="price_per_month"
                          value={roomForm.price_per_month}
                          onChange={handleRoomChange}
                          placeholder="Price/Month"
                          style={{ borderRadius: '10px' }}
                        />
                      </div>
                      <div className="col-md-2">
                        <input
                          type="number"
                          className="form-control"
                          name="total_beds"
                          value={roomForm.total_beds}
                          onChange={handleRoomChange}
                          placeholder="Total Beds"
                          style={{ borderRadius: '10px' }}
                        />
                      </div>
                      <div className="col-md-2">
                        <div className="form-check mt-2">
                          <input
                            type="checkbox"
                            className="form-check-input"
                            name="has_attached_bath"
                            checked={roomForm.has_attached_bath}
                            onChange={handleRoomChange}
                            id="attached_bath"
                          />
                          <label className="form-check-label" htmlFor="attached_bath">
                            Attached Bath
                          </label>
                        </div>
                      </div>
                      <div className="col-md-2">
                        <button
                          onClick={handleAddRoom}
                          className="btn w-100"
                          style={{
                            backgroundColor: '#ff8c42',
                            color: 'white',
                            border: 'none',
                            borderRadius: '10px'
                          }}
                        >
                          Add Room
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Rooms List */}
                {rooms.length === 0 ? (
                  <div className="alert alert-info">No rooms added yet. Add your first room above!</div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead style={{ backgroundColor: '#f8f9fa' }}>
                        <tr>
                          <th>Room Type</th>
                          <th>Price/Month</th>
                          <th>Total Beds</th>
                          <th>Available Beds</th>
                          <th>Attached Bath</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rooms.map(room => (
                          <tr key={room.room_id}>
                            <td className="fw-bold">{room.room_type}</td>
                            <td>Rs. {room.price_per_month}</td>
                            <td>{room.total_beds}</td>
                            <td>
                              <span className={`badge ${room.available_beds > 0 ? 'bg-success' : 'bg-danger'}`}>
                                {room.available_beds}
                              </span>
                            </td>
                            <td>{room.has_attached_bath ? '✅' : '❌'}</td>
                            <td>
                              <button
                                onClick={() => handleDeleteRoom(room.room_id)}
                                className="btn btn-sm btn-outline-danger"
                                style={{ borderRadius: '20px' }}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Hostels List */}
          {loading && !showForm && !managingRooms ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-3 text-muted">Loading hostels...</p>
            </div>
          ) : !showForm && !managingRooms && hostels.length === 0 ? (
            <div className="alert alert-info" style={{ borderRadius: '15px' }}>
              <h5 className="alert-heading">No Hostels Yet</h5>
              <p className="mb-0">You haven't added any hostels yet. Click "Add Hostel" to get started!</p>
            </div>
          ) : !showForm && !managingRooms && (
            <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
              {hostels.map(hostel => (
                <HostelCard
                  key={hostel.hostel_id}
                  hostel={hostel}
                  onEdit={() => handleEdit(hostel)}
                  onDelete={() => handleDelete(hostel.hostel_id)}
                  onManageRooms={() => handleManageRooms(hostel)}
                  showActions={true}
                />
              ))}
            </div>
          )}
        </>
      )}

    </div>
  );
}