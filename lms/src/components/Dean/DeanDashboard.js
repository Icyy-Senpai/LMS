import React from 'react';
import TeacherDashboard from '../Teacher/TeacherDashboard';

export default function DeanDashboard(props) {
  return <TeacherDashboard {...props} isDean />;
}
