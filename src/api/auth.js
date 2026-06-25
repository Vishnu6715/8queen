import axios from "axios";

const API = axios.create({
  baseURL: "http://127.0.0.1:5001/api/auth",
});

export default API;