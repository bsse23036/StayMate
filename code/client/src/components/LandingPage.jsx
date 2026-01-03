// src/components/LandingPage.jsx
export default function LandingPage({ onNavigate }) {
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1a3a5c 0%, #2c5f8d 100%)' }}>
      {/* Hero Section */}
      <div className="container-fluid">
        <div className="row min-vh-100 align-items-center">
          <div className="col-12 text-center">
            {/* Logo */}
            <div className="mb-5">
              <img 
                src="/logo.png" 
                alt="StayMate Logo" 
                style={{ width: '200px', height: '200px', marginBottom: '2rem' }}
              />
              <h1 className="display-1 fw-bold mb-3" style={{ color: '#ffffff' }}>
                Stay<span style={{ color: '#ff8c42' }}>Mate</span>
              </h1>
              <p className="lead text-white-50 mb-5" style={{ fontSize: '1.5rem', maxWidth: '700px', margin: '0 auto' }}>
                Your trusted partner in finding the perfect accommodation and mess services
              </p>
            </div>

            {/* Feature Cards */}
            <div className="row justify-content-center mb-5 px-3">
              <div className="col-md-4 mb-4">
                <div className="card border-0 shadow-lg h-100" style={{ borderRadius: '20px', background: 'rgba(255, 255, 255, 0.95)' }}>
                  <div className="card-body p-4">
                    <div className="mb-3" style={{ fontSize: '3rem' }}>🏨</div>
                    <h4 className="fw-bold mb-3" style={{ color: '#1a3a5c' }}>Find Hostels</h4>
                    <p className="text-muted">
                      Browse through verified hostels with detailed information, photos, and reviews
                    </p>
                  </div>
                </div>
              </div>

              <div className="col-md-4 mb-4">
                <div className="card border-0 shadow-lg h-100" style={{ borderRadius: '20px', background: 'rgba(255, 255, 255, 0.95)' }}>
                  <div className="card-body p-4">
                    <div className="mb-3" style={{ fontSize: '3rem' }}>🍽️</div>
                    <h4 className="fw-bold mb-3" style={{ color: '#1a3a5c' }}>Mess Services</h4>
                    <p className="text-muted">
                      Subscribe to quality mess services with transparent pricing and menu options
                    </p>
                  </div>
                </div>
              </div>

              <div className="col-md-4 mb-4">
                <div className="card border-0 shadow-lg h-100" style={{ borderRadius: '20px', background: 'rgba(255, 255, 255, 0.95)' }}>
                  <div className="card-body p-4">
                    <div className="mb-3" style={{ fontSize: '3rem' }}>✅</div>
                    <h4 className="fw-bold mb-3" style={{ color: '#1a3a5c' }}>Easy Booking</h4>
                    <p className="text-muted">
                      Simple and secure booking process with instant confirmation
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="d-flex justify-content-center gap-3 flex-wrap">
              <button 
                onClick={() => onNavigate('home')}
                className="btn btn-lg px-5 py-3 fw-bold shadow-lg"
                style={{ 
                  backgroundColor: '#ff8c42', 
                  color: 'white', 
                  border: 'none',
                  borderRadius: '50px',
                  fontSize: '1.2rem',
                  transition: 'transform 0.2s'
                }}
                onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
              >
                Explore Now
              </button>
              <button 
                onClick={() => onNavigate('auth')}
                className="btn btn-lg px-5 py-3 fw-bold shadow-lg"
                style={{ 
                  backgroundColor: 'white', 
                  color: '#1a3a5c', 
                  border: '2px solid white',
                  borderRadius: '50px',
                  fontSize: '1.2rem',
                  transition: 'transform 0.2s'
                }}
                onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
              >
                Get Started
              </button>
            </div>

            {/* Info Section */}
            <div className="mt-5 pt-5">
              <div className="row justify-content-center px-3">
                <div className="col-lg-8">
                  <div className="card border-0 shadow-lg" style={{ borderRadius: '20px', background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(10px)' }}>
                    <div className="card-body p-5 text-white">
                      <h3 className="fw-bold mb-4">Why Choose StayMate?</h3>
                      <div className="row text-start">
                        <div className="col-md-6 mb-3">
                          <p>✓ Verified Listings</p>
                          <p>✓ Transparent Pricing</p>
                          <p>✓ Secure Bookings</p>
                        </div>
                        <div className="col-md-6 mb-3">
                          <p>✓ 24/7 Support</p>
                          <p>✓ Easy Management</p>
                          <p>✓ Trusted Platform</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}