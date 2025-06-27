import { useState } from "react";
import api from "../auth/api";
import { useNavigate } from "react-router-dom";
import logo from "../logo192.png";
import "./RegisterPage.css";

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
    <div className="register-page">
      <div className="register-container">
        <img src={logo} alt="TDA Logo" className="register-logo" />
        <h2 className="register-title">TDA Analytics Game</h2>
        <h3 className="register-title">Разработчик игр зарегистрируйся!</h3>

        <input
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="register-input"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="register-input"
        />

        <button onClick={handleRegister} className="register-button">
          Register
        </button>

        <p>
          У вас уже есть аккаунт?{" "}
          <button onClick={() => navigate("/login")} className="register-link">
            Войти здесь
          </button>
        </p>
      </div>
    </div>
  );
}