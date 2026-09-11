export default function WaitlistSidebar() {
  return (
    <div className="h-full flex flex-col p-4">
      <h3 className="font-semibold text-sm border-b pb-2 mb-4">Fila de Espera</h3>
      <div className="flex-1 flex items-center justify-center text-center text-xs text-muted-foreground">
        Nenhum cliente na fila de espera no momento.
      </div>
    </div>
  );
}
