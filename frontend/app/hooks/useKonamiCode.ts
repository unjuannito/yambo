import { useEffect, useRef, useState } from "react";

const KONAMI_SEQUENCE = [
  "ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown",
  "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight",
  "b", "a",
];

/**
 * Hook that listens for the Konami code (↑↑↓↓←→←→BA).
 * Returns `true` once the sequence is completed, then resets after `resetMs`.
 */
export function useKonamiCode(resetMs = 4000): boolean {
  const [activated, setActivated] = useState(false);
  const posRef = useRef(0);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const expected = KONAMI_SEQUENCE[posRef.current];
      if (e.key.toLowerCase() === expected.toLowerCase()) {
        posRef.current++;
        if (posRef.current === KONAMI_SEQUENCE.length) {
          setActivated(true);
          posRef.current = 0;
          setTimeout(() => setActivated(false), resetMs);
        }
      } else {
        posRef.current = 0;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [resetMs]);

  return activated;
}
