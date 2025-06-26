import { useState } from "react";
import api from "../auth/api";
import { useNavigate } from "react-router-dom";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleRegister = async () => {
    try {
      await api.post("/register", { email, password });
      alert("Registration successful. Please login.");
      navigate("/login");
    } catch (e) {
      alert("Registration failed.");
    }
  };

  return (
    <div>
      <h2>Register (Game Developer)</h2>
      <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
      <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
      <button onClick={handleRegister}>Register</button>
    </div>
  );
}