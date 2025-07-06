import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Typography, Button } from "@mui/material";

export default function Dashboard() {
  const [email, setEmail] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("jwt");
    if (!token) return navigate("/");

    try {
      const decoded = JSON.parse(atob(token.split(".")[1]));
      setEmail(decoded.email);
    } catch {
      localStorage.removeItem("jwt");
      navigate("/");
    }
  }, []);

  const logout = () => {
    localStorage.removeItem("jwt");
    navigate("/");
  };

  return (
    <Container sx={{ textAlign: "center", mt: 10 }}>
      <Typography variant="h4" gutterBottom>Dashboard</Typography>
      <Typography variant="body1" gutterBottom>
        Logged in as: <strong>{email}</strong>
      </Typography>
      <Button variant="contained" color="error" onClick={logout}>
        Logout
      </Button>
    </Container>
  );
}
