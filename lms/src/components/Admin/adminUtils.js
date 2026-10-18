import { message } from 'antd';

// Shows the server's error message when there is one
export const showError = (err, fallback) => message.error(err?.response?.data?.message || fallback);

export const fullName = (u) => (u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : '');

export const getUserCourseCodes = (u) => {
  if (!u) return [];
  if (u.accountType === 'Student') return (u.enrolledCourseSubjects || []).map(c => c.code);
  if (u.accountType === 'Teacher') return (u.courseSubjectHeld || []).map(c => c.code);
  return [];
};

export const getUserCoursesCount = (u) => getUserCourseCodes(u).length;
