import React from 'react';
import './skeletons.css';

/**
 * TableSkeleton — pulse-animated placeholder for booking/data tables.
 *
 * Props:
 *   rows     {number}   number of skeleton rows (default 6)
 *   columns  {number}   number of columns (default 5)
 *   showHeader {boolean} show a header row (default true)
 *   showPagination {boolean} show pagination stub (default true)
 */
export default function TableSkeleton({
  rows = 6,
  columns = 5,
  showHeader = true,
  showPagination = true,
}) {
  const colWidths = ['30%', '20%', '15%', '15%', '20%', '10%', '10%'];

  return (
    <div className="sk-table-wrap">
      {showHeader && (
        <div className="sk-table-header">
          {Array.from({ length: columns }).map((_, ci) => (
            <div
              key={ci}
              className="sk-block sk-line sk-line--sm"
              style={{ width: colWidths[ci % colWidths.length], height: 14 }}
            />
          ))}
        </div>
      )}

      <div className="sk-table-body">
        {Array.from({ length: rows }).map((_, ri) => (
          <div key={ri} className="sk-table-row">
            {Array.from({ length: columns }).map((_, ci) => (
              <div
                key={ci}
                className="sk-block sk-line"
                style={{
                  width: ci === 0 ? colWidths[0] : colWidths[ci % colWidths.length],
                  height: 16,
                }}
              />
            ))}
          </div>
        ))}
      </div>

      {showPagination && (
        <div className="sk-table-footer">
          <div className="sk-block sk-line sk-line--sm" style={{ width: 120 }} />
          <div className="sk-row" style={{ gap: 6 }}>
            {[1, 2, 3].map(n => (
              <div key={n} className="sk-block sk-page-btn" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
