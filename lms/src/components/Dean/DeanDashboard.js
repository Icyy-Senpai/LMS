import React from 'react';
import TeacherDashboard from '../Teacher/TeacherDashboard';

/**
 * The Dean's dashboard. A Dean is a Teacher account with isDean: true, so it has every teacher feature
 * (courses, grading, forums, mailbox, class rosters...) and TeacherDashboard adds the "Dean Office" area
 * (reassign teachers to blocks, reassign users with courses) when `isDean` is set.
 */
export default function DeanDashboard(props) {
  return <TeacherDashboard {...props} isDean />;
}
