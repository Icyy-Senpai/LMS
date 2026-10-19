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
    <div className={`login-page${isAdminLogin ? ' admin' : ''}`}>

      {/* Admin Toggle Button - Top Left */}
      <div className="login-toggle">
        <Button
            type={isAdminLogin ? "primary" : "default"}
            icon={<SafetyCertificateOutlined />}
            onClick={() => { setIsAdminLogin(!isAdminLogin); setEmail(''); setPassword(''); }}
        >
            {isAdminLogin ? 'Return to Student/Faculty Login' : 'Admin Access'}
        </Button>
      </div>

      <div className="login-card">
        <div className="login-card-banner">
          <h2>{isAdminLogin ? 'System Administration' : 'LMS Portal'}</h2>
          <p>{isAdminLogin ? 'Sign in with your Admin credentials' : 'Sign in to your account'}</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <label>
            {isAdminLogin ? 'Admin Username / Email' : 'Email'}
            <input
              type={isAdminLogin ? "text" : "email"}
              placeholder={isAdminLogin ? "Enter admin username" : "Enter your school email"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          <button type="submit" disabled={loading} className="login-submit">
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
