import React, { useState } from 'react';
import { message } from 'antd';
import api from '../api';

// One sign-in form for everyone. Students, teachers and deans use their school email; an admin can type their
// admin username (or email) here too. The backend (userController.login) finds the matching account and its
// accountType decides which dashboard App.js opens, so admins land on the admin page.
export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.post('/login', { email: email.trim(), password });

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
    <div className="login-page">
      <div className="login-card">
        <div className="login-card-banner">
          <h2>LMS Portal</h2>
          <p>Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <label>
            Email
            {/* type="text", not "email": admin usernames are not email addresses */}
            <input
              type="text"
              autoComplete="username"
              placeholder="Enter your school email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete="current-password"
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
