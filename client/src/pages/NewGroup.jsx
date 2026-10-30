import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { api } from "../api";
import Avatar from "../components/Avatar";
import MenuButton from "../components/MenuButton";

export default function NewGroup() {
  const { token } = useAuth();
  const { loadConversations } = useOutletContext();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState([]); // search results
  const [selected, setSelected] = useState([]); // chosen users, kept across searches
  const [errors, setErrors] = useState([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      try {
        const data = await api(`/users?search=${encodeURIComponent(search)}`, {
          token,
        });
        setUsers(data.users);
      } catch (err) {
        setErrors([err.message]);
      }
    }, 250);
    return () => clearTimeout(timeout);
  }, [search, token]);

  const isSelected = (id) => selected.some((u) => u.id === id);

  function toggle(user) {
    setSelected((prev) =>
      prev.some((u) => u.id === user.id)
        ? prev.filter((u) => u.id !== user.id)
        : [...prev, user],
    );
  }

  async function handleCreate(e) {
    e.preventDefault();
    setErrors([]);
    setCreating(true);
    try {
      const { conversation } = await api("/conversations", {
        method: "POST",
        token,
        body: { name, userIds: selected.map((u) => u.id) },
      });
      await loadConversations();
      navigate(`/chat/${conversation.id}`);
    } catch (err) {
      setErrors(err.messages || ["Something went wrong"]);
      setCreating(false);
    }
  }

  return (
    <>
      <header className="page-header">
        <MenuButton />
        <h2>New group</h2>
      </header>

      <div className="page">
        <form onSubmit={handleCreate}>
          <label>
            Group name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              placeholder="e.g. Study group"
              required
            />
          </label>

          <p className="hint">
            {selected.length} selected
            {selected.length < 2 && " (pick at least 2)"}
          </p>
          {selected.length > 0 && (
            <div className="chips">
              {selected.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  className="nav-pill"
                  onClick={() => toggle(u)}
                  aria-label={`Remove ${u.displayName || u.username}`}
                >
                  {u.displayName || u.username} ✕
                </button>
              ))}
            </div>
          )}

          <input
            type="search"
            placeholder="Search people…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && e.preventDefault()} // Enter shouldn't create the group
          />

          <ul className="user-list">
            {users.map((u) => (
              <li key={u.id}>
                <label className="user-option">
                  <input
                    type="checkbox"
                    checked={isSelected(u.id)}
                    onChange={() => toggle(u)}
                  />
                  <Avatar user={u} size={28} showStatus />{" "}
                  {u.displayName || u.username} <small>@{u.username}</small>
                </label>
              </li>
            ))}
          </ul>
          {users.length === 0 && <p>No users found.</p>}

          {errors.map((msg) => (
            <p key={msg} role="alert">
              {msg}
            </p>
          ))}

          <button
            type="submit"
            disabled={creating || !name.trim() || selected.length < 2}
          >
            {creating ? "Creating…" : "Create group"}
          </button>
        </form>
      </div>
    </>
  );
}
