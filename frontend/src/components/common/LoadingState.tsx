import { Spinner } from "@/components/ui/Spinner";

export function LoadingState({ label = "Loading…", fullScreen = false }: { label?: string; fullScreen?: boolean }) {
  return (
    <div className={fullScreen ? "loading-state loading-state--full" : "loading-state"} role="status">
      <Spinner />
      <span>{label}</span>
    </div>
  );
}
