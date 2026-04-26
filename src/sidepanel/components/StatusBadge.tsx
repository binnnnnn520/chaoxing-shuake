export function StatusBadge({ state }: { state: string }) {
  return <span data-state={state}>{state.replaceAll("_", " ")}</span>;
}
