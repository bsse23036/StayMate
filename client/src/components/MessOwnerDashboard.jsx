// src/components/MessOwnerDashboard.jsx
import { useState, useEffect } from 'react';
import MessCard from './MessCard';

export default function MessOwnerDashboard({ user, apiUrl }) {
  const [messes, setMesses] = useState([]);
  const [requests, setRequests] = useState([]); // For subscription requests
  const [activeTab, setActiveTab] = useState('messes'); // 'messes' or 'requests'
  const [showForm, setShowForm] = useState(false);
  const [editingMess, setEditingMess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    city: '',
    monthly_price: '',
    delivery_radius_km: '',
    main_image_url: '' // Changed to match DB column
  });

  // Fetch Data
  useEffect(() => {
    if (apiUrl && user) {
      fetchData();
    }
  }, [apiUrl, user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Messes
      const messRes = await fetch(`${apiUrl}/messes/owner/${user.user_id || user.id}`);
      const messData = await messRes.json();
      if (messData.success) setMesses(messData.messes || []);

      // 2. Fetch Requests (Placeholder - Backend needs a specific route for Mess Requests)
      // If you added a route like /mess-subscriptions/owner/:id, fetch it here.
      // For now, we initialize it as empty to keep UI consistent.
      setRequests([]); 

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // --- IMAGE UPLOAD LOGIC ---
  const handleImageUpload = async (file) => {
    if (!file) return;
    setUploadingImage(true);

    try {
      // 1. Get URL
      const uploadUrlResponse = await fetch(`${apiUrl}/get-upload-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type || 'application/octet-stream'
        })
      });
      const data = await uploadUrlResponse.json();
      if (!data.success) throw new Error(data.error);

      // 2. Upload to S3
      await fetch(data.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file
      });

      // 3. Set State
      setFormData(prev => ({ ...prev, main_image_url: data.finalImageUrl }));
      alert('Image uploaded successfully!');

    } catch (error) {
      alert('Upload failed: ' + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  // --- SUBMIT LOGIC ---
  const handleSubmit = async () => {
    if (!formData.name || !formData.city || !formData.monthly_price) {
      alert('Please fill required fields (Name, City, Price)');
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

      const url = editingMess ? `${apiUrl}/messes/${editingMess.mess_id}` : `${apiUrl}/messes`;
      const method = editingMess ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success) {
        alert(data.message);
        fetchData();
        resetForm();
      } else {
        alert('Error: ' + data.message);
      }
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this mess service?')) return;
    try {
      const response = await fetch(`${apiUrl}/messes/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        fetchData();
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleEdit = (mess) => {
    setEditingMess(mess);
    setFormData({
      name: mess.name,
      city: mess.city,
      monthly_price: mess.monthly_price,
      delivery_radius_km: mess.delivery_radius_km || '',
      main_image_url: mess.main_image_url || mess.image_url || '' // Handle both cases
    });
    setShowForm(true);
    setActiveTab('messes');
  };

  const resetForm = () => {
    setFormData({ name: '', city: '', monthly_price: '', delivery_radius_km: '', main_image_url: '' });
    setEditingMess(null);
    setShowForm(false);
  };

  return (
    <div className="container-fluid px-4 py-4">

      {/* --- 1. HEADER & TABS --- */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-5 gap-3">
        <h2 className="fw-bold m-0" style={{ color: '#1a3a5c' }}>
          🍽️ Mess Owner Dashboard
        </h2>

       

        {/* Add Button */}
        <div style={{ width: '180px', textAlign: 'right' }}> 
          {activeTab === 'messes' && (
            <button
              className="btn btn-lg fw-bold w-100"
              onClick={() => setShowForm(!showForm)}
              style={{
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '25px'
              }}
              disabled={loading}
            >
              {showForm ? '✖️ Cancel' : '➕ Add Mess'}
            </button>
          )}
        </div>
      </div>


      {/* --- 3. MY MESSES TAB --- */}
      {activeTab === 'messes' && (
        <>
            {/* FORM SECTION */}
            {showForm && (
                <div className="card mb-4 shadow-lg border-0" style={{ borderRadius: '15px' }}>
                    <div className="card-body p-4">
                        <h5 className="card-title mb-4 fw-bold" style={{ color: '#1a3a5c' }}>
                            {editingMess ? '✏️ Edit Mess Service' : '➕ Add New Mess Service'}
                        </h5>
                        <div className="row g-3">
                            <div className="col-md-6">
                                <label className="form-label fw-bold">Mess Name *</label>
                                <input type="text" className="form-control form-control-lg" name="name" value={formData.name} onChange={handleChange} style={{ borderRadius: '10px' }} placeholder="e.g., Al-Kareem Mess" />
                            </div>
                            <div className="col-md-6">
                                <label className="form-label fw-bold">City *</label>
                                <input type="text" className="form-control form-control-lg" name="city" value={formData.city} onChange={handleChange} style={{ borderRadius: '10px' }} placeholder="e.g., Lahore" />
                            </div>
                            <div className="col-md-6">
                                <label className="form-label fw-bold">Monthly Price (Rs) *</label>
                                <input type="number" className="form-control form-control-lg" name="monthly_price" value={formData.monthly_price} onChange={handleChange} style={{ borderRadius: '10px' }} placeholder="5000" />
                            </div>
                            <div className="col-md-6">
                                <label className="form-label fw-bold">Delivery Radius (km)</label>
                                <input type="number" step="0.1" className="form-control form-control-lg" name="delivery_radius_km" value={formData.delivery_radius_km} onChange={handleChange} style={{ borderRadius: '10px' }} placeholder="2.5" />
                            </div>

                            {/* --- IMAGE UPLOAD START --- */}
                            <div className="col-12">
                                <label className="form-label fw-bold">Mess Image</label>
                                <input 
                                    type="file" 
                                    className="form-control form-control-lg" 
                                    accept="image/*"
                                    onChange={(e) => { if(e.target.files[0]) handleImageUpload(e.target.files[0]) }}
                                    disabled={uploadingImage}
                                    style={{ borderRadius: '10px' }}
                                    value={""}
                                />
                                {uploadingImage && <div className="mt-2 text-primary fw-bold">Uploading...</div>}
                                
                                {formData.main_image_url && !uploadingImage && (
                                    <div className="mt-3 p-3 border rounded bg-light text-center position-relative">
                                        <button 
                                            type="button" 
                                            className="btn-close position-absolute top-0 end-0 m-2"
                                            onClick={() => { if(confirm("Remove image?")) setFormData({...formData, main_image_url: ''}) }}
                                        ></button>
                                        <p className="small text-muted mb-2">Current Image:</p>
                                        <img src={formData.main_image_url} alt="Preview" className="img-fluid shadow-sm" style={{ height: '200px', objectFit: 'cover', borderRadius: '10px' }} />
                                    </div>
                                )}
                            </div>
                            {/* --- IMAGE UPLOAD END --- */}
                        </div>

                        <div className="mt-4">
                            <button onClick={handleSubmit} className="btn btn-lg fw-bold me-2" style={{ backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '25px' }} disabled={loading || uploadingImage}>
                                {loading ? 'Processing...' : (editingMess ? '💾 Update' : '➕ Add') + ' Mess'}
                            </button>
                            <button onClick={resetForm} className="btn btn-lg btn-secondary" disabled={loading} style={{ borderRadius: '25px' }}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* LIST SECTION */}
            {!showForm && messes.length === 0 ? (
                <div className="alert alert-info" style={{ borderRadius: '15px' }}>No Mess Services Yet. Add one!</div>
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
        </>
      )}

    </div>
  );
}