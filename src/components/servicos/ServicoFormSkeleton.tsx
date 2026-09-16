export function ServicoFormSkeleton() {
  return (
    <div className="space-y-4 py-4 animate-pulse">
      <div className="space-y-2">
        <div className="h-4 bg-muted/60 rounded w-16" />
        <div className="h-10 bg-muted/60 rounded w-full" />
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-muted/60 rounded w-20" />
        <div className="h-10 bg-muted/60 rounded w-full" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="h-4 bg-muted/60 rounded w-20" />
          <div className="h-10 bg-muted/60 rounded w-full" />
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-muted/60 rounded w-24" />
          <div className="h-10 bg-muted/60 rounded w-full" />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <div className="h-10 bg-muted/60 rounded w-24" />
        <div className="h-10 bg-muted/60 rounded w-24" />
      </div>
    </div>
  );
}
