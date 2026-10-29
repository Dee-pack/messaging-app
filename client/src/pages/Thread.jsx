import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../AuthContext";
import { api } from "../api";
import { Link, useOutletContext, useParams } from "react-router-dom";
import Avatar from "../components/Avatar";
import { conversationAvatarUser, conversationTitle } from "../utils";
import MenuButton from "../components/MenuButton";

export default function Thread() {
  const { id } = useParams();
  const { user, token } = useAuth();
  const { conversations, loadConversations } = useOutletContext();

  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | notfound
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const lastIdRef = useRef(0);
  const bottomRef = useRef(null);

  // Append messages, skipping any we already have. Both polling and
  // sending can deliver the same message, so de-duplicate by id.
  const addMessages = useCallback((incoming) => {
    if (incoming.length === 0) return;
    lastIdRef.current = Math.max(
      lastIdRef.current,
      ...incoming.map((m) => m.id),
    );
    setMessages((prev) => {
      const known = new Set(prev.map((m) => m.id));
      return [...prev, ...incoming.filter((m) => !known.has(m.id))];
    });
  }, []);

  // Load the thread, then poll for newer messages
  useEffect(() => {
    let cancelled = false;
    let interval;

    setMessages([]);
    setStatus("loading");
    setError("");
    lastIdRef.current = 0;

    async function poll() {
      try {
        const query = lastIdRef.current ? `?after=${lastIdRef.current}` : "";
        const data = await api(`/conversations/${id}/messages${query}`, {
          token,
        });
        if (cancelled) return;
        setStatus("ready");
        addMessages(data.messages);
      } catch (err) {
        if (cancelled) return;
        if (err.status === 404 || err.status === 400) {
          setStatus("notfound");
          clearInterval(interval);
        }
      }
    }

    poll();
    interval = setInterval(poll, 3000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [id, token, addMessages]);

  // Scroll to the newest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend(e) {
    e.preventDefault();
    const content = text.trim();
    if (!content) return;

    setSending(true);
    setError("");
    try {
      const data = await api(`/conversations/${id}/messages`, {
        method: "POST",
        token,
        body: { content },
      });
      addMessages([data.message]);
      setText("");
      loadConversations();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

 if (status === "notfound") {
  return (
    <>
      <header className="page-header">
        <MenuButton />
      </header>
      <div className="page">
        <p>This conversation doesn't exist, or you're not part of it.</p>
      </div>
    </>
  );
}

  const conversation = conversations.find((c) => c.id === Number(id));
  const title = conversation ? conversationTitle(conversation, user) : "Chat";

  return (
    <div className="thread" key={id}>
      <header className="thread-header">
        <MenuButton />
        {conversation && (
          <Avatar user={conversationAvatarUser(conversation, user)} size={36} />
        )}
        <h2>{title}</h2>
      </header>

      <div className="messages">
        {status === "loading" && <p>Loading…</p>}
        {status === "ready" && messages.length === 0 && (
          <p>No messages yet. Say hi!</p>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={`message ${m.senderId === user.id ? "mine" : ""}`}
          >
            {m.senderId !== user.id && (
              <small className="message-sender">
                <Avatar user={m.sender} size={20} />{" "}
                {m.sender.displayName || m.sender.username}
              </small>
            )}
            <div>{m.content}</div>
            <small>
              {new Date(m.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </small>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form className="composer" onSubmit={handleSend}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message…"
          maxLength={2000}
        />
        <button type="submit" disabled={sending || !text.trim()}>
          Send
        </button>
      </form>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
