// src/components/MessOwnerDashboard.jsx
import { useState, useEffect } from 'react';
import MessCard from './MessCard';

export default function MessOwnerDashboard({ user, useMockData }) {
  const [messes, setMesses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingMess, setEditingMess] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    location: '',
    menu_description: '',
    image_url: ''
  });

  const fetchMesses = async () => {
    if (useMockData) {
      const stored = localStorage.getItem(`messes_${user.id}`);
      setMesses(stored ? JSON.parse(stored) : []);
    } else {
      try {
        const response = await fetch(`http://localhost:3000/api/messes/owner/${user.id}`);
        setMesses(await response.json());
      } catch (error) {
        console.error('Error fetching messes:', error);
      }
    }
  };

  useEffect(() => {
    fetchMesses();
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
      const newMess = {
        id: editingMess?.id || timestamp,
        ...formData,
        price: parseInt(formData.price),
        owner_id: user.id,
        created_at: new Date().toISOString()
      };

      let updatedMesses;
      if (editingMess) {
        updatedMesses = messes.map(m => m.id === editingMess.id ? newMess : m);
      } else {
        updatedMesses = [...messes, newMess];
      }

      localStorage.setItem(`messes_${user.id}`, JSON.stringify(updatedMesses));
      setMesses(updatedMesses);
      resetForm();
      alert(editingMess ? 'Mess updated!' : 'Mess added!');
    } else {
      try {
        const url = editingMess 
          ? `http://localhost:3000/api/messes/${editingMess.id}`
          : 'http://localhost:3000/api/messes';
        
        const response = await fetch(url, {
          method: editingMess ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            owner_id: user.id,
            price: parseInt(formData.price)
          })
        });

        if (response.ok) {
          fetchMesses();
          resetForm();
          alert(editingMess ? 'Mess updated!' : 'Mess added!');
        }
      } catch (error) {
        alert('Error: ' + error.message);
      }
    }
  };

  const handleEdit = (mess) => {
    setEditingMess(mess);
    setFormData({
      name: mess.name,
      price: mess.price,
      location: mess.location,
      menu_description: mess.menu_description || '',
      image_url: mess.image_url || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this mess service?')) return;

    if (useMockData) {
      const updatedMesses = messes.filter(m => m.id !== id);
      localStorage.setItem(`messes_${user.id}`, JSON.stringify(updatedMesses));
      setMesses(updatedMesses);
      alert('Mess deleted!');
    } else {
      try {
        const response = await fetch(`http://localhost:3000/api/messes/${id}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          fetchMesses();
          alert('Mess deleted!');
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
      menu_description: '',
      image_url: ''
    });
    setEditingMess(null);
    setShowForm(false);
  };

  return (
    <div className="container-fluid px-4 py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold" style={{ color: '#1a3a5c' }}>🍽️ My Mess Services</h2>
        <button 
          className="btn btn-lg btn-success fw-bold"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? '✖️ Cancel' : '➕ Add Mess'}
        </button>
      </div>

      {showForm && (
        <div className="card mb-4 shadow border-0">
          <div className="card-body p-4">
            <h5 className="card-title mb-4 fw-bold" style={{ color: '#1a3a5c' }}>
              {editingMess ? '✏️ Edit Mess Service' : '➕ Add New Mess Service'}
            </h5>
            <form onSubmit={handleSubmit}>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label fw-bold">Mess Name</label>
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
                  <label className="form-label fw-bold">Menu Description</label>
                  <textarea
                    className="form-control"
                    name="menu_description"
                    rows="3"
                    value={formData.menu_description}
                    onChange={handleChange}
                    placeholder="E.g., Mon: Biryani, Tue: Daal Chawal, Wed: Chicken Karahi..."
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
                <button type="submit" className="btn btn-lg btn-success fw-bold me-2">
                  {editingMess ? '💾 Update' : '➕ Add'} Mess
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

      {messes.length === 0 ? (
        <div className="alert alert-info alert-lg">
          You haven't added any mess services yet. Click "Add Mess" to get started!
        </div>
      ) : (
        <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
          {messes.map(mess => (
            <MessCard
              key={mess.id}
              mess={mess}
              onEdit={() => handleEdit(mess)}
              onDelete={() => handleDelete(mess.id)}
              showActions={true}
            />
          ))}
        </div>
      )}
    </div>
  );
}