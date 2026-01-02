// src/components/HostelOwnerDashboard.jsx
import { useState, useEffect } from 'react';
import HostelCard from './HostelCard';
import ImageUpload from './ImageUpload';

export default function HostelOwnerDashboard({ user, apiUrl }) {
  const [hostels, setHostels] = useState([]);
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
      setLoading(true);
      const response = await fetch(`${apiUrl}/hostels/owner/${user.user_id || user.id}`);
      const data = await response.json();
      
      if (data.success) {
        setHostels(data.hostels || []);
      }
    } catch (error) {
      console.error('Error fetching hostels:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRooms = async (hostelId) => {
    try {
      const response = await fetch(`${apiUrl}/rooms/${hostelId}`);
      const data = await response.json();
      if (data.success) {
        setRooms(data.rooms || []);
      }
    } catch (error) {
      console.error('Error fetching rooms:', error);
    }
  };

  useEffect(() => {
    if (apiUrl && user) {
      fetchHostels();
    }
  }, [apiUrl, user]);

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
    setUploadingImage(true);
    try {
      const uploadUrlResponse = await fetch(`${apiUrl}/get-upload-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type
        })
      });

      const { uploadUrl, finalImageUrl } = await uploadUrlResponse.json();

      await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file
      });

      setFormData({ ...formData, main_image_url: finalImageUrl });
      alert('Image uploaded successfully!');
    } catch (error) {
      console.error('Image upload error:', error);
      alert('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.city || !formData.address) {
      alert('Please fill all required fields');
      return;
    }

    try {
      setLoading(true);
      
      const payload = {
        ...formData,
        owner_id: user.user_id || user.id
      };

      const url = editingHostel 
        ? `${apiUrl}/hostels/${editingHostel.hostel_id}`
        : `${apiUrl}/hostels`;
      
      const response = await fetch(url, {
        method: editingHostel ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success) {
        alert(data.message);
        fetchHostels();
        resetForm();
      } else {
        alert('Error: ' + data.message);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRoom = async () => {
    if (!roomForm.room_type || !roomForm.price_per_month || !roomForm.total_beds) {
      alert('Please fill all room fields');
      return;
    }

    try {
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
      if (data.success) {
        alert(data.message);
        fetchRooms(managingRooms.hostel_id);
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
      console.error('Error:', error);
      alert('Error: ' + error.message);
    }
  };

  const handleDeleteRoom = async (roomId) => {
    if (!confirm('Delete this room?')) return;

    try {
      const response = await fetch(`${apiUrl}/rooms/${roomId}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      if (data.success) {
        alert(data.message);
        fetchRooms(managingRooms.hostel_id);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error: ' + error.message);
    }
  };

  const handleEdit = (hostel) => {
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
    setManagingRooms(hostel);
    fetchRooms(hostel.hostel_id);
    setShowForm(false);
    setEditingHostel(null);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this hostel? This will also delete all associated rooms.')) return;

    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/hostels/${id}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert(data.message);
        fetchHostels();
      } else {
        alert('Error: ' + data.message);
      }
    } catch (error) {
      console.error('Error:', error);
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
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold" style={{ color: '#1a3a5c' }}>
          🏨 My Hostels
        </h2>
        <button 
          className="btn btn-lg fw-bold"
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
      </div>

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
              <div className="col-12">
                <label className="form-label fw-bold">Hostel Image</label>
                <ImageUpload 
                  onImageSelect={handleImageUpload}
                  currentImageUrl={formData.main_image_url}
                  loading={uploadingImage}
                />
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
                {loading ? '⏳ Processing...' : (editingHostel ? '💾 Update' : '➕ Add') + ' Hostel'}
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
              <div className="alert alert-info">No rooms added yet</div>
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
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : !showForm && !managingRooms && hostels.length === 0 ? (
        <div className="alert alert-info alert-lg">
          You haven't added any hostels yet. Click "Add Hostel" to get started!
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
    </div>
  );
}