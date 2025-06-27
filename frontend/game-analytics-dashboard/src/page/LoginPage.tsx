import { useState } from "react";
import api from "../auth/api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import logo from "../logo192.png";
import "./LoginPage.css";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { setToken } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const res = await api.post("/login", { email, password });
      setToken(res.data.token);
      navigate("/profile");
    } catch (e) {
      alert("Login failed.");
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <img src={logo} alt="TDA Logo" className="register-logo" />
        <h2 className="login-title">TDA Analytics Game</h2>
        <h3 className="login-title">Войдите как разработчик игр</h3>

        <input
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="login-input"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="login-input"
        />

        <button onClick={handleLogin} className="login-button">
          Login
        </button>

        <p>
          У вас нет учетной записи?{" "}
          <button onClick={() => navigate("/register")} className="login-link">
            Зарегистрируйтесь здесь
          </button>
        </p>
      </div>
    </div>
  );
}