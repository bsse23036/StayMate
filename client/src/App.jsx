// src/App.jsx
import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import LandingPage from './components/LandingPage';
import Auth from './components/Auth';
import Home from './components/Home';
import HostelOwnerDashboard from './components/HostelOwnerDashboard';
import MessOwnerDashboard from './components/MessOwnerDashboard';

function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('landing');
  
  const API_URL = "https://wz81rzb6g4.execute-api.us-east-1.amazonaws.com";

  useEffect(() => {
    const storedUser = localStorage.getItem('staymate_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
      setView('dashboard');
    }
  }, []);

  const handleLogin = (userData) => {
    console.log("Login Successful:", userData);
    setUser(userData);
    localStorage.setItem('staymate_user', JSON.stringify(userData));
    setView('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('staymate_user');
    setView('landing');
  };

  const renderDashboard = () => {
    if (!user) return null;

    switch (user.role) {
      case 'hostel_owner':
        return <HostelOwnerDashboard user={user} apiUrl={API_URL} />;
      case 'mess_owner':
        return <MessOwnerDashboard user={user} apiUrl={API_URL} />;
      case 'student': 
        return <Home user={user} apiUrl={API_URL} />; 
      default:
        return <Home user={user} apiUrl={API_URL} />;
    }
  };

  return (
    <div style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      {view !== 'landing' && (
        <Navbar 
          user={user} 
          onLogout={handleLogout}
          onNavigate={setView} 
        />
      )}
      
      <div className={view !== 'landing' ? "container-fluid" : ""}>
        {view === 'landing' && <LandingPage onNavigate={setView} />}
        {view === 'auth' && <Auth onLogin={handleLogin} apiUrl={API_URL} />}
        {view === 'home' && <Home user={user} apiUrl={API_URL} />}
        {view === 'dashboard' && renderDashboard()}
      </div>
    </div>
  );
}

export default App;