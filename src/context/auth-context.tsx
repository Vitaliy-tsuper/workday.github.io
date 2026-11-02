"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export type DemoUser = {
  uid: string;
  email: string | null;
  displayName?: string | null;
};

type AuthContextType = {
  user: User | DemoUser | null;
  loading: boolean;
  signInAsGuest?: () => void;
  signOutGuest?: () => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | DemoUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('demo_user');
        if (stored) {
          try {
            setUser(JSON.parse(stored));
          } catch {
            localStorage.removeItem('demo_user');
          }
        }
      }
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
      } else {
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('demo_user');
          if (stored) {
            try {
              setUser(JSON.parse(stored));
            } catch {
              setUser(null);
            }
          } else {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInAsGuest = () => {
    const guestUser: DemoUser = {
      uid: 'guest_demo_user',
      email: 'guest@workday.local',
      displayName: 'Гість (Демо)',
    };
    if (typeof window !== 'undefined') {
      localStorage.setItem('demo_user', JSON.stringify(guestUser));
    }
    setUser(guestUser);
  };

  const signOutGuest = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('demo_user');
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInAsGuest, signOutGuest }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
