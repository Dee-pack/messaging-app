import { useCallback, useEffect, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { api } from "../api";
import Avatar from "./Avatar";
import { conversationAvatarUser, conversationTitle } from "../utils";

export default function AppLayout() {
  const { user, token, logout } = useAuth();
  const [conversations, setConversations] = useState([]);

  const loadConversations = useCallback(async () => {
    try {
      const data = await api("/conversations", { token });
      setConversations(data.conversations);
    } catch {
      // keep the current list and try again on the next tick
    }
  }, [token]);

  useEffect(() => {
    loadConversations();
    const interval = setInterval(loadConversations, 5000);
    return () => clearInterval(interval);
  }, [loadConversations]);

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="me">
            <Avatar user={user} size={40} />
            <strong>{user.displayName || user.username}</strong>
          </div>
          <div>
            <Link to="/users">New chat</Link> ·{" "}
            <Link to="/profile">Profile</Link> ·{" "}
            <button onClick={logout}>Log out</button>
          </div>
        </div>

        {conversations.length === 0 && (
          <p className="empty">No conversations yet.</p>
        )}

        {conversations.map((c) => (
          <NavLink
            key={c.id}
            to={`/chat/${c.id}`}
            className="conversation-link"
          >
            <Avatar user={conversationAvatarUser(c, user)} size={40} />
            <div className="conversation-text">
              <div>{conversationTitle(c, user)}</div>
              <small>
                {c.lastMessage
                  ? c.lastMessage.content || "📷 Image"
                  : "No messages yet"}
              </small>
            </div>
          </NavLink>
        ))}
      </aside>

      <section className="main">
        <Outlet context={{ conversations, loadConversations }} />
      </section>
    </div>
  );
}
