import { LoadingSpinner } from "./LoadingSpinner";

export const FullPageLoader = ({ label = "Loading..." }: { label?: string }) => {
  return (
    <div className="flex min-h-[40vh] items-center justify-center gap-2 text-muted-foreground">
      <LoadingSpinner />
      <span>{label}</span>
    </div>
  );
};
