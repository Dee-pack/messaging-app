import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { api } from "../api";
import Avatar from "../components/Avatar";
import MenuButton from "../components/MenuButton";

export default function Users() {
  const { token } = useAuth();
  const { loadConversations } = useOutletContext();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");

  // Debounced search: wait 250ms after the last keystroke
  useEffect(() => {
    const timeout = setTimeout(async () => {
      try {
        const data = await api(`/users?search=${encodeURIComponent(search)}`, {
          token,
        });
        setUsers(data.users);
        setError("");
      } catch (err) {
        setError(err.message);
      }
    }, 250);
    return () => clearTimeout(timeout);
  }, [search, token]);

  async function startChat(userId) {
    try {
      const { conversation } = await api("/conversations", {
        method: "POST",
        token,
        body: { userId },
      });
      await loadConversations();
      navigate(`/chat/${conversation.id}`);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <header className="page-header">
        <MenuButton />
        <h2>Start a chat</h2>
      </header>
      <div className="page">
        <input
          type="search"
          placeholder="Search users…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {error && <p role="alert">{error}</p>}
        <ul className="user-list">
          {users.map((u) => (
            <li key={u.id}>
              <button onClick={() => startChat(u.id)}>
                <Avatar user={u} size={24} /> {u.displayName || u.username}{" "}
                <small>@{u.username}</small>
              </button>
            </li>
          ))}
        </ul>
        {users.length === 0 && <p>No users found.</p>}
      </div>
    </>
  );
}
