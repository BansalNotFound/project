import React, { useState, useEffect } from 'react';
import axios from 'axios';
import EnrollmentForm from './components/EnrollmentForm';
import VerificationForm from './components/VerificationForm';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('verify');
  const [currentUser, setCurrentUser] = useState(null);
  const [authToken, setAuthToken] = useState(localStorage.getItem('token') || null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [userStats, setUserStats] = useState(null);

  // Configure axios with authorization headers
  useEffect(() => {
    if (authToken) {
      localStorage.setItem('token', authToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
      fetchLogs();
      // Fetch user profile if user information exists in token payload
      try {
        const payload = JSON.parse(atob(authToken.split('.')[1]));
        fetchUserProfile(payload.userId);
      } catch (err) {
        console.error('Failed to parse token payload:', err);
      }
    } else {
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
      setCurrentUser(null);
      setUserStats(null);
      setRecentLogs([]);
    }
  }, [authToken]);

  const fetchUserProfile = async (userId) => {
    try {
      const res = await axios.get(`${API_URL}/users/${userId}`);
      setCurrentUser(res.data.data);
      setUserStats(res.data.data.statistics);
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
      if (err.response?.status === 401) {
        handleLogout();
      }
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await axios.get(`${API_URL}/logs/admin/all?limit=10`);
      setRecentLogs(res.data.data);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    }
  };

  const handleEnrollSuccess = (data) => {
    setAuthToken(data.token);
    setActiveTab('dashboard');
  };

  const handleVerifySuccess = (data) => {
    setAuthToken(data.token);
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    setAuthToken(null);
    setActiveTab('verify');
  };

  return (
    <div className="app-container">
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '2.5rem' }}>NHAI Biometric Gateway</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', letterSpacing: '0.02em', marginTop: '0.25rem' }}>
          Data Leak Prevention & Anti-Spoofing Authentication System
        </p>
      </div>

      <div className="glass-panel">
        {/* Navigation Tabs */}
        <div className="tabs-header">
          {!authToken ? (
            <>
              <button 
                className={`tab-btn ${activeTab === 'verify' ? 'active' : ''}`}
                onClick={() => setActiveTab('verify')}
              >
                🔐 Verification
              </button>
              <button 
                className={`tab-btn ${activeTab === 'enroll' ? 'active' : ''}`}
                onClick={() => setActiveTab('enroll')}
              >
                👤 Enroll Operator
              </button>
            </>
          ) : (
            <>
              <button 
                className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => setActiveTab('dashboard')}
              >
                📊 Dashboard
              </button>
              <button 
                className="tab-btn"
                onClick={handleLogout}
              >
                🚪 Log Out
              </button>
            </>
          )}
        </div>

        {/* Content Screens */}
        {activeTab === 'verify' && !authToken && (
          <VerificationForm onVerifySuccess={handleVerifySuccess} />
        )}

        {activeTab === 'enroll' && !authToken && (
          <EnrollmentForm onEnrollSuccess={handleEnrollSuccess} />
        )}

        {authToken && activeTab === 'dashboard' && (
          <div>
            <h2>Operator Security Dashboard</h2>
            
            {currentUser && (
              <div style={{ marginBottom: '2rem', background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '12px' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Authenticated Profile</p>
                <h3 style={{ fontSize: '1.25rem', marginTop: '0.25rem' }}>{currentUser.name}</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>UID: {currentUser.userId}</p>
                {currentUser.email && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Email: {currentUser.email}</p>}
              </div>
            )}

            {userStats && (
              <div className="dashboard-grid">
                <div className="dashboard-card">
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Verification Rate</div>
                  <div className="dashboard-val">{userStats.successRate.toFixed(1)}%</div>
                </div>
                <div className="dashboard-card">
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Logins</div>
                  <div className="dashboard-val">{userStats.totalVerifications}</div>
                </div>
              </div>
            )}

            <div>
              <h3>Recent Security Log Entries</h3>
              <div className="history-list">
                {recentLogs.length > 0 ? (
                  recentLogs.map((log) => (
                    <div className="history-item" key={log._id}>
                      <div>
                        <span style={{ fontWeight: '500', display: 'block' }}>
                          {log.userId?.name || 'Unknown User'}
                        </span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                          {new Date(log.verificationDate).toLocaleTimeString()} • IP: {log.security?.ipAddress || '127.0.0.1'}
                        </span>
                      </div>
                      <span className={`status-badge status-${log.result === 'success' ? 'success' : 'failed'}`}>
                        {log.result === 'success' ? 'Verified' : log.result.replace('_', ' ')}
                      </span>
                    </div>
                  ))
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>
                    No login logs recorded yet.
                  </p>
                )}
              </div>
            </div>
            
            <button 
              type="button" 
              className="btn-secondary" 
              style={{ marginTop: '2rem' }}
              onClick={fetchLogs}
            >
              🔄 Refresh Audit Logs
            </button>
          </div>
        )}
      </div>
      
      <div style={{ marginTop: '2.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
        NHAI AI Security Gate System v1.0.0 • Hackathon 7.0 Prototype
      </div>
    </div>
  );
}
