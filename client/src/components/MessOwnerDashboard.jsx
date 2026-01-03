// src/components/MessOwnerDashboard.jsx
import { useState, useEffect } from 'react';
import MessCard from './MessCard';
import ImageUpload from './ImageUpload';

export default function MessOwnerDashboard({ user, apiUrl }) {
  const [messes, setMesses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingMess, setEditingMess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    city: '',
    monthly_price: '',
    delivery_radius_km: '',
    image_url: ''
  });

  const fetchMesses = async () => {
    try {
      console.log('🔍 Fetching messes for owner:', user.user_id || user.id);
      console.log('🔍 URL:', `${apiUrl}/messes/owner/${user.user_id || user.id}`);
      
      setLoading(true);
      const response = await fetch(`${apiUrl}/messes/owner/${user.user_id || user.id}`);
      
      console.log('📊 Response status:', response.status);
      console.log('📊 Response ok:', response.ok);
      
      const data = await response.json();
      console.log('📦 Response data:', data);
      
      if (response.ok && data.success) {
        console.log('✅ Messes loaded:', data.messes.length);
        setMesses(data.messes || []);
      } else {
        console.error('❌ Failed to fetch messes:', data.message);
        alert('Failed to load mess services: ' + (data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('💥 Error fetching messes:', error);
      alert('Error loading messes: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (apiUrl && user) {
      fetchMesses();
    }
  }, [apiUrl, user]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleImageUpload = async (file) => {
    setUploadingImage(true);
    try {
      console.log('📸 Uploading image:', file.name);
      
      const uploadUrlResponse = await fetch(`${apiUrl}/get-upload-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type
        })
      });

      const data = await uploadUrlResponse.json();
      console.log('📸 Upload URL response:', data);
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to get upload URL');
      }

      const { uploadUrl, finalImageUrl } = data;

      console.log('📸 Uploading to S3...');
      await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file
      });

      console.log('✅ Image uploaded:', finalImageUrl);
      setFormData({ ...formData, image_url: finalImageUrl });
      alert('Image uploaded successfully!');
    } catch (error) {
      console.error('💥 Image upload error:', error);
      alert('Failed to upload image: ' + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (!formData.name || !formData.city || !formData.monthly_price) {
      alert('Please fill all required fields: Name, City, and Monthly Price');
      return;
    }

    try {
      setLoading(true);
      
      const payload = {
        ...formData,
        owner_id: user.user_id || user.id,
        monthly_price: parseFloat(formData.monthly_price),
        delivery_radius_km: formData.delivery_radius_km ? parseFloat(formData.delivery_radius_km) : null
      };

      console.log('=== SUBMITTING MESS ===');
      console.log('Method:', editingMess ? 'PUT' : 'POST');
      console.log('URL:', editingMess ? `${apiUrl}/messes/${editingMess.mess_id}` : `${apiUrl}/messes`);
      console.log('Payload:', payload);

      const url = editingMess 
        ? `${apiUrl}/messes/${editingMess.mess_id}`
        : `${apiUrl}/messes`;
      
      const response = await fetch(url, {
        method: editingMess ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      console.log('📊 Response status:', response.status);
      console.log('📊 Response ok:', response.ok);

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      console.log('📊 Content-Type:', contentType);

      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('❌ Received HTML instead of JSON:', text.substring(0, 200));
        throw new Error('Server returned HTML instead of JSON. The API endpoint may not exist. Please check Lambda deployment.');
      }

      const data = await response.json();
      console.log('📦 Response data:', data);

      if (response.ok && data.success) {
        console.log('✅ Mess saved successfully');
        alert(data.message);
        await fetchMesses(); // Refresh the list
        resetForm();
      } else {
        console.error('❌ Failed to save mess:', data.message);
        alert('Error: ' + (data.message || 'Failed to save mess service'));
      }
    } catch (error) {
      console.error('💥 Submit error:', error);
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (mess) => {
    console.log('✏️ Editing mess:', mess);
    setEditingMess(mess);
    setFormData({
      name: mess.name,
      city: mess.city,
      monthly_price: mess.monthly_price,
      delivery_radius_km: mess.delivery_radius_km || '',
      image_url: mess.image_url || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this mess service?')) return;

    try {
      console.log('🗑️ Deleting mess:', id);
      setLoading(true);
      
      const response = await fetch(`${apiUrl}/messes/${id}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      console.log('📦 Delete response:', data);
      
      if (response.ok && data.success) {
        console.log('✅ Mess deleted');
        alert(data.message);
        await fetchMesses(); // Refresh the list
      } else {
        console.error('❌ Failed to delete:', data.message);
        alert('Error: ' + (data.message || 'Failed to delete mess service'));
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
      monthly_price: '',
      delivery_radius_km: '',
      image_url: ''
    });
    setEditingMess(null);
    setShowForm(false);
  };

  return (
    <div className="container-fluid px-4 py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold" style={{ color: '#1a3a5c' }}>
          🍽️ My Mess Services
        </h2>
        <button 
          className="btn btn-lg fw-bold"
          onClick={() => setShowForm(!showForm)}
          style={{ 
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '25px'
          }}
          disabled={loading}
        >
          {showForm ? '✖️ Cancel' : '➕ Add Mess Service'}
        </button>
      </div>

      {showForm && (
        <div className="card mb-4 shadow-lg border-0" style={{ borderRadius: '15px' }}>
          <div className="card-body p-4">
            <h5 className="card-title mb-4 fw-bold" style={{ color: '#1a3a5c' }}>
              {editingMess ? '✏️ Edit Mess Service' : '➕ Add New Mess Service'}
            </h5>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label fw-bold">Mess Name *</label>
                <input
                  type="text"
                  className="form-control form-control-lg"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  style={{ borderRadius: '10px' }}
                  placeholder="e.g., Al-Kareem Mess"
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
              <div className="col-md-6">
                <label className="form-label fw-bold">Monthly Price (Rs) *</label>
                <input
                  type="number"
                  className="form-control form-control-lg"
                  name="monthly_price"
                  value={formData.monthly_price}
                  onChange={handleChange}
                  style={{ borderRadius: '10px' }}
                  placeholder="e.g., 5000"
                />
              </div>
              <div className="col-md-6">
                <label className="form-label fw-bold">Delivery Radius (km)</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-control form-control-lg"
                  name="delivery_radius_km"
                  value={formData.delivery_radius_km}
                  onChange={handleChange}
                  placeholder="e.g., 2.5"
                  style={{ borderRadius: '10px' }}
                />
              </div>
              <div className="col-12">
                <label className="form-label fw-bold">Mess Service Image</label>
                <ImageUpload 
                  onImageSelect={handleImageUpload}
                  currentImageUrl={formData.image_url}
                  loading={uploadingImage}
                />
              </div>
            </div>
            <div className="mt-4">
              <button 
                onClick={handleSubmit}
                className="btn btn-lg fw-bold me-2"
                style={{ 
                  backgroundColor: '#28a745',
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
                  (editingMess ? '💾 Update' : '➕ Add') + ' Mess Service'
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

      {loading && !showForm ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3 text-muted">Loading mess services...</p>
        </div>
      ) : !showForm && messes.length === 0 ? (
        <div className="alert alert-info" style={{ borderRadius: '15px' }}>
          <h5 className="alert-heading">No Mess Services Yet</h5>
          <p className="mb-0">You haven't added any mess services yet. Click "Add Mess Service" to get started!</p>
        </div>
      ) : !showForm && (
        <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
          {messes.map(mess => (
            <MessCard
              key={mess.mess_id}
              mess={mess}
              onEdit={() => handleEdit(mess)}
              onDelete={() => handleDelete(mess.mess_id)}
              showActions={true}
            />
          ))}
        </div>
      )}
    </div>
  );
}