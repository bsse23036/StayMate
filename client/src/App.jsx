// src/App.jsx
import Navbar from './components/Navbar';

function App() {
  return (
    <div className="bg-light min-vh-100">
      <Navbar />
      
      {/* Hero Section */}
      <div className="container text-center py-5">
        <h1 className="display-4 fw-bold text-primary">Find Your Thikana</h1>
        <p className="lead text-muted">Search for Hostels & Mess services in your city</p>
        
        {/* Placeholder for Search Cards (We build this tomorrow) */}
        <div className="alert alert-info mt-4" role="alert">
          Backend data will load here tomorrow!
        </div>
      </div>
    </div>
  );
}

export default App;