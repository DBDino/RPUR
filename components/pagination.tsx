import Link from "next/link";

type PaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  query: Record<string, string | undefined>;
};

export function Pagination({ page, pageSize, total, query }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const params = (targetPage: number) => {
    const searchParams = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value) searchParams.set(key, value);
    });
    if (targetPage > 1) searchParams.set("page", String(targetPage));
    const value = searchParams.toString();
    return value ? `?${value}` : "";
  };
  const from = total ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="pagination-wrap">
      <span>Menampilkan {from}-{to} dari {total.toLocaleString("id-ID")} data</span>
      <nav className="pagination" aria-label="Navigasi halaman">
        {page > 1 && <Link href={params(page - 1)} rel="prev">‹ Sebelumnya</Link>}
        <strong>Halaman {page} dari {totalPages}</strong>
        {page < totalPages && <Link href={params(page + 1)} rel="next">Berikutnya ›</Link>}
      </nav>
    </div>
  );
}
