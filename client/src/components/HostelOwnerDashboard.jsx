// src/components/HostelOwnerDashboard.jsx
import { useState, useEffect } from 'react';
import HostelCard from './HostelCard';

export default function HostelOwnerDashboard({ user, useMockData }) {
  const [hostels, setHostels] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingHostel, setEditingHostel] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    location: '',
    description: '',
    image_url: ''
  });

  const fetchHostels = async () => {
    if (useMockData) {
      const stored = localStorage.getItem(`hostels_${user.id}`);
      setHostels(stored ? JSON.parse(stored) : []);
    } else {
      try {
        const response = await fetch(`http://localhost:3000/api/hostels/owner/${user.id}`);
        setHostels(await response.json());
      } catch (error) {
        console.error('Error fetching hostels:', error);
      }
    }
  };

  useEffect(() => {
    fetchHostels();
  }, [useMockData]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (useMockData) {
      const timestamp = new Date().getTime();
      const newHostel = {
        id: editingHostel?.id || timestamp,
        ...formData,
        price: parseInt(formData.price),
        owner_id: user.id,
        created_at: new Date().toISOString()
      };

      let updatedHostels;
      if (editingHostel) {
        updatedHostels = hostels.map(h => h.id === editingHostel.id ? newHostel : h);
      } else {
        updatedHostels = [...hostels, newHostel];
      }

      localStorage.setItem(`hostels_${user.id}`, JSON.stringify(updatedHostels));
      setHostels(updatedHostels);
      resetForm();
      alert(editingHostel ? 'Hostel updated!' : 'Hostel added!');
    } else {
      try {
        const url = editingHostel 
          ? `http://localhost:3000/api/hostels/${editingHostel.id}`
          : 'http://localhost:3000/api/hostels';
        
        const response = await fetch(url, {
          method: editingHostel ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            owner_id: user.id,
            price: parseInt(formData.price)
          })
        });

        if (response.ok) {
          fetchHostels();
          resetForm();
          alert(editingHostel ? 'Hostel updated!' : 'Hostel added!');
        }
      } catch (error) {
        alert('Error: ' + error.message);
      }
    }
  };

  const handleEdit = (hostel) => {
    setEditingHostel(hostel);
    setFormData({
      name: hostel.name,
      price: hostel.price,
      location: hostel.location,
      description: hostel.description || '',
      image_url: hostel.image_url || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this hostel?')) return;

    if (useMockData) {
      const updatedHostels = hostels.filter(h => h.id !== id);
      localStorage.setItem(`hostels_${user.id}`, JSON.stringify(updatedHostels));
      setHostels(updatedHostels);
      alert('Hostel deleted!');
    } else {
      try {
        const response = await fetch(`http://localhost:3000/api/hostels/${id}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          fetchHostels();
          alert('Hostel deleted!');
        }
      } catch (error) {
        alert('Error: ' + error.message);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      price: '',
      location: '',
      description: '',
      image_url: ''
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
            <form onSubmit={handleSubmit}>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label fw-bold">Hostel Name</label>
                  <input
                    type="text"
                    className="form-control form-control-lg"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-bold">Price (Rs/month)</label>
                  <input
                    type="number"
                    className="form-control form-control-lg"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="col-12">
                  <label className="form-label fw-bold">Location</label>
                  <input
                    type="text"
                    className="form-control form-control-lg"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    required
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
                  />
                </div>
                <div className="col-12">
                  <label className="form-label fw-bold">Image URL</label>
                  <input
                    type="url"
                    className="form-control form-control-lg"
                    name="image_url"
                    value={formData.image_url}
                    onChange={handleChange}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
              </div>
              <div className="mt-4">
                <button type="submit" className="btn btn-lg text-white fw-bold me-2" style={{ backgroundColor: '#1a3a5c' }}>
                  {editingHostel ? '💾 Update' : '➕ Add'} Hostel
                </button>
                <button 
                  type="button" 
                  className="btn btn-lg btn-secondary"
                  onClick={resetForm}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {hostels.length === 0 ? (
        <div className="alert alert-info alert-lg">
          You haven't added any hostels yet. Click "Add Hostel" to get started!
        </div>
      ) : (
        <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
          {hostels.map(hostel => (
            <HostelCard
              key={hostel.id}
              hostel={hostel}
              onEdit={() => handleEdit(hostel)}
              onDelete={() => handleDelete(hostel.id)}
              showActions={true}
            />
          ))}
        </div>
      )}
    </div>
  );
}