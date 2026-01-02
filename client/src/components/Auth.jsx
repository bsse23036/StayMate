// src/components/Auth.jsx
import { useState } from 'react';

export default function Auth({ onLogin, apiUrl }) {
  const [isLogin, setIsLogin] = useState(true);
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    phone_number: '',
    role: 'student' 
  });
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isLogin ? '/login' : '/register';
      const fullUrl = `${apiUrl}${endpoint}`;
      
      console.log("Connecting to:", fullUrl);

      const payload = isLogin 
        ? { email: formData.email, password: formData.password }
        : formData;

      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      console.log("Response:", data);

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Authentication failed');
      }

      // Success - call parent callback
      onLogin(data.user);

    } catch (err) {
      console.error("Auth Error:", err);
      setError(err.message || "Failed to connect to server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-5" style={{ maxWidth: '1200px' }}>
      <div className="row justify-content-center">
        <div className="col-md-8 col-lg-6">
          <div className="card shadow-lg border-0" style={{ borderRadius: '20px' }}>
            <div className="card-body p-5">
              <div className="text-center mb-4">
                <img 
                  src="/logo.png" 
                  alt="StayMate Logo" 
                  style={{ width: '80px', height: '80px', marginBottom: '20px' }}
                />
                <h3 className="fw-bold" style={{ color: '#1a3a5c' }}>
                  {isLogin ? '👋 Welcome Back' : '📝 Create Account'}
                </h3>
                <p className="text-muted">
                  {isLogin ? 'Login to continue' : 'Join StayMate today'}
                </p>
              </div>

              {error && (
                <div className="alert alert-danger" role="alert" style={{ borderRadius: '10px' }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {!isLogin && (
                  <>
                    <div className="mb-3">
                      <label className="form-label fw-bold">Full Name *</label>
                      <input
                        type="text"
                        className="form-control form-control-lg"
                        name="full_name"
                        value={formData.full_name}
                        onChange={handleChange}
                        required={!isLogin}
                        placeholder="Enter your full name"
                        style={{ borderRadius: '10px' }}
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-bold">Phone Number</label>
                      <input
                        type="tel"
                        className="form-control form-control-lg"
                        name="phone_number"
                        value={formData.phone_number}
                        onChange={handleChange}
                        placeholder="+92 300 1234567"
                        style={{ borderRadius: '10px' }}
                      />
                    </div>
                  </>
                )}

                <div className="mb-3">
                  <label className="form-label fw-bold">Email *</label>
                  <input
                    type="email"
                    className="form-control form-control-lg"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="your@email.com"
                    style={{ borderRadius: '10px' }}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label fw-bold">Password *</label>
                  <input
                    type="password"
                    className="form-control form-control-lg"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    placeholder="Enter password"
                    style={{ borderRadius: '10px' }}
                  />
                </div>

                {!isLogin && (
                  <div className="mb-4">
                    <label className="form-label fw-bold">Select Your Role *</label>
                    <select
                      className="form-select form-select-lg"
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      required
                      style={{ borderRadius: '10px' }}
                    >
                      <option value="student">🎓 Student (Book Hostels & Mess)</option>
                      <option value="hostel_owner">🏨 Hostel Owner (Manage Hostels)</option>
                      <option value="mess_owner">🍽️ Mess Owner (Manage Mess Services)</option>
                    </select>
                  </div>
                )}

                <button 
                  type="submit" 
                  className="btn btn-lg w-100 text-white fw-bold"
                  disabled={loading}
                  style={{ 
                    backgroundColor: '#ff8c42', 
                    border: 'none',
                    borderRadius: '25px',
                    padding: '15px'
                  }}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Processing...
                    </>
                  ) : (
                    isLogin ? 'Login Now' : 'Create Account'
                  )}
                </button>
              </form>

              <div className="text-center mt-4">
                <button
                  type="button"
                  className="btn btn-link text-decoration-none"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError('');
                  }}
                  style={{ color: '#1a3a5c', fontWeight: '600' }}
                >
                  {isLogin 
                    ? "Don't have an account? Sign Up" 
                    : 'Already have an account? Login'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}