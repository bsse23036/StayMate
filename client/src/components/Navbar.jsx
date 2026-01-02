// src/components/Navbar.jsx
export default function Navbar({ user, onLogout, onNavigate }) {
  return (
    <nav className="navbar navbar-expand-lg shadow-sm" style={{ backgroundColor: '#ffffff', borderBottom: '2px solid #f0f0f0' }}>
      <div className="container-fluid px-4 py-2">
        <button 
          className="navbar-brand d-flex align-items-center border-0 bg-transparent"
          onClick={() => onNavigate('home')}
          style={{ cursor: 'pointer' }}
        >
          <img 
            src="/logo.png" 
            alt="StayMate Logo" 
            style={{ width: '50px', height: '50px', marginRight: '10px' }}
          />
          <span className="fs-3 fw-bold" style={{ color: '#1a3a5c' }}>
            Stay<span style={{ color: '#ff8c42' }}>Mate</span>
          </span>
        </button>
        
        <div className="d-flex align-items-center gap-2">
          {user ? (
            <>
              <div className="d-none d-md-block me-3">
                <span style={{ color: '#1a3a5c' }}>
                  Welcome, <strong>{user.name}</strong>
                </span>
                <span className="badge ms-2" style={{ backgroundColor: '#ff8c42', color: 'white' }}>
                  {user.role.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              <button 
                className="btn btn-outline-secondary"
                onClick={() => onNavigate('home')}
                style={{ borderRadius: '25px' }}
              >
                Home
              </button>
              <button 
                className="btn"
                onClick={() => onNavigate('dashboard')}
                style={{ 
                  backgroundColor: '#ff8c42', 
                  color: 'white', 
                  border: 'none',
                  borderRadius: '25px'
                }}
              >
                Dashboard
              </button>
              <button 
                className="btn btn-outline-danger"
                onClick={onLogout}
                style={{ borderRadius: '25px' }}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <button 
                className="btn"
                onClick={() => onNavigate('auth')}
                style={{ 
                  backgroundColor: 'transparent',
                  color: '#1a3a5c', 
                  border: '2px solid #1a3a5c',
                  borderRadius: '25px',
                  fontWeight: '600'
                }}
              >
                Login
              </button>
              <button 
                className="btn"
                onClick={() => onNavigate('auth')}
                style={{ 
                  backgroundColor: '#ff8c42', 
                  color: 'white', 
                  border: 'none',
                  borderRadius: '25px',
                  fontWeight: '600'
                }}
              >
                Sign Up
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}