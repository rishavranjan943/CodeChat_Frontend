import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import { Typography, Grid, Button } from "@mui/material";

const SERVER_URL = process.env.REACT_APP_API_URL; // or use process.env.BACKEND_URL

export default function VideoCall({ roomId, user }) {
  const socketRef = useRef();
  const localStream = useRef(null);
  const peerConnections = useRef({});
  const videoRefs = useRef({});
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);

  useEffect(() => {
    socketRef.current = io(SERVER_URL);

    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
      localStream.current = stream;

      if (videoRefs.current[user.id]) {
        videoRefs.current[user.id].srcObject = stream;
      }

      socketRef.current.emit("join-video-room", { roomId, user });

      // --- WebRTC signaling ---
      socketRef.current.on("new-participant", ({ from, user: remoteUser }) => {
        if (peerConnections.current[from]) return;

        const pc = createPeerConnection(from, remoteUser);
        peerConnections.current[from] = pc;
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        pc.createOffer().then((offer) => {
          pc.setLocalDescription(offer);
          socketRef.current.emit("offer", { to: from, sdp: offer });
        });
      });

      socketRef.current.on("offer", async ({ from, sdp, user: remoteUser }) => {
        if (peerConnections.current[from]) return;

        const pc = createPeerConnection(from, remoteUser);
        peerConnections.current[from] = pc;

        try {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          stream.getTracks().forEach((track) => pc.addTrack(track, stream));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socketRef.current.emit("answer", { to: from, sdp: answer });
        } catch (err) {
          console.error("Offer handling error:", err);
        }
      });

      socketRef.current.on("answer", async ({ from, sdp }) => {
        const pc = peerConnections.current[from];
        if (!pc) return;
        if (pc.signalingState !== "have-local-offer") return;

        try {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        } catch (err) {
          console.error("Answer handling error:", err);
        }
      });

      socketRef.current.on("ice-candidate", ({ from, candidate }) => {
        const pc = peerConnections.current[from];
        if (pc && candidate) {
          pc.addIceCandidate(new RTCIceCandidate(candidate)).catch((err) =>
            console.error("ICE candidate error:", err)
          );
        }
      });

      socketRef.current.on("user-left", (socketId) => {
        if (peerConnections.current[socketId]) {
          peerConnections.current[socketId].close();
          delete peerConnections.current[socketId];
        }
        setRemoteUsers((prev) => prev.filter((u) => u.socketId !== socketId));
      });

      // Update media states of individual users
      socketRef.current.on("media-state-changed", ({ socketId, isVideoOn, isAudioOn }) => {
        setRemoteUsers((prev) =>
          prev.map((u) =>
            u.socketId === socketId ? { ...u, isVideoOn, isAudioOn } : u
          )
        );
      });

      // On new user join, receive full media sync
      socketRef.current.on("media-sync", (mediaStates) => {
        setRemoteUsers((prev) => {
          const updated = [...prev];
          mediaStates.forEach(({ socketId, isVideoOn, isAudioOn }) => {
            const index = updated.findIndex((u) => u.socketId === socketId);
            if (index !== -1) {
              updated[index] = {
                ...updated[index],
                isVideoOn,
                isAudioOn,
              };
            }
          });
          return updated;
        });
      });      
    });

    return () => {
      Object.values(peerConnections.current).forEach((pc) => pc.close());
      socketRef.current.disconnect();
    };
  }, [roomId, user]);

  const createPeerConnection = (remoteSocketId, remoteUser) => {
    const pc = new RTCPeerConnection();

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit("ice-candidate", {
          to: remoteSocketId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      const stream = event.streams[0];

      setRemoteUsers((prev) => {
        const exists = prev.find((u) => u.socketId === remoteSocketId);
        if (!exists) {
          return [
            ...prev,
            {
              socketId: remoteSocketId,
              email: remoteUser?.email || remoteSocketId,
              isVideoOn: remoteUser?.isVideoOn ?? true,
              isAudioOn: remoteUser?.isAudioOn ?? true,
            },
          ];
        }
        return prev;
      });
      

      const assignStream = () => {
        const ref = videoRefs.current[remoteSocketId];
        if (ref && !ref.srcObject) {
          ref.srcObject = stream;
        } else {
          setTimeout(assignStream, 200);
        }
      };

      assignStream();
    };

    return pc;
  };

  const toggleVideo = () => {
    const newState = !isVideoOn;
    setIsVideoOn(newState);
    localStream.current?.getVideoTracks().forEach((track) => (track.enabled = newState));
    socketRef.current.emit("media-state-changed", {
      roomId,
      socketId: socketRef.current.id,
      isVideoOn: newState,
      isAudioOn,
    });
  };

  const toggleAudio = () => {
    const newState = !isAudioOn;
    setIsAudioOn(newState);
    localStream.current?.getAudioTracks().forEach((track) => (track.enabled = newState));
    socketRef.current.emit("media-state-changed", {
      roomId,
      socketId: socketRef.current.id,
      isVideoOn,
      isAudioOn: newState,
    });
  };

  return (
    <div style={{ padding: "10px", width: "100%" }}>
      <Typography variant="h6">🎥 Video Call</Typography>

      <div style={{ marginBottom: "10px", display: "flex", gap: "10px" }}>
        <Button variant="contained" color="primary" onClick={toggleVideo}>
          {isVideoOn ? "Turn Off Video" : "Turn On Video"}
        </Button>
        <Button variant="contained" color="secondary" onClick={toggleAudio}>
          {isAudioOn ? "Mute" : "Unmute"}
        </Button>
      </div>

      <Grid container spacing={2}>
        {/* Local Video */}
        <Grid item xs={12} sm={6} md={4}>
          <video
            ref={(el) => (videoRefs.current[user.id] = el)}
            autoPlay
            playsInline
            muted
            style={{
              width: "100%",
              border: "2px solid green",
              borderRadius: "8px",
              background: isVideoOn ? "transparent" : "black",
            }}
          />
          <Typography align="center">{user.email || "You"}</Typography>
        </Grid>

        {/* Remote Videos */}
        {remoteUsers.map((remote) => (
          <Grid item xs={12} sm={6} md={4} key={remote.socketId}>
            <video
              ref={(el) => (videoRefs.current[remote.socketId] = el)}
              autoPlay
              playsInline
              muted={!remote.isAudioOn}
              style={{
                width: "100%",
                border: "2px solid blue",
                borderRadius: "8px",
                display: remote.isVideoOn ? "block" : "none",
                background: "black",
              }}
            />
            <Typography align="center">{remote.email}</Typography>
            {!remote.isAudioOn && <Typography align="center">🔇 Muted</Typography>}
          </Grid>
        ))}
      </Grid>
    </div>
  );
}
