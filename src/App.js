import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Room from "./pages/Room";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";



function TokenHandler() {
  const navigate = useNavigate();
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (token) {
      localStorage.setItem("jwt", token);
      navigate("/dashboard");
    }
  }, []);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <TokenHandler />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard/>
          </ProtectedRoute>
        } />
        <Route path="/room/:roomId" element={
            <Room/>
        } />
      </Routes>
    </BrowserRouter>
  );
}
