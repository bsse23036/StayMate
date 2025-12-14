// src/components/Navbar.jsx
export default function Navbar() {
  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-white shadow-sm mb-4">
      <div className="container">
        <a className="navbar-brand fw-bold text-primary" href="#">StayMate</a>
        
        {/* Simple Login/Signup buttons */}
        <div className="d-flex">
          <button className="btn btn-outline-secondary me-2">Login</button>
          <button className="btn btn-primary">Sign Up</button>
        </div>
      </div>
    </nav>
  );
}