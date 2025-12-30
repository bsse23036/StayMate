// src/components/HostelOwnerDashboard.jsx
import { useState, useEffect } from 'react';
import HostelCard from './HostelCard';

export default function HostelOwnerDashboard({ user, apiUrl }) {
  const [hostels, setHostels] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingHostel, setEditingHostel] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    city: '',
    address: '',
    description: '',
    main_image_url: '',
    wifi_available: false,
    generator_available: false,
    price_per_month: ''
  });

  const fetchHostels = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/hostels/owner/${user.user_id || user.id}`);
      const data = await response.json();
      
      if (response.ok) {
        setHostels(Array.isArray(data) ? data : data.hostels || []);
      } else {
        console.error('Failed to fetch hostels:', data);
      }
    } catch (error) {
      console.error('Error fetching hostels:', error);
      alert('Failed to load your hostels');
    } finally {
      setLoading(false);
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

  const handleSubmit = async () => {
    if (!formData.name || !formData.city || !formData.address || !formData.price_per_month) {
      alert('Please fill all required fields');
      return;
    }

    try {
      setLoading(true);
      
      const payload = {
        ...formData,
        owner_id: user.user_id || user.id,
        price_per_month: parseFloat(formData.price_per_month)
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

      if (response.ok && data.success) {
        alert(editingHostel ? 'Hostel updated!' : 'Hostel added!');
        fetchHostels();
        resetForm();
      } else {
        alert('Error: ' + (data.message || 'Operation failed'));
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
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
      generator_available: hostel.generator_available || false,
      price_per_month: hostel.price_per_month
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this hostel?')) return;

    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/hostels/${id}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        alert('Hostel deleted!');
        fetchHostels();
      } else {
        alert('Error: ' + (data.message || 'Delete failed'));
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
      generator_available: false,
      price_per_month: ''
    });
    setEditingHostel(null);
    setShowForm(false);
  };

  return (
    <div className="container-fluid px-4 py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold" style={{ color: '#1a3a5c' }}>🏨 My Hostels</h2>
        <button 
          className="btn btn-lg text-white fw-bold"
          onClick={() => setShowForm(!showForm)}
          style={{ backgroundColor: '#ff8c42' }}
          disabled={loading}
        >
          {showForm ? '✖️ Cancel' : '➕ Add Hostel'}
        </button>
      </div>

      {showForm && (
        <div className="card mb-4 shadow border-0">
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
                />
              </div>
              <div className="col-md-6">
                <label className="form-label fw-bold">Price per Month (Rs) *</label>
                <input
                  type="number"
                  className="form-control form-control-lg"
                  name="price_per_month"
                  value={formData.price_per_month}
                  onChange={handleChange}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label fw-bold">Main Image URL</label>
                <input
                  type="url"
                  className="form-control form-control-lg"
                  name="main_image_url"
                  value={formData.main_image_url}
                  onChange={handleChange}
                  placeholder="https://example.com/image.jpg"
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
                className="btn btn-lg text-white fw-bold me-2" 
                style={{ backgroundColor: '#1a3a5c' }}
                disabled={loading}
              >
                {loading ? '⏳ Processing...' : (editingHostel ? '💾 Update' : '➕ Add') + ' Hostel'}
              </button>
              <button 
                onClick={resetForm}
                className="btn btn-lg btn-secondary"
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && !showForm ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : hostels.length === 0 ? (
        <div className="alert alert-info alert-lg">
          You haven't added any hostels yet. Click "Add Hostel" to get started!
        </div>
      ) : (
        <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
          {hostels.map(hostel => (
            <HostelCard
              key={hostel.hostel_id}
              hostel={hostel}
              onEdit={() => handleEdit(hostel)}
              onDelete={() => handleDelete(hostel.hostel_id)}
              showActions={true}
            />
          ))}
        </div>
      )}
    </div>
  );
}