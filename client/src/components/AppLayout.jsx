import { useCallback, useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { api } from "../api";
import { conversationAvatarUser, conversationTitle } from "../utils";
import Avatar from "./Avatar";

const isMobile = () => window.matchMedia("(max-width: 700px)").matches;

// Desktop: remember the last choice. Phone: start with the drawer open
// on the home screen (so you see your chats) and closed everywhere else.
function initialSidebarOpen(pathname) {
  if (isMobile()) return pathname === "/";
  try {
    return localStorage.getItem("sidebarOpen") !== "false";
  } catch {
    return true;
  }
}

export default function AppLayout() {
  const { user, token, logout } = useAuth();
  const { pathname } = useLocation();
  const [conversations, setConversations] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    initialSidebarOpen(pathname),
  );

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

  // Escape closes the drawer on phones
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape" && isMobile()) setSidebarOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Tell the server we're online: once now, then every 30 seconds
  useEffect(() => {
    const beat = () =>
      api("/users/me/heartbeat", { method: "POST", token }).catch(() => {});
    beat();
    const interval = setInterval(beat, 30000);
    return () => clearInterval(interval);
  }, [token]);

  function toggleSidebar() {
    const next = !sidebarOpen;
    setSidebarOpen(next);
    if (!isMobile()) {
      try {
        localStorage.setItem("sidebarOpen", String(next));
      } catch {
        // storage unavailable; the choice just won't be remembered
      }
    }
  }

  // After picking something on a phone, get the drawer out of the way
  function closeOnMobile() {
    if (isMobile()) setSidebarOpen(false);
  }

  return (
    <div className={`app ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
      <aside className="sidebar" aria-label="Conversations">
        <div className="sidebar-inner">
          <div className="sidebar-header">
            <div className="me">
              <Avatar user={user} size={40} />
              <strong>{user.displayName || user.username}</strong>
            </div>
            <nav className="sidebar-nav">
              <Link to="/users" className="nav-pill" onClick={closeOnMobile}>
                New chat
              </Link>
              <Link to="/profile" className="nav-pill" onClick={closeOnMobile}>
                Profile
              </Link>
              <button className="nav-pill" onClick={logout}>
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
                onClick={closeOnMobile}
              >
                <Avatar
                  user={conversationAvatarUser(c, user)}
                  size={40}
                  showStatus
                />
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
        </div>
      </aside>

      <div className="backdrop" onClick={() => setSidebarOpen(false)} />

      <section className="main">
        <Outlet
          context={{
            conversations,
            loadConversations,
            sidebarOpen,
            toggleSidebar,
          }}
        />
      </section>
    </div>
  );
}
