export function startActivitySimulation(intervalMs = 30_000): ReturnType<typeof setInterval> {
  return setInterval(() => {
    document.dispatchEvent(
      new MouseEvent("mousemove", {
        bubbles: true,
        clientX: 50 + Math.random() * 200,
        clientY: 50 + Math.random() * 200,
      })
    );
  }, intervalMs);
}
