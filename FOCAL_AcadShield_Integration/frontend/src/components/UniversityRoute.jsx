import React from 'react';
import { Navigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function UniversityRoute({ children }) {
  const { isUniversity } = useApp();

  if (!isUniversity) {
    return <Navigate to="/university/login" replace />;
  }

  return children;
}
