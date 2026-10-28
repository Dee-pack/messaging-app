import { useState } from "react";
import { useAuth } from "../AuthContext";
import { api } from "../api";
import Avatar from "../components/Avatar";

export default function Profile() {
  const { user, setUser, token } = useAuth();
  const [displayName, setDisplayName] = useState(user.displayName || "");
  const [bio, setBio] = useState(user.bio || "");
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || "");
  const [errors, setErrors] = useState([]);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors([]);
    setSaved(false);
    setSaving(true);
    try {
      const data = await api("/users/me", {
        method: "PUT",
        token,
        body: { displayName, bio, avatarUrl },
      });
      setUser(data.user); // updates the sidebar and everywhere else immediately
      setSaved(true);
    } catch (err) {
      setErrors(err.messages || ["Something went wrong"]);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <h2>Your profile</h2>

      <Avatar
        user={{ displayName, username: user.username, avatarUrl }}
        size={96}
      />

      <form onSubmit={handleSubmit}>
        <p>
          Username: <strong>@{user.username}</strong> · {user.email}
        </p>

        <label>
          Display name
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={40}
            required
          />
        </label>

        <label>
          Bio
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={200}
            rows={3}
          />
          <small>{bio.length}/200</small>
        </label>

        <label>
          Avatar URL
          <input
            type="url"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://example.com/me.png"
          />
        </label>

        {errors.map((msg) => (
          <p key={msg} role="alert">
            {msg}
          </p>
        ))}
        {saved && <p>Profile saved.</p>}

        <button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}
