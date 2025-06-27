import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../auth/api";
import { useAuth } from "../auth/AuthContext";
import "./ProfilePage.css";

interface Game {
  id: string;
  game_name: string;
}

export default function ProfilePage() {
  const [email, setEmail] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [games, setGames] = useState<Game[]>([]);
  const [newGameName, setNewGameName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const navigate = useNavigate();
  const { setToken } = useAuth();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = () => {
    api.get("/api/me")
      .then(res => {
        setEmail(res.data.email);
        setApiKey(res.data.apiKey);
      })
      .catch(() => setError("Не удалось загрузить профиль"));

    api.get("/api/games")
      .then(res => setGames(res.data))
      .catch(() => setError("Не удалось загрузить игры"));
  };

  const handleLogout = () => {
    setToken(null);
    navigate("/login");
  };

  const handleCreateGame = async () => {
    setError(null);
    setSuccess(null);

    if (!newGameName.trim()) {
      setError("Введите название игры");
      return;
    }

    setIsCreating(true);

    try {
      await api.post("/api/create-game", { name: newGameName });
      setSuccess("Игра успешно создана!");
      setNewGameName("");
      loadProfile();
    } catch (err: any) {
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError("Ошибка при создании игры");
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="profile-page">
      <div className="profile-container">
        <div className="profile-header">
          <h2>Мой профиль</h2>
          <p><strong>Email:</strong> {email}</p>
          <p><strong>API Key:</strong> <code>{apiKey}</code></p>
        </div>

        <div className="profile-buttons">
          <button onClick={() => navigate("/dashboard")} className="profile-button">
            Перейти к тепловой карте
          </button>
          <button onClick={handleLogout} className="profile-button">
            Выйти из аккаунта
          </button>
        </div>

        <h3>Добавить игру</h3>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="Название игры"
            value={newGameName}
            onChange={(e) => setNewGameName(e.target.value)}
            disabled={isCreating}
            className="profile-input"
          />
          <button onClick={handleCreateGame} disabled={isCreating} className="profile-button">
            {isCreating ? "Создание..." : "Создать игру"}
          </button>
        </div>

        {error && <p style={{ color: "red", marginTop: "0.5rem" }}>{error}</p>}
        {success && <p style={{ color: "lightgreen", marginTop: "0.5rem" }}>{success}</p>}

        <h3 style={{ marginTop: "2rem" }}>Мои игры</h3>
        {games.length === 0 ? (
          <p>Игр не найдено.</p>
        ) : (
          <ul style={{ paddingLeft: 0 }}>
            {games.map(game => (
              <li key={game.id} className="profile-game">
                <strong>{game.game_name}</strong><br />
                <button onClick={() => navigate(`/analytics`, { state: { gameId: game.id } })}>
                  Открыть дашборд
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}