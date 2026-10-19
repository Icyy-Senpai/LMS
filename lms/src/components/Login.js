import React, { useState } from 'react';
import { message } from 'antd';
import { MailOutlined, LockOutlined, ArrowRightOutlined } from '@ant-design/icons';
import api from '../api';
import logoImage from '../logo.png';
import BrandGlobe from './Shared/BrandGlobe';
import ThemeToggle from './Shared/ThemeToggle';

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const failed = (text) => {
    message.error(text);
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.post('/login', { email: email.trim(), password });

      if (response.data.success) {
        message.success('Login successful!');
        onLoginSuccess(response.data.user);
      } else {
        failed(response.data.message || 'Login failed');
      }
    } catch (error) {
      failed(error.response?.data?.message || 'Error connecting to server');
    }
    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-aurora" aria-hidden="true"><span /><span /><span /></div>
      <div className="login-gridlines" aria-hidden="true" />
      <ThemeToggle className="login-theme-toggle" />

      <div className="login-shell">
        <section className="login-brand">
          <BrandGlobe size={420} className="login-brand-globe" />
          <div className="login-brand-content">
            <div className="login-logo-wrap">
              <span className="login-logo-ring" />
              <img src={logoImage} alt="St. Dominic College of Asia" className="login-logo" />
            </div>
            <h1 className="login-brand-title">St. Dominic<br />College of Asia</h1>
            <div className="login-brand-rule" />
            <p className="login-brand-sub">Learning Management System</p>
            <p className="login-brand-est">Est. 2003</p>
          </div>
        </section>

        <section className={`login-card${shake ? ' shake' : ''}`}>
          <div className="login-card-banner">
            <img src={logoImage} alt="" className="login-card-logo" />
            <h2>Welcome back</h2>
            <p>Sign in to your eLMS account</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <label className="login-field">
              <span>Email</span>
              <div className="login-input">
                <MailOutlined />
                <input
                  type="text"
                  autoComplete="username"
                  placeholder="Enter your school email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </label>
            <label className="login-field">
              <span>Password</span>
              <div className="login-input">
                <LockOutlined />
                <input
                  type="password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </label>
            <button type="submit" disabled={loading} className="login-submit">
              {loading ? <span className="login-spinner" /> : null}
              <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
              {!loading && <ArrowRightOutlined className="login-submit-arrow" />}
            </button>
          </form>
          <div className="login-card-foot">St. Dominic College of Asia · eLMS</div>
        </section>
      </div>
    </div>
  );
}
