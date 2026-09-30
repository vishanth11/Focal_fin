import React from 'react';
import { Navigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

// Guards the student account route ONLY. No existing FOCAL route is wrapped in
// this — /check, /explore, /company/:id, /report and / are all still public.
export default function StudentRoute({ children }) {
  const { isStudent } = useApp();

  if (!isStudent) {
    return <Navigate to="/student/login" replace />;
  }

  return children;
}
