import { useAuth } from "../AuthContext";

export default function Home() {
  const { user, logout } = useAuth();

  return (
    <main>
      <h1>Welcome, {user.displayName || user.username}</h1>
      <button onClick={logout}>Log out</button>
    </main>
  );
}
