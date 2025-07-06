import axios from "axios";

const axiosInstance = axios.create({
  baseURL: "http://localhost:4000/api",
  proxy: false, 
  headers: {
    "Content-Type": "application/json"
  }
});

export default axiosInstance;
