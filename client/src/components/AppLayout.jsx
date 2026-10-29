import { useCallback, useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { api } from "../api";
import { conversationAvatarUser, conversationTitle } from "../utils";
import Avatar from "./Avatar";

export default function AppLayout() {
  const { user, token, logout } = useAuth();
  const { pathname } = useLocation();
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

  // On phones: the home route shows the list, every other route shows the page
  const view = pathname === "/" ? "show-list" : "show-main";

  return (
    <div className={`app ${view}`}>
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="me">
            <Avatar user={user} size={40} />
            <strong>{user.displayName || user.username}</strong>
          </div>
          <nav className="sidebar-nav">
            <Link to="/users">New chat</Link>
            <Link to="/profile">Profile</Link>
            <button className="link-button" onClick={logout}>
              Log out
            </button>
          </nav>
        </div>

        <div className="conversations">
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
        </div>
      </aside>

      <section className="main">
        <Outlet context={{ conversations, loadConversations }} />
      </section>
    </div>
  );
}
