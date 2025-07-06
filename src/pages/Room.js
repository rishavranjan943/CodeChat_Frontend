import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axiosInstance from "../api/axios";
import { Container, Typography, Button, List, ListItem } from "@mui/material";
import { Editor } from "@monaco-editor/react";
import socket from "../socket";

export default function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [isCreator, setIsCreator] = useState(false);
  const [members, setMembers] = useState([]);
  const [code, setCode] = useState("// Start coding...");
  const [language, setLanguage] = useState("javascript");
  const [output, setOutput] = useState("");

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
        const user = JSON.parse(atob(token.split(".")[1]));
        const userId = user._id || user.id;

        setIsCreator(room.createdBy === userId);

        // Connect to socket and join room
        socket.connect();
        socket.emit("join-room", {
          roomId,
          user: { id: userId, email: user.email },
        });

        // Receive room members
        socket.on("room-members", (users) => {
          console.log(8);
          console.log(users);
          setMembers(users);
        });

        // Handle room deletion
        socket.on("room-deleted", () => {
          alert("Room has been deleted.");
          navigate("/dashboard");
        });

        
        
      } catch (err) {
        alert("Could not fetch room info.");
        navigate("/dashboard");
      }
    };

    fetchRoom();

    return () => {
      socket.off("room-members");
      socket.disconnect();
      setMembers([]);
    };
  }, [roomId, navigate]);

  useEffect(() => {
    socket.on("language-change", (lang) => {
      setLanguage(lang);
    });
    socket.on("code-change", (newCode) => {
      setCode(newCode);
    });
    socket.on("run-code", ({ output }) => {
      console.log(output)
      setOutput(output);
    });
  }, []);

  const handleLanguageChange = (e) => {
    const selectedLang = e.target.value;
    setLanguage(selectedLang);
    socket.emit("language-change", { roomId, language: selectedLang });
  };

  const handleEditorChange = (value) => {
    setCode(value);
    socket.emit("code-change", { roomId, code: value });
  };

  const deleteRoom = async () => {
    if (!window.confirm("Are you sure you want to delete this room?")) return;

    try {
      const token = localStorage.getItem("jwt");

      await axiosInstance.delete(`/rooms/${roomId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      alert("Room deleted.");
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Room deletion failed.");
    }
  };


  return (
    <Container sx={{ mt: 8 }}>
      <Typography variant="h4" gutterBottom>
        Room: {roomId}
      </Typography>

      {isCreator && (
        <Button
          variant="outlined"
          color="error"
          sx={{ mt: 2, mb: 4 }}
          onClick={deleteRoom}
        >
          Delete Room
        </Button>
      )}

      {!isCreator && (
        <Button
          variant="contained"
          color="secondary"
          sx={{ mt: 2, mb: 4 }}
          onClick={() => {
            socket.emit("leave-room", roomId);
            socket.disconnect();
            navigate("/dashboard");
          }}
        >
          Leave Room
        </Button>
      )}

      <Typography variant="h6">👥 Members in Room:</Typography>
      <List>
        {members.map((member, index) => (
          <ListItem key={index}>
            {member?.email || member?.id || "Anonymous"}
          </ListItem>
        ))}
      </List>

      <Typography variant="h6" sx={{ mt: 4 }}>
        👨‍💻 Code Editor:
      </Typography>
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

      <Editor
        height="400px"
        language={language} // ← dynamic
        value={code}
        onChange={handleEditorChange}
        theme="vs-dark"
      />

      <Button
          variant="contained"
          color="secondary"
          sx={{ mt: 2, mb: 4 }}
          onClick={() => {
            socket.emit("run-code", {
              roomId,
              code,
              language,
            });
          }}
        >Run Code</Button>

        <Typography variant="h6" sx={{ mt: 4 }}>
        🖨️ Output:
      </Typography>
      <pre style={{ background: "#1e1e1e", color: "#fff", padding: "10px", borderRadius: "5px", whiteSpace: "pre-wrap" }}>
        {output || "No output yet..."}
      </pre>
      
    </Container>
  );
}
