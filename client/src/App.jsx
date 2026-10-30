import { Route, Routes } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Thread from "./pages/Thread";
import Users from "./pages/Users";
import Profile from "./pages/Profile";
import NewGroup from "./pages/NewGroup";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Home />} />
          <Route path="users" element={<Users />} />
          <Route path="profile" element={<Profile />} />
          <Route path="chat/:id" element={<Thread />} />
          <Route path="groups/new" element={<NewGroup />} />
        </Route>
      </Route>
    </Routes>
  );
}
