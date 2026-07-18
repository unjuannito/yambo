import confetti from "canvas-confetti";

/** Classic confetti burst from the center */
export function fireConfetti() {
  confetti({
    particleCount: 150,
    spread: 80,
    origin: { y: 0.6 },
    colors: ["#3b82f6", "#f59e0b", "#ef4444", "#10b981", "#8b5cf6", "#ec4899"],
  });
}

/** Confetti burst from a specific position (0-1 normalized coordinates) */
export function fireConfettiAt(x: number, y: number) {
  confetti({
    particleCount: 80,
    spread: 60,
    origin: { x, y },
    colors: ["#3b82f6", "#f59e0b", "#ef4444", "#10b981", "#8b5cf6", "#ec4899"],
  });
}

/** Rain of emoji-shaped confetti */
export function fireEmojiRain(emoji: string = "*") {
  const scalar = 2;
  const shape = confetti.shapeFromText({ text: emoji, scalar });

  confetti({
    shapes: [shape],
    scalar,
    particleCount: 40,
    spread: 120,
    origin: { y: 0.1 },
    gravity: 0.8,
    ticks: 200,
  });
}

/** Multi-burst fireworks effect */
export function fireFireworks() {
  const duration = 1500;
  const end = Date.now() + duration;

  const colors = ["#3b82f6", "#f59e0b", "#ef4444", "#10b981", "#8b5cf6"];

  (function frame() {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors,
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors,
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  })();
}

/** Rainbow confetti from top */
export function fireRainbow() {
  const colors = [
    "#ff0000", "#ff7700", "#ffff00", "#00ff00",
    "#0000ff", "#8b00ff",
  ];
  confetti({
    particleCount: 200,
    spread: 180,
    origin: { y: 0 },
    colors,
    ticks: 300,
    gravity: 0.6,
  });
}
