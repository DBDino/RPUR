export function RouteLoading() {
  return (
    <main className="route-loading" role="status" aria-live="polite">
      <span className="route-loading__spinner" aria-hidden="true" />
      <span>Memuat halaman...</span>
    </main>
  );
}
