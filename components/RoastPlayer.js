// components/RoastPlayer.js
// Drop-in audio player for the "Why Did This Flop" tab
// Receives: audioBase64 (string), personaId (string), personaLabel (string)
// Auto-plays on mount. Shows play/pause + animated waveform bars.

import { useEffect, useRef, useState } from "react";

const PERSONA_COLORS = {
  babe: "#FF3B00",
  boss: "#FF3B00",
  chef: "#FF3B00",
};

const PERSONA_ICONS = {
  babe: "🧑‍❤️",
  boss: "📧",
  chef: "🔪",
};

export default function RoastPlayer({ audioBase64, personaId, personaLabel }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!audioBase64) return;

    const src = `data:audio/mpeg;base64,${audioBase64}`;
    const audio = new Audio(src);
    audioRef.current = audio;

    audio.addEventListener("loadedmetadata", () => {
      setDuration(audio.duration);
    });

    audio.addEventListener("timeupdate", () => {
      setProgress(audio.currentTime / (audio.duration || 1));
    });

    audio.addEventListener("ended", () => {
      setPlaying(false);
      setProgress(0);
    });

    audio.addEventListener("error", () => {
      setError("Audio failed to load");
    });

    // Auto-play
    audio.play().then(() => setPlaying(true)).catch(() => {
      // Autoplay blocked — user can hit play manually
    });

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, [audioBase64]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play();
      setPlaying(true);
    }
  };

  const seek = (e) => {
    const audio = audioRef.current;
    if (!audio) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    audio.currentTime = ratio * audio.duration;
    setProgress(ratio);
  };

  const formatTime = (secs) => {
    if (!secs || isNaN(secs)) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  if (error) return null;
  if (!audioBase64) return null;

  const accent = PERSONA_COLORS[personaId] || "#FF3B00";
  const icon = PERSONA_ICONS[personaId] || "🎙️";
  const elapsed = progress * duration;

  return (
    <div style={styles.wrapper}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.icon}>{icon}</span>
        <div>
          <div style={styles.label}>Now Playing</div>
          <div style={styles.personaName}>{personaLabel}</div>
        </div>
        <div style={{ ...styles.liveDot, background: playing ? accent : "#444" }} />
      </div>

      {/* Waveform bars — purely decorative, animate when playing */}
      <div style={styles.waveform} aria-hidden="true">
        {Array.from({ length: 28 }).map((_, i) => {
          const height = 8 + Math.sin(i * 0.9) * 10 + Math.cos(i * 0.4) * 8;
          return (
            <div
              key={i}
              style={{
                ...styles.bar,
                height: `${height}px`,
                background: i / 28 < progress ? accent : "#2a2a2a",
                animationDelay: `${i * 0.04}s`,
                animationPlayState: playing ? "running" : "paused",
              }}
            />
          );
        })}
      </div>

      {/* Progress scrubber */}
      <div style={styles.scrubberTrack} onClick={seek}>
        <div style={{ ...styles.scrubberFill, width: `${progress * 100}%`, background: accent }} />
      </div>

      {/* Controls row */}
      <div style={styles.controls}>
        <span style={styles.time}>{formatTime(elapsed)}</span>
        <button
          onClick={togglePlay}
          style={{ ...styles.playBtn, borderColor: accent, color: accent }}
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? (
            // Pause icon
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            // Play icon
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5,3 19,12 5,21" />
            </svg>
          )}
        </button>
        <span style={styles.time}>{formatTime(duration)}</span>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(1.6); }
        }
      `}</style>
    </div>
  );
}

const styles = {
  wrapper: {
    background: "#111",
    border: "1px solid #222",
    borderRadius: "12px",
    padding: "18px 20px",
    marginTop: "20px",
    fontFamily: "Inter, sans-serif",
    maxWidth: "480px",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "14px",
  },
  icon: {
    fontSize: "24px",
    lineHeight: 1,
  },
  label: {
    fontSize: "11px",
    color: "#555",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom: "2px",
  },
  personaName: {
    fontSize: "14px",
    color: "#fff",
    fontWeight: 600,
  },
  liveDot: {
    marginLeft: "auto",
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    transition: "background 0.3s",
  },
  waveform: {
    display: "flex",
    alignItems: "center",
    gap: "3px",
    height: "40px",
    marginBottom: "10px",
  },
  bar: {
    flex: 1,
    borderRadius: "2px",
    transition: "background 0.15s",
    animation: "bounce 0.8s ease-in-out infinite",
    minWidth: "3px",
  },
  scrubberTrack: {
    background: "#1e1e1e",
    borderRadius: "4px",
    height: "4px",
    cursor: "pointer",
    marginBottom: "14px",
    position: "relative",
    overflow: "hidden",
  },
  scrubberFill: {
    height: "100%",
    borderRadius: "4px",
    transition: "width 0.1s linear",
  },
  controls: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "16px",
  },
  playBtn: {
    background: "transparent",
    border: "2px solid",
    borderRadius: "50%",
    width: "44px",
    height: "44px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "opacity 0.2s",
    padding: 0,
  },
  time: {
    fontSize: "12px",
    color: "#555",
    fontVariantNumeric: "tabular-nums",
    minWidth: "32px",
    textAlign: "center",
  },
};
