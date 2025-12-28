// src/components/Navbar.jsx
export default function Navbar({ user, onLogout, onNavigate }) {
  return (
    <nav className="navbar navbar-expand-lg navbar-dark shadow-sm mb-4" style={{ backgroundColor: '#1a3a5c' }}>
      <div className="container-fluid px-4">
        <button 
          className="navbar-brand fw-bold border-0 bg-transparent fs-3"
          onClick={() => onNavigate('home')}
          style={{ cursor: 'pointer', color: '#ff8c42' }}
        >
          🏠 StayMate
        </button>
        
        <div className="d-flex align-items-center">
          {user ? (
            <>
              <span className="me-3 text-white">
                Welcome, <strong>{user.name}</strong>
                <span className="badge ms-2" style={{ backgroundColor: '#ff8c42' }}>
                  {user.role.replace('_', ' ')}
                </span>
              </span>
              <button 
                className="btn btn-outline-light me-2"
                onClick={() => onNavigate('home')}
              >
                Home
              </button>
              <button 
                className="btn me-2"
                onClick={() => onNavigate('dashboard')}
                style={{ backgroundColor: '#ff8c42', color: 'white', border: 'none' }}
              >
                Dashboard
              </button>
              <button 
                className="btn btn-outline-danger"
                onClick={onLogout}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <button 
                className="btn btn-outline-light me-2"
                onClick={() => onNavigate('auth')}
              >
                Login
              </button>
              <button 
                className="btn"
                onClick={() => onNavigate('auth')}
                style={{ backgroundColor: '#ff8c42', color: 'white', border: 'none' }}
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