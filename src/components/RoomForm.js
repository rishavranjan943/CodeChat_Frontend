import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../api/axios";
import { TextField, Button, Container, Typography } from "@mui/material";

export default function RoomForm() {
  const [roomId, setRoomId] = useState("");
  const navigate = useNavigate();

  const createRoom = async () => {
    try {
      const token = localStorage.getItem("jwt");
      await axiosInstance.post("/rooms/create", { roomId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      navigate(`/room/${roomId}`);
    } catch (err) {
      alert(err.response?.data?.error || "Create failed");
    }
  };

  const joinRoom = () => {
    navigate(`/room/${roomId}`);
  };

  return (
    <Container sx={{ mt: 8 }}>
      <Typography variant="h5">Create or Join Room</Typography>
      <TextField fullWidth label="Room ID" value={roomId} onChange={(e) => setRoomId(e.target.value)} sx={{ mt: 2 }} />
      <Button variant="contained" sx={{ mt: 2, mr: 1 }} onClick={createRoom}>Create Room</Button>
      <Button variant="outlined" sx={{ mt: 2 }} onClick={joinRoom}>Join Room</Button>
    </Container>
  );
}
