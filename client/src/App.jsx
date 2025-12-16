// src/App.jsx
import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Auth from './components/Auth';
import Home from './components/Home';
import HostelOwnerDashboard from './components/HostelOwnerDashboard';
import MessOwnerDashboard from './components/MessOwnerDashboard';
import AdminDashboard from './components/AdminDashboard';

function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('home');
  const [useMockData] = useState(true); // Toggle for mock data
  const API_URL = "https://fpyn6pr5z6flgsrxxaufuz35w40dwhfp.lambda-url.us-east-1.on.aws";

  useEffect(() => {
    const storedUser = localStorage.getItem('staymate_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
      setView('dashboard');
    }
  }, []);

  // Mock signup/login (works without backend)
  const handleLogin = (userData) => {
    const mockUser = {
      id: Date.now(),
      name: userData.name || 'Test User',
      email: userData.email,
      role: userData.role || 'guest',
      created_at: new Date().toISOString()
    };
    
    setUser(mockUser);
    localStorage.setItem('staymate_user', JSON.stringify(mockUser));
    setView('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('staymate_user');
    setView('home');
  };

  const renderDashboard = () => {
    if (!user) return null;

    switch (user.role) {
      case 'hostel_owner':
        return <HostelOwnerDashboard user={user} useMockData={useMockData} />;
      case 'mess_owner':
        return <MessOwnerDashboard user={user} useMockData={useMockData} />;
      case 'guest':
        return <Home user={user} useMockData={useMockData} />;
      default:
        return <AdminDashboard useMockData={useMockData} />;
    }
  };

  return (
    <div style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      <Navbar 
        user={user} 
        onLogout={handleLogout}
        onNavigate={setView}
      />
      
      {view === 'auth' && <Auth onLogin={handleLogin} useMockData={useMockData} />}
      {view === 'home' && <Home user={user} useMockData={useMockData} />}
      {view === 'dashboard' && renderDashboard()}
    </div>
  );
}

export default App;