// src/App.jsx
import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Auth from './components/Auth';
import Home from './components/Home';
import HostelOwnerDashboard from './components/HostelOwnerDashboard';
import MessOwnerDashboard from './components/MessOwnerDashboard';
import AdminDashboard from './components/AdminDashboard'; // Optional if you have this

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

  // 2. REAL LOGIN FUNCTION (Talks to your AWS Backend)
  const handleLogin = async (credentials, isSignup = false) => {
    try {
        const endpoint = isSignup ? '/register' : '/login';
        
        // Send request to your Lambda via API Gateway
        const res = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials)
        });

        const data = await res.json();

        if (data.success) {
            // Save the real user from Postgres
            setUser(data.user);
            localStorage.setItem('staymate_user', JSON.stringify(data.user));
            setView('dashboard');
        } else {
            alert("Error: " + data.message);
        }
    } catch (err) {
        console.error("Login Error:", err);
        alert("Connection failed! Check your API Gateway URL.");
    }
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
      case 'guest':
        // Guests usually just see the Home page search, but if you have a dashboard:
        return <Home user={user} apiUrl={API_URL} />; 
      default:
        return <div>Unknown Role</div>;
    }
  };

  return (
    <div style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      <Navbar 
        user={user} 
        onLogout={handleLogout}
        onNavigate={setView} // Allows Navbar to switch views
      />
      
      <div className="container mt-4">
        {/* Pass apiUrl and handleLogin to Auth */}
        {view === 'auth' && (
            <Auth onLogin={handleLogin} apiUrl={API_URL} />
        )}

        {/* Pass apiUrl to Home for search */}
        {view === 'home' && (
            <Home user={user} apiUrl={API_URL} />
        )}

        {/* Dashboards are rendered here */}
        {view === 'dashboard' && renderDashboard()}
      </div>
    </div>
  );
}

export default App;