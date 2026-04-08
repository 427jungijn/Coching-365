import React from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { useAuth } from '../components/AuthProvider';
import { Navigate } from 'react-router-dom';
import { Activity } from 'lucide-react';

export default function Login() {
  const { user, profile, loading } = useAuth();

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (user && profile) {
    if (profile.role === 'admin') {
      return <Navigate to="/admin" replace />;
    } else {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Activity className="h-12 w-12 text-blue-600" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Biocode Coaching365
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Sign in to track your daily stretching goals
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <button
            onClick={handleLogin}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    </div>
  );
}
