import React, { useState } from 'react';
import { signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';
import { useAuth } from '../components/AuthProvider';
import { Navigate } from 'react-router-dom';
import { Activity } from 'lucide-react';

export default function Login() {
  const { user, profile, loading } = useAuth();
  const [error, setError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setError('');
    setAuthLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const email = result.user.email?.toLowerCase();
      
      if (!email) throw new Error("No email found");

      // Check if bootstrap admin
      const isBootstrapAdmin = email === '427jungjin@gmail.com';
      
      let role = 'client';
      
      if (isBootstrapAdmin) {
        role = 'admin';
      } else {
        // Check whitelist
        const allowedDoc = await getDoc(doc(db, 'allowed_emails', email));
        if (!allowedDoc.exists()) {
          await signOut(auth);
          setError('관리자의 승인이 필요합니다. 관리자에게 이메일 등록을 요청하세요.');
          setAuthLoading(false);
          return;
        }
        role = allowedDoc.data().role || 'client';
      }

      // Check if user profile exists, if not create it
      const userRef = doc(db, 'users', result.user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: result.user.uid,
          email: email,
          role: role,
          name: result.user.displayName || 'New User',
          createdAt: new Date().toISOString()
        });
      }
    } catch (err: any) {
      console.error("Login failed", err);
      setError(err.message || '로그인에 실패했습니다.');
      await signOut(auth);
    } finally {
      setAuthLoading(false);
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
            onClick={handleGoogleLogin}
            disabled={authLoading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {authLoading ? 'Processing...' : 'Sign in with Google'}
          </button>
          
          {error && (
            <div className="mt-4 p-3 rounded-md bg-red-50 text-red-700 text-sm text-center">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
