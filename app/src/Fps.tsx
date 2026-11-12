import { useEffect, useState } from "react";

// Counts frames the whole window draws. Every screen lives in this one window,
// so this one number covers the Reader, Library and the rest.
function Fps() {
  const [fps, setFps] = useState(0);

  useEffect(() => {
    let frames = 0;
    let start = performance.now();
    let id = 0;

    function tick(now: number) {
      frames++;
      // Show the count once a second, so the number is readable instead of flickering.
      if (now - start >= 1000) {
        setFps(Math.round((frames * 1000) / (now - start)));
        frames = 0;
        start = now;
      }
      id = requestAnimationFrame(tick);
    }

    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, []);

  return <div className="fps">{fps} FPS</div>;
}

export default Fps;
