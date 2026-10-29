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

  useEffect(() => {
    async function load() {
      try {
        const data = await api(`/users?search=${encodeURIComponent(search)}`, {
          token,
        });
        setUsers(data.users);
        setError("");
      } catch (err) {
        setError(err.message);
      }
    }

    const timeout = setTimeout(load, 250); // debounce typing
    const interval = setInterval(load, 15000); // keep presence fresh
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
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

  // Online people first; the sort is stable, so each group stays alphabetical
  const sorted = [...users].sort((a, b) => Number(b.online) - Number(a.online));

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
          {sorted.map((u) => (
            <li key={u.id}>
              <button onClick={() => startChat(u.id)}>
                <Avatar user={u} size={28} showStatus />{" "}
                {u.displayName || u.username} <small>@{u.username}</small>
              </button>
            </li>
          ))}
        </ul>
        {users.length === 0 && <p>No users found.</p>}
      </div>
    </>
  );
}
