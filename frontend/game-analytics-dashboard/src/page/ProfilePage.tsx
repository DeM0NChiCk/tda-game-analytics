import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../auth/api";

interface Game {
    id: string;
    game_name: string;
}

export default function ProfilePage() {
    const [email, setEmail] = useState("");
    const [apiKey, setApiKey] = useState("");
    const [games, setGames] = useState<Game[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        api.get("/api/me")
            .then(res => {
                setEmail(res.data.email);
                setApiKey(res.data.apiKey);
            })
            .catch(() => alert("Failed to load profile"));

        api.get("/api/games")
            .then(res => setGames(res.data))
            .catch(() => alert("Failed to load games"));
    }, []);

    return (
        <div style={{ padding: "1rem" }}>
            <h2>Мой профиль</h2>
            <p><strong>Email:</strong> {email}</p>
            <p><strong>API Key:</strong> <code>{apiKey}</code></p>

            <button onClick={() => navigate("/dashboard")} style={{ marginBottom: "1rem" }}>
                Перейти к тепловой карте
            </button>

            <h3>Мои игры</h3>
            {games.length === 0 ? (
                <p>Игр не найдено.</p>
            ) : (
                <ul>
                    {games.map(game => (
                        <li key={game.id} style={{ marginBottom: "1rem" }}>
                            <strong>{game.game_name}</strong><br />
                            <button onClick={() => navigate(`/analytics`, { state: { gameId: game.id } } )}>
                                Открыть дашборд
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}