import { io } from "socket.io-client";

const socket = io("http://localhost:4000", {
  transports: ["websocket"], // Force WebSocket to avoid polling issues
  autoConnect: false,
  withCredentials: true,
});

export default socket;
