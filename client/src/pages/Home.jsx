import MenuButton from "../components/MenuButton";

export default function Home() {
  return (
    <>
      <header className="page-header">
        <MenuButton />
      </header>
      <div className="page">
        <p>Select a conversation, or start a new chat.</p>
      </div>
    </>
  );
}
