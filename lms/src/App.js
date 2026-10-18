import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button } from 'antd';
import Login from './components/Login';
import StudentDashboard from './components/Student/StudentDashboard';
import TeacherDashboard from './components/Teacher/TeacherDashboard';
import AdminDashboard from './components/Admin/AdminDashboard';

export default function App() {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  
  const [showIdlePrompt, setShowIdlePrompt] = useState(false);
  const idleTimeoutRef = useRef(null);

  const handleUserUpdate = (userData) => {
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    setShowIdlePrompt(false);
    if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
  };

  useEffect(() => {
    if (!user || showIdlePrompt) return;

    const resetTimer = () => {
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
      idleTimeoutRef.current = setTimeout(() => {
        setShowIdlePrompt(true);
      }, 900000); // 15 minutes
    };

    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart'];
    const handleActivity = () => resetTimer();

    events.forEach(event => window.addEventListener(event, handleActivity));
    resetTimer(); 

    return () => {
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
      events.forEach(event => window.removeEventListener(event, handleActivity));
    };
  }, [user, showIdlePrompt]);

  return (
    <>
      <Modal
        title="Session Expiring"
        open={showIdlePrompt}
        closable={false}
        footer={[
          <Button key="logout" danger onClick={handleLogout}>No, log out</Button>,
          <Button key="stay" type="primary" onClick={() => setShowIdlePrompt(false)}>Yes, stay logged in</Button>,
        ]}
      >
        <p>You have been idle for 15 minutes. Do you want to stay logged in?</p>
      </Modal>

      {!user ? (
        <Login onLoginSuccess={handleUserUpdate} />
      ) : user.accountType === 'Student' ? (
        <StudentDashboard user={user} onLogout={handleLogout} onUpdateProfile={handleUserUpdate} />
      ) : user.accountType === 'Teacher' ? (
        <TeacherDashboard user={user} onLogout={handleLogout} onUpdateProfile={handleUserUpdate} />
      ) : user.accountType === 'Admin' ? (
        <AdminDashboard user={user} onLogout={handleLogout} onUpdateProfile={handleUserUpdate} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#f0f2f5' }}>
          <h2>Error: Invalid Role</h2>
          <p>Your account type could not be determined from the database.</p>
          <Button type="primary" danger onClick={handleLogout} size="large" style={{ marginTop: 16 }}>
            Clear Session & Return to Login
          </Button>
        </div>
      )}
    </>
  );
}