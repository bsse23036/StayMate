// src/App.jsx
import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Auth from './components/Auth';
import Home from './components/Home';
import HostelOwnerDashboard from './components/HostelOwnerDashboard';
import MessOwnerDashboard from './components/MessOwnerDashboard';
// import AdminDashboard from './components/AdminDashboard'; // Uncomment if you create this file

function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('home');
  
  // 1. THIS IS YOUR REAL AWS GATEWAY URL
  const API_URL = "https://wz81rzb6g4.execute-api.us-east-1.amazonaws.com"; 

  // Load user from local storage on startup
  useEffect(() => {
    const storedUser = localStorage.getItem('staymate_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  // 2. UPDATED LOGIN FUNCTION (Simplified)
  // Auth.jsx already did the fetching. We just save the result here.
  const handleLogin = (userData) => {
    console.log("Login Successful, saving user:", userData);
    setUser(userData);
    localStorage.setItem('staymate_user', JSON.stringify(userData));
    setView('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('staymate_user');
    setView('home');
  };

  const renderDashboard = () => {
    if (!user) return null;

    // Pass API_URL so dashboards can fetch real data
    switch (user.role) {
      case 'hostel_owner':
        return <HostelOwnerDashboard user={user} apiUrl={API_URL} />;
      case 'mess_owner':
        return <MessOwnerDashboard user={user} apiUrl={API_URL} />;
      case 'student': 
        // Students see the search page as their "dashboard" for now
        return <Home user={user} apiUrl={API_URL} />; 
      case 'admin':
        // return <AdminDashboard user={user} apiUrl={API_URL} />;
        return <div>Admin Dashboard (Coming Soon)</div>;
      default:
        // Fallback for any other role
        return <Home user={user} apiUrl={API_URL} />;
    }
  };

  return (
    <div style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      <Navbar 
        user={user} 
        onLogout={handleLogout}
        onNavigate={setView} 
      />
      
      <div className="container mt-4">
        {/* LOGIN/SIGNUP PAGE */}
        {view === 'auth' && (
            <Auth onLogin={handleLogin} apiUrl={API_URL} />
        )}

        {/* HOME / SEARCH PAGE */}
        {view === 'home' && (
            <Home user={user} apiUrl={API_URL} />
        )}

        {/* DASHBOARDS (Private) */}
        {view === 'dashboard' && renderDashboard()}
      </div>
    </div>
  );
}

export default App;