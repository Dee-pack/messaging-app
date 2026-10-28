import { useState } from "react";

// Shows the user's picture, or their first initial if there's no picture
// or the URL fails to load
export default function Avatar({ user, size = 32 }) {
  const [failedUrl, setFailedUrl] = useState(null);

  const url = user?.avatarUrl;
  const name = user?.displayName || user?.username || "?";
  const style = { width: size, height: size, fontSize: size / 2 };

  if (url && url !== failedUrl) {
    return (
      <img
        className="avatar"
        src={url}
        alt=""
        style={style}
        onError={() => setFailedUrl(url)}
      />
    );
  }

  return (
    <span className="avatar avatar-fallback" style={style}>
      {name[0].toUpperCase()}
    </span>
  );
}
