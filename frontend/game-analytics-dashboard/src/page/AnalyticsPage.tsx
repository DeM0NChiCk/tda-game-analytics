import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../auth/api";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, Legend, ResponsiveContainer, ScatterChart, Scatter
} from "recharts";
import "./AnalyticsPage.css";

export default function AnalyticsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const gameId = location.state?.gameId;
  const [taskDuration, setTaskDuration] = useState<any>({});
  const [fpsAverage, setFpsAverage] = useState<any[]>([]);
  const [taskSuccess, setTaskSuccess] = useState<any>({});
  const [seqRatings, setSeqRatings] = useState<any>({});
  const [stimuliStats, setStimuliStats] = useState<any>({});
  const [fixationAreas, setFixationAreas] = useState<any>({});
  const [clientInfo, setClientInfo] = useState<any>({});

  useEffect(() => {
    if (!gameId) return;
    api.get(`/api/analytics/task-duration?gameId=${gameId}`).then(res => setTaskDuration(res.data)).catch(console.error);
    api.get(`/api/analytics/fps-average?gameId=${gameId}`).then(res => setFpsAverage(res.data)).catch(console.error);
    api.get(`/api/analytics/task-success?gameId=${gameId}`).then(res => setTaskSuccess(res.data)).catch(console.error);
    api.get(`/api/analytics/seq-ratings?gameId=${gameId}`).then(res => setSeqRatings(res.data)).catch(console.error);
    api.get(`/api/analytics/stimuli?gameId=${gameId}`).then(res => setStimuliStats(res.data)).catch(console.error);
    api.get(`/api/analytics/fixation-areas?gameId=${gameId}`).then(res => setFixationAreas(res.data)).catch(console.error);
    api.get(`/api/analytics/client-info?gameId=${gameId}`).then(res => setClientInfo(res.data)).catch(console.error);
  }, [gameId]);

  const taskDurationData = Object.entries(taskDuration).map(([taskId, values]: any) => ({ taskId, ...values }));
  const taskSuccessData = Object.entries(taskSuccess).map(([taskId, values]: any) => ({ taskId, ...values }));
  const seqRatingsData = Object.entries(seqRatings).map(([taskId, avg]: any) => ({ taskId, avg }));
  const fixationData = Object.entries(fixationAreas).map(([aoi, values]: any) => ({ aoi, count: values.count, avgDuration: values.avgDuration }));
  const stimuliData = Object.entries(stimuliStats).flatMap(([stimId, aois]: any) =>
    Object.entries(aois).map(([aoi, count]: any) => ({ stimId, aoi, count }))
  );
  const fpsGrouped = fpsAverage.reduce((acc: any, entry) => {
    const session = entry.sessionId || "Unknown";
    if (!acc[session]) acc[session] = [];
    acc[session].push(entry);
    return acc;
  }, {});
  const stimuliGrouped = stimuliData.reduce((acc: any, item) => {
    if (!acc[item.stimId]) acc[item.stimId] = [];
    acc[item.stimId].push(item);
    return acc;
  }, {});

  function parseUserAgent(ua: string) {
    let browser = "Unknown Browser";
    let os = "Unknown OS";

    if (/Chrome\/([\d.]+)/.test(ua)) {
      browser = "Chrome " + ua.match(/Chrome\/([\d.]+)/)![1];
    } else if (/Firefox\/([\d.]+)/.test(ua)) {
      browser = "Firefox " + ua.match(/Firefox\/([\d.]+)/)![1];
    } else if (/Safari\/([\d.]+)/.test(ua) && !/Chrome/.test(ua)) {
      browser = "Safari " + ua.match(/Version\/([\d.]+)/)?.[1] || "";
    } else if (/Edge\/([\d.]+)/.test(ua)) {
      browser = "Edge " + ua.match(/Edge\/([\d.]+)/)![1];
    }

    if (/Windows NT 10/.test(ua)) os = "Windows 10";
    else if (/Windows NT 6.1/.test(ua)) os = "Windows 7";
    else if (/Mac OS X/.test(ua)) os = "Mac OS X";
    else if (/Android/.test(ua)) os = "Android";
    else if (/iPhone/.test(ua)) os = "iOS";

    return `${browser} на ${os}`;
  }

  const userAgentData = Object.entries(clientInfo.userAgents || {}).map(([agent, count]: any) => ({
    name: parseUserAgent(agent),
    count
  }));
  const languageData = Object.entries(clientInfo.languages || {}).map(([lang, count]: any) => ({
    language: lang,
    count
  }));

  const globalStats = {
    taskSuccess: taskSuccessData.length,
    taskDuration: taskDurationData.length,
    seqRatings: seqRatingsData.length,
    fixationAreas: fixationData.length,
    stimuli: Object.keys(stimuliGrouped).length,
    fps: fpsAverage.length,
    userAgents: userAgentData.length,
  };

  return (
    <div className="analytics-page">
      <div className="analytics-container">
        <div style={{ padding: 20 }}>
          <div className="analytics-header">
            <h2>Аналитика для игры ID: {gameId}</h2>
            <button className="analytics-button" onClick={() => navigate("/profile")}>
                Профиль
            </button>
          </div>

          <h4>Глобальная статистика</h4>
          <ul>
            {Object.entries(globalStats).map(([key, value]) => (
              <li key={key}>{key}: {value}</li>
            ))}
          </ul>

          <h3>Средняя продолжительность фиксации</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={taskDurationData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="taskId" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="average" stroke="#8884d8" />
              <Line type="monotone" dataKey="min" stroke="#82ca9d" />
              <Line type="monotone" dataKey="max" stroke="#ff7300" />
            </LineChart>
          </ResponsiveContainer>

          <h3>Динамика кадров в секунду (FPS) по сессиям</h3>
          {Object.entries(fpsGrouped).map(([sessionId, entries]: any, i) => {
            const intervalMs = entries[0]?.intervalMs || 0;
            const intervalSec = Math.floor(intervalMs / 1000);
            const intervalDisplay =
              intervalSec >= 60
                ? `${Math.floor(intervalSec / 60)}m ${intervalSec % 60}s`
                : `${intervalSec}s`;

            return (
              <details key={sessionId} open={i === 0} style={{ marginBottom: 32 }}>
                <summary><strong>Сессия: {sessionId}</strong></summary>
                <p style={{ marginTop: 8 }}><strong>Интервал агрегации:</strong> {intervalDisplay}</p>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={entries}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="count" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="averageFps" stroke="#4caf50" />
                  </LineChart>
                </ResponsiveContainer>
              </details>
            );
          })}

          <h3>Успешность задачи</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={taskSuccessData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="taskId" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="success" fill="#4caf50" />
              <Bar dataKey="fail" fill="#f44336" />
              <Bar dataKey="abandoned" fill="#ff9800" />
            </BarChart>
          </ResponsiveContainer>

          <h3>Оценка сложности задачи (SEQ-оценки по 7-балльной шкале)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={seqRatingsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="taskId" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="avg" fill="#2196f3" />
            </BarChart>
          </ResponsiveContainer>

          <h3>Области фиксации</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={fixationData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="aoi" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="count" fill="#9c27b0" />
              <Bar yAxisId="right" dataKey="avgDuration" fill="#00bcd4" />
            </BarChart>
          </ResponsiveContainer>

          <h3>Области фиксации — диаграмма рассеяния</h3>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart
              margin={{ top: 20, right: 20, bottom: 10, left: 10 }}
            >
              <CartesianGrid />
              <XAxis dataKey="count" name="Количество фиксаций" />
              <YAxis dataKey="avgDuration" name="Средняя длительность (ms)" />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Scatter data={fixationData} fill="#8884d8" />
            </ScatterChart>
          </ResponsiveContainer>

          <h3>Области фиксации</h3>
          {(() => {
            const scores = fixationData.map(d => d.count * d.avgDuration);
            const maxScore = Math.max(...scores);
            const minScore = Math.min(...scores);
            const range = maxScore - minScore;

            const low = minScore + range * 0.33;
            const high = minScore + range * 0.66;

            return (
              <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 10 }}>
                <thead>
                  <tr>
                    <th style={{ borderBottom: "1px solid #ccc", textAlign: "left" }}>Области фиксации (AOI)</th>
                    <th style={{ borderBottom: "1px solid #ccc", textAlign: "right" }}>Количество фиксаций</th>
                    <th style={{ borderBottom: "1px solid #ccc", textAlign: "right" }}>Средняя длительность (ms)</th>
                    <th style={{ borderBottom: "1px solid #ccc", textAlign: "center" }}>Уровень внимания</th>
                  </tr>
                </thead>
                <tbody>
                  {fixationData.map(({ aoi, count, avgDuration }) => {
                    const attentionScore = count * avgDuration;
                    let emoji = "🟩";
                    let label = "Низкий";
                    if (attentionScore > high) {
                      emoji = "🟥";
                      label = "Высокий";
                    } else if (attentionScore > low) {
                      emoji = "🟨";
                      label = "Средний";
                    }

                    return (
                      <tr key={aoi}>
                        <td style={{ padding: "4px 0" }}>{aoi}</td>
                        <td style={{ textAlign: "right" }}>{count}</td>
                        <td style={{ textAlign: "right" }}>{avgDuration}</td>
                        <td style={{ textAlign: "center" }}>{emoji} {label}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            );
          })()}

          <h3>Количество просмотров областей интереса (AOI) по стимулам</h3>
          {Object.entries(stimuliGrouped).map(([stimId, data]: any, i) => (
            <details key={stimId} open={i === 0}>
              <summary><strong>Stimulus: {stimId}</strong></summary>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="aoi" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#795548" />
                </BarChart>
              </ResponsiveContainer>
            </details>
          ))}

          <h3>Информация о клиентах: Браузеры и устройства</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={userAgentData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} height={100} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#607d8b" />
            </BarChart>
          </ResponsiveContainer>

          <h3>Информация о клиентах: Языки</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={languageData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="language" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#3f51b5" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
