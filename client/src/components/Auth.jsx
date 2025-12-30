// src/components/Auth.jsx
import { useState } from 'react';

export default function Auth({ onLogin, apiUrl }) {
  const [isLogin, setIsLogin] = useState(true);
  
  // 1. FIXED: Set default role to 'student' (guest no longer exists in DB)
  // 2. FIXED: Use 'full_name' instead of 'name' to match backend schema
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
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

      // 3. Prepare payload: send 'full_name' on register
      const payload = isLogin 
        ? { email: formData.email, password: formData.password }
        : formData; // This includes full_name, role, etc.

      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Authentication failed');
      }

      onLogin(data.user);

    } catch (err) {
      console.error("Login Error:", err);
      setError(err.message || "Failed to connect to server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid py-5" style={{ maxWidth: '1400px', margin: '0 auto' }}>
      <div className="row justify-content-center">
        <div className="col-md-8 col-lg-6 col-xl-5">
          <div className="card shadow-lg border-0">
            <div className="card-body p-5">
              <h3 className="card-title text-center mb-4" style={{ color: '#1a3a5c' }}>
                {isLogin ? '👋 Login' : '📝 Sign Up'}
              </h3>

              {error && (
                <div className="alert alert-danger" role="alert">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {!isLogin && (
                  <div className="mb-3">
                    <label className="form-label fw-bold">Full Name</label>
                    <input
                      type="text"
                      className="form-control form-control-lg"
                      // 4. FIXED: Input name matches state property 'full_name'
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleChange}
                      required={!isLogin}
                      placeholder="Enter your full name"
                    />
                  </div>
                )}

                <div className="mb-3">
                  <label className="form-label fw-bold">Email</label>
                  <input
                    type="email"
                    className="form-control form-control-lg"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="your@email.com"
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label fw-bold">Password</label>
                  <input
                    type="password"
                    className="form-control form-control-lg"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    placeholder="Enter password"
                  />
                </div>

                {!isLogin && (
                  <div className="mb-3">
                    <label className="form-label fw-bold">Select Your Role</label>
                    <select
                      className="form-select form-select-lg"
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      required
                    >
                      {/* 5. FIXED: Removed 'guest' and added 'student' */}
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
                  style={{ backgroundColor: '#ff8c42', border: 'none' }}
                >
                  {loading ? 'Connecting...' : (isLogin ? 'Login Now' : 'Create Account')}
                </button>
              </form>

              <div className="text-center mt-4">
                <button
                  type="button" // Add type="button" to prevent form submission
                  className="btn btn-link text-decoration-none"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError('');
                  }}
                  style={{ color: '#1a3a5c' }}
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