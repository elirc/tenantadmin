export function PaginationControls({ meta, onPageChange }) {
  if (!meta) {
    return null;
  }

  return (
    <div className="pagination-controls">
      <button type="button" onClick={() => onPageChange(meta.page - 1)} disabled={!meta.hasPrev}>
        Prev
      </button>
      <span>
        Page {meta.page} / {meta.totalPages} ({meta.total} total)
      </span>
      <button type="button" onClick={() => onPageChange(meta.page + 1)} disabled={!meta.hasNext}>
        Next
      </button>
    </div>
  );
}
