import { useState } from "react";

// Shows the user's picture, or their first initial if there's no picture
// or the URL fails to load. With showStatus, adds a green dot when online.
export default function Avatar({ user, size = 32, showStatus = false }) {
  const [failedUrl, setFailedUrl] = useState(null);

  const url = user?.avatarUrl;
  const name = user?.displayName || user?.username || "?";
  const style = { width: size, height: size, fontSize: size / 2 };

  const picture =
    url && url !== failedUrl ? (
      <img
        className="avatar"
        src={url}
        alt=""
        style={style}
        onError={() => setFailedUrl(url)}
      />
    ) : (
      <span className="avatar avatar-fallback" style={style}>
        {name[0].toUpperCase()}
      </span>
    );

  if (!showStatus) return picture;

  return (
    <span className="avatar-wrap">
      {picture}
      {user?.online && <span className="status-dot" title="Online" />}
    </span>
  );
}
