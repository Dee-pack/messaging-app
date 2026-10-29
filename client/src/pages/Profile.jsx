import { useState } from "react";
import { useAuth } from "../AuthContext";
import { api } from "../api";
import Avatar from "../components/Avatar";
import { resizeToJpeg } from "../utils";
import { Link } from "react-router-dom";

export default function Profile() {
  const { user, setUser, token } = useAuth();
  const [displayName, setDisplayName] = useState(user.displayName || "");
  const [bio, setBio] = useState(user.bio || "");
  const [errors, setErrors] = useState([]);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors([]);
    setSaved(false);
    setSaving(true);
    try {
      const data = await api("/users/me", {
        method: "PUT",
        token,
        body: { displayName, bio },
      });
      setUser(data.user);
      setSaved(true);
    } catch (err) {
      setErrors(err.messages || ["Something went wrong"]);
    } finally {
      setSaving(false);
    }
  }

  async function handleFile(e) {
    const file = e.target.files[0];
    e.target.value = ""; // lets you pick the same file again later
    if (!file) return;

    setErrors([]);
    setSaved(false);

    if (!file.type.startsWith("image/")) {
      setErrors(["Please choose an image file"]);
      return;
    }

    setUploading(true);
    try {
      const blob = await resizeToJpeg(file);
      const form = new FormData();
      form.append("avatar", blob, "avatar.jpg");

      const data = await api("/users/me/avatar", {
        method: "POST",
        token,
        body: form,
      });
      setUser(data.user);
    } catch (err) {
      setErrors(err.messages || ["Could not upload that image"]);
    } finally {
      setUploading(false);
    }
  }

  async function removeAvatar() {
    setErrors([]);
    setUploading(true);
    try {
      const data = await api("/users/me", {
        method: "PUT",
        token,
        body: { avatarUrl: "" },
      });
      setUser(data.user);
    } catch (err) {
      setErrors(err.messages || ["Something went wrong"]);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="page">
      <Link to="/" className="back">
        ← Chats
      </Link>
      <h2>Your profile</h2>

      <Avatar user={user} size={96} />
      <div className="avatar-actions">
        <label>
          {uploading ? "Uploading…" : "Change photo"}
          <input
            type="file"
            accept="image/*"
            onChange={handleFile}
            disabled={uploading}
          />
        </label>
        {user.avatarUrl && (
          <button
            className="secondary"
            type="button"
            onClick={removeAvatar}
            disabled={uploading}
          >
            Remove photo
          </button>
        )}
      </div>

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
