export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="container py-16">
      <span className="sr-only">Loading page…</span>
      <div className="h-8 w-2/3 rounded bg-gray-100 mb-6" />
      <div className="h-4 w-1/2 rounded bg-gray-100 mb-3" />
      <div className="h-4 w-3/4 rounded bg-gray-100" />
    </div>
  );
}
