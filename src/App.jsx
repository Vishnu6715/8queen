import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import API from "./api/auth";

const BOARD = 8;
const STORAGE_SESSION = "queenSession";

const levels = {
  easy: { time: 120, attempts: 12, hints: 5, label: "Easy" },
  medium: { time: 75, attempts: 8, hints: 3, label: "Medium" },
  hard: { time: 45, attempts: 5, hints: 1, label: "Hard" },
};

function isSafe(board, row, col) {
  for (let r = 0; r < row; r += 1) {
    const c = board[r];
    if (c === col || Math.abs(r - row) === Math.abs(c - col)) {
      return false;
    }
  }
  return true;
}

function generateSolutions(row = 0, board = [], all = []) {
  if (row === BOARD) {
    all.push([...board]);
    return all;
  }

  for (let col = 0; col < BOARD; col += 1) {
    if (isSafe(board, row, col)) {
      board[row] = col;
      generateSolutions(row + 1, board, all);
      board[row] = -1;
    }
  }
  return all;
}

function safeForUser(board, row, col) {
  return board.every(
    (c, r) =>
      c === -1 || (r !== row && c !== col && Math.abs(r - row) !== Math.abs(c - col))
  );
}

function formatTime(sec) {
  const m = String(Math.floor(sec / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function Board({ queens, onCellClick, highlights = [], conflicts = [] }) {
  return (
    <div className="board">
      {Array.from({ length: 64 }, (_, i) => {
        const row = Math.floor(i / BOARD);
        const col = i % BOARD;
        const hasQueen = queens[row] === col;
        const hi = highlights.some((p) => p[0] === row && p[1] === col);
        const danger = conflicts.some((p) => p[0] === row && p[1] === col);

        return (
          <button
            key={`${row}-${col}`}
            className={`cell ${(row + col) % 2 === 0 ? "light" : "dark"} ${
              hi ? "hint" : ""
            } ${danger ? "danger" : ""}`}
            onClick={() => onCellClick?.(row, col)}
          >
            {hasQueen && <span className="queen">♛</span>}
          </button>
        );
      })}
    </div>
  );
}

function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [message, setMessage] = useState(
    "Create an account or login to unlock the game board."
  );
  const [loading, setLoading] = useState(false);

  function update(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function submit(e) {
    e.preventDefault();

    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const password = form.password.trim();

    if (!email || !password || (mode === "signup" && !name)) {
      setMessage("Please fill all required fields.");
      return;
    }

    try {
      setLoading(true);

      if (mode === "signup") {
        await API.post("/signup", { name, email, password });
        setMessage("Signup successful! Now login.");
        setMode("login");
        setForm({ name: "", email, password: "" });
        return;
      }

      const res = await API.post("/login", { email, password });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem(STORAGE_SESSION, JSON.stringify(res.data.user));
      onLogin(res.data.user);
    } catch (err) {
console.log(err);
setMessage(err.response?.data?.message || err.message || "Something went wrong.");    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-stars" />
      <section className="auth-card">
        <div className="auth-left">
          <p className="badge">♛ 8 Queens Arena</p>
          <h1>{mode === "login" ? "Welcome Back!" : "Join the Arena"}</h1>
          <p>
            Login or signup to play the 8 Queens challenge, track score, use hints,
            and explore all 92 solutions.
          </p>

          <div className="auth-mini-board">
            {Array.from({ length: 16 }, (_, i) => (
              <span key={i}>{[1, 7, 8, 14].includes(i) ? "♛" : ""}</span>
            ))}
          </div>
        </div>

        <form className="auth-form" onSubmit={submit}>
          <h2>{mode === "login" ? "Login" : "Create Account"}</h2>
          <p className="form-message">{message}</p>

          {mode === "signup" && (
            <label>
              Full Name
              <input
                name="name"
                value={form.name}
                onChange={update}
                placeholder="Enter your name"
              />
            </label>
          )}

          <label>
            Email
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={update}
              placeholder="example@gmail.com"
            />
          </label>

          <label>
            Password
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={update}
              placeholder="Enter password"
            />
          </label>

          <button className="primary-btn" type="submit" disabled={loading}>
            {loading
              ? "Please wait..."
              : mode === "login"
                ? "Login & Play"
                : "Signup"}
          </button>

          <button
            type="button"
            className="link-btn"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setMessage("Fill the form to continue.");
            }}
          >
            {mode === "login"
              ? "New user? Create account"
              : "Already have account? Login"}
          </button>
        </form>
      </section>
    </main>
  );
}

export default function App() {
  const solutions = useMemo(() => generateSolutions(), []);

  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem(STORAGE_SESSION);
    const token = localStorage.getItem("token");
    return saved && token ? JSON.parse(saved) : null;
  });

  const [tab, setTab] = useState("challenge");
  const [solutionIndex, setSolutionIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const [level, setLevel] = useState("easy");
  const [userBoard, setUserBoard] = useState(Array(BOARD).fill(-1));
  const [status, setStatus] = useState("Click any square to start!");
  const [started, setStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(levels.easy.time);
  const [attempts, setAttempts] = useState(levels.easy.attempts);
  const [hints, setHints] = useState(levels.easy.hints);
  const [highlights, setHighlights] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [bestScore, setBestScore] = useState(() =>
    Number(localStorage.getItem("queenBestScore") || user?.score || 0)
  );
  const [wins, setWins] = useState(() =>
    Number(localStorage.getItem("queenWins") || user?.wins || 0)
  );
  const [showHelp, setShowHelp] = useState(false);
  const confettiRef = useRef(null);

  const queensPlaced = userBoard.filter((v) => v !== -1).length;
  const currentSolution = solutions[solutionIndex];

  useEffect(() => {
    if (!started) return undefined;

    if (timeLeft <= 0) {
      setStatus("⏰ Time's up! Press Reset to try again.");
      setStarted(false);
      return undefined;
    }

    const id = window.setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => window.clearInterval(id);
  }, [started, timeLeft]);

  if (!user) return <AuthScreen onLogin={setUser} />;

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem(STORAGE_SESSION);
    setUser(null);
  }

  function resetGame(nextLevel = level) {
    setUserBoard(Array(BOARD).fill(-1));
    setStatus("Click any square to start!");
    setStarted(false);
    setTimeLeft(levels[nextLevel].time);
    setAttempts(levels[nextLevel].attempts);
    setHints(levels[nextLevel].hints);
    setHighlights([]);
    setConflicts([]);
  }

  function changeLevel(value) {
    setLevel(value);
    resetGame(value);
  }

  function launchConfetti() {
    const canvas = confettiRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const pieces = Array.from({ length: 150 }, () => ({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * canvas.height,
      r: Math.random() * 5 + 3,
      vx: Math.random() * 4 - 2,
      vy: Math.random() * 4 + 2,
    }));

    let frame = 0;

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      pieces.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsl(${(i * 35 + frame) % 360}, 90%, 60%)`;
        ctx.fill();
      });

      frame += 1;

      if (frame < 170) {
        window.requestAnimationFrame(draw);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    draw();
  }

  function saveLocalStats(score, newWins) {
    if (score > bestScore) {
      setBestScore(score);
      localStorage.setItem("queenBestScore", String(score));
    }

    setWins(newWins);
    localStorage.setItem("queenWins", String(newWins));

    const updatedUser = {
      ...user,
      score: Math.max(score, bestScore),
      wins: newWins,
    };

    setUser(updatedUser);
    localStorage.setItem(STORAGE_SESSION, JSON.stringify(updatedUser));
  }

  function clickChallenge(row, col) {
    if (!started) setStarted(true);

    setHighlights([]);
    setConflicts([]);

    if (userBoard[row] === col) {
      const copy = [...userBoard];
      copy[row] = -1;
      setUserBoard(copy);
      setStatus(`${copy.filter((v) => v !== -1).length} queen(s) placed.`);
      return;
    }

    if (userBoard[row] !== -1) {
      setStatus("Only one queen allowed in each row. Remove the old queen first.");
      return;
    }

    if (!safeForUser(userBoard, row, col)) {
      const bad = [];

      userBoard.forEach((c, r) => {
        if (c !== -1 && (c === col || Math.abs(r - row) === Math.abs(c - col))) {
          bad.push([r, c]);
        }
      });

      setConflicts([...bad, [row, col]]);

      const nextAttempts = attempts - 1;
      setAttempts(nextAttempts);

      setStatus(
        nextAttempts <= 0
          ? "Game over! No attempts left."
          : "❌ Unsafe move. Red squares show the conflict."
      );

      if (nextAttempts <= 0) setStarted(false);
      return;
    }

    const copy = [...userBoard];
    copy[row] = col;
    setUserBoard(copy);

    const count = copy.filter((v) => v !== -1).length;

    if (count === BOARD) {
      const score = Math.max(
        10,
        timeLeft * 5 + attempts * 20 + hints * 30 + (level === "hard" ? 250 : level === "medium" ? 120 : 0)
      );

      const newWins = wins + 1;
      saveLocalStats(score, newWins);

      setStatus(`🎉 Winner ${user.name}! Score: ${score}`);
      setStarted(false);
      launchConfetti();
    } else {
      setStatus(`${count} queen(s) placed. Keep going!`);
    }
  }

  function showHint() {
    if (hints <= 0) {
      setStatus("No hints left for this level.");
      return;
    }

    const nextRow = userBoard.findIndex((v) => v === -1);
    if (nextRow === -1) return;

    const safeCells = [];

    for (let col = 0; col < BOARD; col += 1) {
      if (safeForUser(userBoard, nextRow, col)) {
        safeCells.push([nextRow, col]);
      }
    }

    setHints((h) => h - 1);
    setHighlights(safeCells);
    setStatus(`Hint: try one highlighted square in row ${nextRow + 1}.`);
  }

  function autoSolveFromHere() {
    const match = solutions.find((sol) =>
      userBoard.every((c, r) => c === -1 || sol[r] === c)
    );

    if (!match) {
      setStatus("No solution matches your current placement. Reset or remove some queens.");
      return;
    }

    setUserBoard(match);
    setStatus("✅ Auto-solved from your current correct moves.");
    setStarted(false);
    launchConfetti();
  }

  return (
    <main className="app">
      <canvas ref={confettiRef} className="confetti" />
      <div className="orb orb-one" />
      <div className="orb orb-two" />

      <nav className="topbar">
        <div className="brand">♛ Queen Arena</div>

        {[
          ["home", "🏠 Home"],
          ["viewer", "📖 Solutions"],
          ["challenge", "🎯 Play"],
          ["profile", "👤 Profile"],
        ].map(([id, label]) => (
          <button
            key={id}
            className={tab === id ? "active" : ""}
            onClick={() => {
              setTab(id);
              setAutoPlay(false);
            }}
          >
            {label}
          </button>
        ))}

        <button className="logout" onClick={logout}>
          Logout
        </button>
      </nav>

      <section className="panel">
        {tab === "home" && (
          <div className="home">
            <p className="badge">Welcome, {user.name} • MERN Login Connected • React Version</p>

            <h1>
              8 Queens Puzzle <span>♛</span>
            </h1>

            <p className="subtitle">
              A modern chess puzzle game with login, animations, hints, scoring,
              difficulty levels, and 92 solutions.
            </p>

            <div className="stats">
              <article>
                <b>92</b>
                <span>Total solutions</span>
              </article>
              <article>
                <b>{bestScore}</b>
                <span>Best score</span>
              </article>
              <article>
                <b>{wins}</b>
                <span>Total wins</span>
              </article>
            </div>

            <Board queens={solutions[solutionIndex]} />

            <div className="actions">
              <button onClick={() => setTab("challenge")}>Start Challenge</button>
              <button onClick={() => setTab("viewer")} className="ghost">
                View Solutions
              </button>
            </div>
          </div>
        )}

        {tab === "viewer" && (
          <div>
            <h1>All 8 Queens Solutions</h1>
            <p className="subtitle">Use autoplay or jump to any valid solution.</p>

            <Board queens={currentSolution} />

            <div className="controls">
              <button
                onClick={() =>
                  setSolutionIndex((v) => (v - 1 + solutions.length) % solutions.length)
                }
              >
                ⬅ Previous
              </button>

              <button onClick={() => setAutoPlay((v) => !v)}>
                {autoPlay ? "⏸ Pause" : "▶ Play"}
              </button>

              <button onClick={() => setSolutionIndex((v) => (v + 1) % solutions.length)}>
                Next ➡
              </button>

              <select
                value={solutionIndex}
                onChange={(e) => setSolutionIndex(Number(e.target.value))}
              >
                {solutions.map((_, i) => (
                  <option key={i} value={i}>
                    Solution #{i + 1}
                  </option>
                ))}
              </select>
            </div>

            <p className="status">
              Solution {solutionIndex + 1} / {solutions.length}
            </p>
          </div>
        )}

        {tab === "challenge" && (
          <div>
            <h1>8 Queen Challenge</h1>

            <div className="game-info">
              <span>⏱ {formatTime(timeLeft)}</span>
              <span>❤️ Attempts: {attempts}</span>
              <span>💡 Hints: {hints}</span>
              <span>♛ Queens: {queensPlaced}/8</span>
              <span>🏆 Best: {bestScore}</span>
            </div>

            <Board
              queens={userBoard}
              onCellClick={clickChallenge}
              highlights={highlights}
              conflicts={conflicts}
            />

            <div className="controls">
              <select value={level} onChange={(e) => changeLevel(e.target.value)}>
                {Object.entries(levels).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value.label}
                  </option>
                ))}
              </select>

              <button onClick={() => resetGame()}>🔁 Reset</button>
              <button onClick={showHint}>💡 Hint</button>
              <button onClick={autoSolveFromHere}>🤖 Auto Solve</button>
              <button onClick={() => setShowHelp(true)}>❓ Rules</button>
            </div>

            <p className="status">{status}</p>
          </div>
        )}

        {tab === "profile" && (
          <div className="profile-card">
            <h1>Player Profile</h1>
            <div className="profile-avatar">♛</div>
            <h2>{user.name}</h2>
            <p>{user.email}</p>

            <div className="stats">
              <article>
                <b>{bestScore}</b>
                <span>Best score</span>
              </article>
              <article>
                <b>{wins}</b>
                <span>Wins</span>
              </article>
              <article>
                <b>{levels[level].label}</b>
                <span>Current level</span>
              </article>
            </div>

            <button className="primary-btn" onClick={() => setTab("challenge")}>
              Continue Playing
            </button>
          </div>
        )}
      </section>

      {showHelp && (
        <div className="modal" onClick={() => setShowHelp(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="close" onClick={() => setShowHelp(false)}>
              ×
            </button>

            <h2>How to Play</h2>
            <p>
              Place exactly 8 queens. No two queens can share the same row,
              column, or diagonal.
            </p>
            <p>
              Use hints carefully. Hard mode gives fewer attempts and less time,
              but it can give a higher score.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
