import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import axiosInstance from "../api/axios";
import {
  Container,
  Typography,
  Button,
  List,
  ListItem,
  Drawer,
  Box,
  Divider,
  IconButton,
  ListItemText,
} from "@mui/material";
import { Editor } from "@monaco-editor/react";
import MenuIcon from "@mui/icons-material/Menu";
import socket from "../socket";
import VideoCall from "../components/VideoCall";

export default function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [isCreator, setIsCreator] = useState(false);
  const [members, setMembers] = useState([]);
  const [code, setCode] = useState("// Start coding...");
  const [language, setLanguage] = useState("javascript");
  const [output, setOutput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [user, setUser] = useState(null);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  // --- Fetch Room Info & Join Socket Room ---
  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const token = localStorage.getItem("jwt");
        if (!token) {
          alert("Unauthorized");
          navigate("/");
          return;
        }

        const res = await axiosInstance.get(`/rooms/${roomId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const room = res.data.room;
        const decodedUser = JSON.parse(atob(token.split(".")[1]));
        const userId = decodedUser._id || decodedUser.id;
        const currentUser = { id: userId, email: decodedUser.email };
        setUser(currentUser);

        setIsCreator(room.createdBy === userId);

        socket.connect();
        socket.emit("join-room", { roomId, user: currentUser });

        socket.on("room-members", (users) => {
          const unique = Array.from(new Map(users.map((u) => [u.id, u])).values());
          setMembers(unique);
        });

        socket.on("room-deleted", () => {
          navigate("/dashboard");
        });
      } catch (err) {
        alert("Could not fetch room info.");
        navigate("/dashboard");
      }
    };

    fetchRoom();

    return () => {
      socket.emit("leave-room", roomId);
      socket.off("room-members");
      socket.off("room-deleted");
      socket.disconnect();
      setMembers([]);
    };
  }, [roomId, navigate]);

  // --- Code Collaboration Events ---
  useEffect(() => {
    const handleLangChange = (lang) => setLanguage(lang);
    const handleCodeChange = (newCode) => setCode(newCode);
    const handleOutput = ({ output }) => setOutput(output);

    socket.on("language-change", handleLangChange);
    socket.on("code-change", handleCodeChange);
    socket.on("code-output", handleOutput);

    return () => {
      socket.off("language-change", handleLangChange);
      socket.off("code-change", handleCodeChange);
      socket.off("code-output", handleOutput);
    };
  }, [roomId]);

  const handleLanguageChange = (e) => {
    const selectedLang = e.target.value;
    setLanguage(selectedLang);
    socket.emit("language-change", { roomId, language: selectedLang });
  };

  const handleEditorChange = useCallback(
    (value) => {
      setCode(value);
      socket.emit("code-change", { roomId, code: value });
    },
    [roomId]
  );

  const runCode = () => {
    socket.emit("run-code", { roomId, code, language });
  };

  const deleteRoom = async () => {
    if (!window.confirm("Are you sure you want to delete this room?")) return;
    try {
      const token = localStorage.getItem("jwt");
      await axiosInstance.delete(`/rooms/${roomId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert('Room deleted')
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Room deletion failed.");
    }
  };

  return (
    <Container sx={{ mt: 8, ml: sidebarOpen ? "260px" : "0", transition: "margin-left 0.3s" }}>
      {/* Sidebar */}
      <Drawer variant="persistent" anchor="left" open={sidebarOpen}>
        <Box sx={{ width: 250, p: 2, mt: 4 }}>
          <Typography variant="h6">Room ID: {roomId}</Typography>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1">👥 Members</Typography>
          <List>
            {members.map((member) => (
              <ListItem key={member.id}>
                <ListItemText primary={member.email || member.id} />
              </ListItem>
            ))}
          </List>
          <Divider sx={{ my: 2 }} />
          {isCreator ? (
            <Button variant="contained" color="error" fullWidth onClick={deleteRoom}>
              Delete Room
            </Button>
          ) : (
            <Button
              variant="outlined"
              color="secondary"
              fullWidth
              onClick={() => {
                socket.emit("leave-room", roomId);
                socket.disconnect();
                navigate("/dashboard");
              }}
            >
              Leave Room
            </Button>
          )}
        </Box>
      </Drawer>

      {/* Toggle Button */}
      <IconButton
        onClick={toggleSidebar}
        sx={{ position: "fixed", top: 10, left: 10, zIndex: 2000, background: "#fff" }}
      >
        <MenuIcon />
      </IconButton>

      {/* Main Split Layout */}
      <Box sx={{ display: "flex", flexDirection: "row", gap: 2 }}>
        {/* Code Editor */}
        <Box sx={{ width: "50%" }}>
          <Typography variant="h6" sx={{ mt: 4 }}>
            👨‍💻 Code Editor
          </Typography>

          {/* Language Selector */}
          <div style={{ marginTop: "20px", marginBottom: "10px" }}>
            <label>Select Language: </label>
            <select value={language} onChange={handleLanguageChange}>
              <option value="javascript">JavaScript</option>
              <option value="c">C</option>
              <option value="python">Python</option>
              <option value="cpp">C++</option>
              <option value="java">Java</option>
            </select>
          </div>

          {/* Editor */}
          <Editor
            height="400px"
            language={language}
            value={code}
            onChange={handleEditorChange}
            theme="vs-dark"
          />

          {/* Run Code */}
          <Button variant="contained" color="secondary" sx={{ mt: 2, mb: 4 }} onClick={runCode}>
            Run Code
          </Button>

          {/* Output */}
          <Typography variant="h6" sx={{ mt: 2 }}>
            🖨️ Output:
          </Typography>
          <pre
            style={{
              background: "#1e1e1e",
              color: "#fff",
              padding: "10px",
              borderRadius: "5px",
              whiteSpace: "pre-wrap",
              minHeight: "80px",
            }}
          >
            {output || "No output yet..."}
          </pre>
        </Box>

        {/* Video Call Section */}
        <Box sx={{ width: "50%" }}>
          {user && <VideoCall roomId={roomId} user={user} />}
        </Box>
      </Box>
    </Container>
  );
}
