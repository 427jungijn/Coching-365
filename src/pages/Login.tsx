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
  const [unauthorizedDomain, setUnauthorizedDomain] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setError('');
    setUnauthorizedDomain('');
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
      } else {
        // If user exists but is bootstrap admin and somehow has client role, fix it
        if (isBootstrapAdmin && userSnap.data().role !== 'admin') {
          await setDoc(userRef, { role: 'admin' }, { merge: true });
        }
      }
    } catch (err: any) {
      console.error("Login failed", err);
      if (err.code === 'auth/unauthorized-domain') {
        setUnauthorizedDomain(window.location.hostname);
      } else {
        setError(err.message || '로그인에 실패했습니다.');
      }
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
          
          {unauthorizedDomain && (
            <div className="mt-4 p-4 rounded-md bg-red-50 border border-red-200">
              <h3 className="text-red-800 font-bold mb-2 text-center">도메인 등록이 필요합니다!</h3>
              <p className="text-sm text-red-700 mb-3 text-center">
                현재 접속하신 주소가 Firebase에 등록되지 않았습니다. 아래 주소를 복사해서 Firebase 콘솔의 <b>[승인된 도메인]</b>에 추가해주세요.
              </p>
              <div className="bg-white p-3 rounded border border-red-300 font-mono text-sm text-center mb-3 select-all cursor-text">
                {unauthorizedDomain}
              </div>
              <a
                href="https://console.firebase.google.com/project/gen-lang-client-0482266539/authentication/settings"
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:text-blue-800 hover:underline text-sm block text-center font-medium"
              >
                👉 Firebase 설정으로 이동하기
              </a>
            </div>
          )}

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
