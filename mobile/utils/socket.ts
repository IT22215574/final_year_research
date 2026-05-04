import { io } from "socket.io-client";

const API = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.8.135:5000';

export const socket = io(`${API}`, {
  transports: ["websocket"],
});
