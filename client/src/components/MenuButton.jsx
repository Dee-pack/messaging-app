import { useOutletContext } from "react-router-dom";

export default function MenuButton() {
  const { sidebarOpen, toggleSidebar } = useOutletContext();

  return (
    <button
      type="button"
      className="icon-button"
      onClick={toggleSidebar}
      aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
      aria-expanded={sidebarOpen}
    >
      <span className="burger" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
    </button>
  );
}
