import React, { useState } from 'react';
import { message, Button } from 'antd';
import { SafetyCertificateOutlined } from '@ant-design/icons';
import api from '../api';

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAdminLogin, setIsAdminLogin] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // The backend userController handles 'email' as either an email or a username
      const response = await api.post('/login', { email, password });
      
      if (response.data.success) {
        message.success('Login successful!');
        onLoginSuccess(response.data.user);
      } else {
        alert(response.data.message || 'Login failed');
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Error connecting to server');
    }
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif', background: isAdminLogin ? '#141414' : '#f0f2f5', transition: 'background 0.3s' }}>
      
      {/* Admin Toggle Button - Top Left */}
      <div style={{ position: 'absolute', top: 20, left: 20 }}>
        <Button 
            type={isAdminLogin ? "default" : "primary"} 
            danger={isAdminLogin}
            icon={<SafetyCertificateOutlined />} 
            onClick={() => { setIsAdminLogin(!isAdminLogin); setEmail(''); setPassword(''); }}
        >
            {isAdminLogin ? 'Return to Student/Faculty Login' : 'Admin Access'}
        </Button>
      </div>

      <div style={{ border: isAdminLogin ? '2px solid #ff4d4f' : '2px solid transparent', padding: '40px', width: '350px', borderRadius: '8px', backgroundColor: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <h2 style={{ textAlign: 'center', margin: '0 0 10px 0', color: isAdminLogin ? '#cf1322' : '#000' }}>
            {isAdminLogin ? 'System Administration' : 'LMS Portal'}
        </h2>
        <p style={{ textAlign: 'center', margin: '0 0 20px 0', color: '#666' }}>
            {isAdminLogin ? 'Sign in with your Admin credentials' : 'Sign in to your account'}
        </p>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <label>
            <strong>{isAdminLogin ? 'Admin Username / Email:' : 'Email:'}</strong>
            <input 
              type={isAdminLogin ? "text" : "email"} 
              placeholder={isAdminLogin ? "Enter admin username" : "Enter your school email"} 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              style={{ width: '100%', marginTop: '5px', padding: '10px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #d9d9d9' }} 
            />
          </label>
          <label>
            <strong>Password:</strong>
            <input 
              type="password" 
              placeholder="Enter your password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              style={{ width: '100%', marginTop: '5px', padding: '10px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #d9d9d9' }} 
            />
          </label>
          <button 
            type="submit" 
            disabled={loading} 
            style={{ 
                padding: '12px', marginTop: '10px', cursor: 'pointer', 
                backgroundColor: loading ? '#ccc' : (isAdminLogin ? '#cf1322' : '#1890ff'), 
                color: 'white', border: 'none', fontWeight: 'bold', borderRadius: '4px' 
            }}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}