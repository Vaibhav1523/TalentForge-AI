"use client";

import type { ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ADMIN_TABLE_PAGE_SIZE_OPTIONS } from "@/lib/admin/admin-pagination";

export type AdminDataTablePaginationProps = {
    currentPage: number;
    pageCount: number;
    totalItems: number;
    pageSize: number;
    /** Maps each allowed page size → full URL (resets to page 1 when changing size) */
    pageSizeHrefs: Record<number, string>;
    firstHref: string | null;
    prevHref: string | null;
    nextHref: string | null;
    lastHref: string | null;
    ariaLabel?: string;
};

export function AdminDataTablePagination({
    currentPage,
    pageCount,
    totalItems,
    pageSize,
    pageSizeHrefs,
    firstHref,
    prevHref,
    nextHref,
    lastHref,
    ariaLabel = "Table pagination",
}: AdminDataTablePaginationProps) {
    const router = useRouter();

    if (totalItems <= 0) return null;

    const from = (currentPage - 1) * pageSize + 1;
    const to = Math.min(currentPage * pageSize, totalItems);

    const onPageSizeChange = (e: ChangeEvent<HTMLSelectElement>) => {
        const v = Number(e.target.value);
        const href = pageSizeHrefs[v];
        if (href) router.push(href);
    };

    return (
        <nav
            className="pagination"
            aria-label={ariaLabel}
            style={{
                marginTop: 16,
                paddingTop: 16,
                borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            }}
        >
            <div className="pagination-left">
                <span className="pagination-info">Rows per page</span>
                <select
                    className="pagination-select"
                    value={String(pageSize)}
                    onChange={onPageSizeChange}
                    aria-label="Rows per page"
                >
                    {ADMIN_TABLE_PAGE_SIZE_OPTIONS.map((size) => (
                        <option key={size} value={size}>
                            {size}
                        </option>
                    ))}
                </select>
            </div>

            <span className="pagination-info">
                {from}–{to} of {totalItems}
            </span>

            <div className="pagination-right">
                {firstHref ? (
                    <Link
                        href={firstHref}
                        className="btn pagination-btn"
                        title="First page"
                        aria-label="First page"
                    >
                        <ChevronLeft size={14} aria-hidden />
                        <ChevronLeft size={14} style={{ marginLeft: -8 }} aria-hidden />
                    </Link>
                ) : (
                    <button
                        type="button"
                        className="btn pagination-btn"
                        disabled
                        title="First page"
                        aria-label="First page"
                    >
                        <ChevronLeft size={14} aria-hidden />
                        <ChevronLeft size={14} style={{ marginLeft: -8 }} aria-hidden />
                    </button>
                )}
                {prevHref ? (
                    <Link
                        href={prevHref}
                        className="btn pagination-btn"
                        title="Previous page"
                        aria-label="Previous page"
                    >
                        <ChevronLeft size={14} aria-hidden />
                    </Link>
                ) : (
                    <button
                        type="button"
                        className="btn pagination-btn"
                        disabled
                        title="Previous page"
                        aria-label="Previous page"
                    >
                        <ChevronLeft size={14} aria-hidden />
                    </button>
                )}
                <span className="pagination-info">
                    Page {currentPage} of {pageCount}
                </span>
                {nextHref ? (
                    <Link
                        href={nextHref}
                        className="btn pagination-btn"
                        title="Next page"
                        aria-label="Next page"
                    >
                        <ChevronRight size={14} aria-hidden />
                    </Link>
                ) : (
                    <button
                        type="button"
                        className="btn pagination-btn"
                        disabled
                        title="Next page"
                        aria-label="Next page"
                    >
                        <ChevronRight size={14} aria-hidden />
                    </button>
                )}
                {lastHref ? (
                    <Link
                        href={lastHref}
                        className="btn pagination-btn"
                        title="Last page"
                        aria-label="Last page"
                    >
                        <ChevronRight size={14} aria-hidden />
                        <ChevronRight size={14} style={{ marginLeft: -8 }} aria-hidden />
                    </Link>
                ) : (
                    <button
                        type="button"
                        className="btn pagination-btn"
                        disabled
                        title="Last page"
                        aria-label="Last page"
                    >
                        <ChevronRight size={14} aria-hidden />
                        <ChevronRight size={14} style={{ marginLeft: -8 }} aria-hidden />
                    </button>
                )}
            </div>
        </nav>
    );
}
