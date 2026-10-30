import { useCallback, useEffect, useRef, useState } from "react";
import { useOutletContext, useParams } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { api } from "../api";
import Avatar from "../components/Avatar";
import MenuButton from "../components/MenuButton";
import {
  conversationAvatarUser,
  conversationTitle,
  resizeToJpeg,
} from "../utils";

export default function Thread() {
  const { id } = useParams();
  const { user, token } = useAuth();
  const { conversations, loadConversations } = useOutletContext();

  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | notfound
  const [text, setText] = useState("");
  const [image, setImage] = useState(null); // { file, previewUrl }
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const lastIdRef = useRef(0);
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);

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
    setText("");
    setImage(null);
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

  // Free the preview's memory when it's removed, replaced, or the page closes
  useEffect(() => {
    return () => {
      if (image) URL.revokeObjectURL(image.previewUrl);
    };
  }, [image]);

  // Scroll to the newest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  function chooseImage(e) {
    const file = e.target.files[0];
    e.target.value = ""; // lets you pick the same file again later
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file");
      return;
    }
    setError("");
    setImage({ file, previewUrl: URL.createObjectURL(file) });
  }

  async function handleSend(e) {
    e.preventDefault();
    const content = text.trim();
    if (!content && !image) return;

    setSending(true);
    setError("");
    try {
      let body;
      if (image) {
        const blob = await resizeToJpeg(image.file, 1280);
        body = new FormData();
        body.append("image", blob, "photo.jpg");
        if (content) body.append("content", content);
      } else {
        body = { content };
      }

      const data = await api(`/conversations/${id}/messages`, {
        method: "POST",
        token,
        body,
      });
      addMessages([data.message]);
      setText("");
      setImage(null);
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
  const other =
    conversation && !conversation.isGroup
      ? conversationAvatarUser(conversation, user)
      : null;

  return (
    <div className="thread" key={id}>
      <header className="thread-header">
        <MenuButton />
        {conversation && (
          <Avatar
            user={conversationAvatarUser(conversation, user)}
            size={36}
            showStatus
          />
        )}
        <div>
          <h2>{title}</h2>
          {other?.online && <small className="status-text">Online</small>}
        </div>
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

            {m.imageUrl && (
              <a
                href={m.imageUrl}
                target="_blank"
                rel="noreferrer"
                className="message-image-link"
              >
                <img
                  className="message-image"
                  src={m.imageUrl}
                  alt="Shared photo"
                />
              </a>
            )}
            {m.content && <div>{m.content}</div>}

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

      {image && (
        <div className="attachment">
          <img src={image.previewUrl} alt="Selected photo" />
          <button
            type="button"
            className="secondary"
            onClick={() => setImage(null)}
            aria-label="Remove photo"
          >
            ✕
          </button>
        </div>
      )}

      <form className="composer" onSubmit={handleSend}>
        <button
          type="button"
          className="icon-button"
          aria-label="Attach a photo"
          onClick={() => fileInputRef.current?.click()}
          disabled={sending}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
        </button>
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={chooseImage}
          hidden
        />

        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={image ? "Add a caption…" : "Type a message…"}
          maxLength={2000}
        />
        <button type="submit" disabled={sending || (!text.trim() && !image)}>
          Send
        </button>
      </form>
      {error && (
        <p role="alert" className="page">
          {error}
        </p>
      )}
    </div>
  );
}
