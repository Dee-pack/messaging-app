import { createContext, useContext, useEffect, useState } from "react";
import { api } from "./api";

const AuthContext = createContext(null);
const TOKEN_KEY = "token";

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(
    Boolean(localStorage.getItem(TOKEN_KEY)),
  );

  // On load (or when the token changes), confirm the token is still valid
  useEffect(() => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    api("/auth/me", { token })
      .then(({ user }) => {
        if (!cancelled) setUser(user);
      })
      .catch((err) => {
        // Only drop the session if the server rejected the token,
        // not because of a network hiccup
        if (!cancelled && err.status === 401) {
          localStorage.removeItem(TOKEN_KEY);
          setToken(null);
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  function saveSession({ token, user }) {
    localStorage.setItem(TOKEN_KEY, token);
    setToken(token);
    setUser(user);
  }

  async function login(email, password) {
    saveSession(
      await api("/auth/login", { method: "POST", body: { email, password } }),
    );
  }

  async function register(username, email, password) {
    saveSession(
      await api("/auth/register", {
        method: "POST",
        body: { username, email, password },
      }),
    );
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{ user, setUser, token, loading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
