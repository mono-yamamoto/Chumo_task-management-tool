"use client";

import { useEffect, useState } from "react";
import { User as FirebaseUser, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { checkUserAllowed, getUser } from "@/lib/firebase/auth";
import { User } from "@/types";
import { useRouter } from "next/navigation";

export function useAuth() {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!auth) {
      console.error("Firebase Auth is not initialized");
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFirebaseUser(firebaseUser);
      if (firebaseUser) {
        try {
          const isAllowed = await checkUserAllowed(firebaseUser.uid);
          if (!isAllowed) {
            if (auth) {
              await signOut(auth);
            }
            setUser(null);
            setLoading(false);
            router.push("/login?error=not_allowed");
            return;
          }
          const userData = await getUser(firebaseUser.uid);
          setUser(userData);
        } catch (error) {
          console.error("Error in auth state change:", error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const login = async () => {
    if (!auth) {
      throw new Error("Firebase Auth is not initialized");
    }
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const logout = async () => {
    if (!auth) {
      return;
    }
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  };

  return {
    firebaseUser,
    user,
    loading,
    login,
    logout,
  };
}

