import { io } from "socket.io-client";

const socket = io(process.env.REACT_APP_API_URL, {
  transports: ["websocket"], // Force WebSocket to avoid polling issues
  autoConnect: false,
  withCredentials: true,
});

export default socket;
