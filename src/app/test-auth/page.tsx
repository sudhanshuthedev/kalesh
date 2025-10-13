'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function TestAuthPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [localStorageData, setLocalStorageData] = useState<any>({});

  useEffect(() => {

    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    setLocalStorageData({
      token: token ? token.substring(0, 50) + '...' : 'No token',
      user: storedUser || 'No user data',
    });
  }, [user]);

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-3xl font-bold mb-8">Auth State Test</h1>

      <div className="space-y-6">
        <div className="bg-gray-900 p-4 rounded">
          <h2 className="text-xl font-semibold mb-2">Context State:</h2>
          <p>Loading: {isLoading ? 'Yes' : 'No'}</p>
          <p>Authenticated: {isAuthenticated ? 'Yes' : 'No'}</p>
          <p>User: {user ? JSON.stringify(user, null, 2) : 'null'}</p>
        </div>

        <div className="bg-gray-900 p-4 rounded">
          <h2 className="text-xl font-semibold mb-2">LocalStorage:</h2>
          <p className="mb-2">Token: {localStorageData.token}</p>
          <p>User Data: {localStorageData.user}</p>
        </div>

        <div className="bg-green-900 p-4 rounded">
          <h2 className="text-xl font-semibold mb-2">✅ Expected Behavior:</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>After login: Both token and user should be stored</li>
            <li>After refresh: User state loads immediately from localStorage</li>
            <li>Token is sent with API requests</li>
            <li>After logout: Both are cleared</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

