import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import api from "../auth/api";
import HeatmapViewer from "./HeatmapViewer";
import "./Dashboard.css";

export default function Dashboard() {
    const { token } = useAuth();
    const navigate = useNavigate();
    const [games, setGames] = useState<{ id: string, game_name: string }[]>([]);
    const [selectedGame, setSelectedGame] = useState<string | null>(null);
    const [locations, setLocations] = useState<string[]>([]);
    const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
    const [bins, setBins] = useState(25);

    useEffect(() => {
        if (!token) {
            navigate("/");
            return;
        }
        api.get("/api/games")
            .then(res => setGames(res.data))
            .catch(console.error);
    }, [token, navigate]);

    useEffect(() => {
        if (selectedGame) {
            setSelectedLocation(null);
            api.get(`/api/locations/?gameId=${selectedGame}`)
                .then(res => setLocations(res.data))
                .catch(console.error);
        } else {
            setLocations([]);
            setSelectedLocation(null);
        }
    }, [selectedGame]);

    return (
        <div className="dashboard-page">
            <div className="dashboard-header">
                <h2>Панель управления тепловой картой</h2>
                <button onClick={() => navigate("/profile")} className="dashboard-button">
                    Профиль
                </button>
            </div>

            <div className="dashboard-controls">
                <select value={selectedGame ?? ""} onChange={e => setSelectedGame(e.target.value || null)}>
                    <option value="">-- Выберите игру --</option>
                    {games.map(g => (
                        <option key={g.id} value={g.id}>{g.game_name}</option>
                    ))}
                </select>

                <select
                    value={selectedLocation ?? ""}
                    onChange={e => setSelectedLocation(e.target.value || null)}
                    disabled={!selectedGame}
                >
                    <option value="">-- Выберите локацию --</option>
                    {locations.map(loc => (
                        <option key={loc} value={loc}>{loc}</option>
                    ))}
                </select>

                <label>
                    Плотность:
                    <input
                        type="range"
                        min="5"
                        max="60"
                        value={bins}
                        onChange={e => setBins(Number(e.target.value))}
                    />
                </label>
            </div>

            {selectedGame && selectedLocation && (
                <HeatmapViewer gameId={selectedGame} location={selectedLocation} bins={bins} />
            )}
        </div>
    );
}