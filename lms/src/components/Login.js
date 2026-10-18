import React, { useState } from 'react';
import { message } from 'antd';
import api from '../api';

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Send 'email' instead of 'username'
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
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif' }}>
      <div style={{ border: '2px solid black', padding: '30px', width: '320px', borderRadius: '8px', backgroundColor: '#fff' }}>
        <h2 style={{ textAlign: 'center', margin: '0 0 10px 0' }}>LMS Portal</h2>
        <p style={{ textAlign: 'center', margin: '0 0 20px 0', color: '#666' }}>Sign in to your account</p>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <label>
            <strong>Email:</strong>
            <input 
              type="email" 
              placeholder="Enter your school email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              style={{ width: '100%', marginTop: '5px', padding: '8px', boxSizing: 'border-box' }} 
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
              style={{ width: '100%', marginTop: '5px', padding: '8px', boxSizing: 'border-box' }} 
            />
          </label>
          <button 
            type="submit" 
            disabled={loading} 
            style={{ 
              padding: '10px', 
              marginTop: '10px', 
              cursor: 'pointer', 
              backgroundColor: loading ? '#ccc' : '#1890ff', 
              color: 'white', 
              border: 'none', 
              fontWeight: 'bold' 
            }}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}