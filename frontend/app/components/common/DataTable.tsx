import React from "react";
import { twMerge } from "tailwind-merge";

export interface TableColumn<T = any> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  keyField: keyof T;
  className?: string;
  onRowClick?: (item: T) => void;
}

export function DataTable<T>({
  data,
  columns,
  keyField,
  className = "",
  onRowClick,
}: DataTableProps<T>) {
  return (
    <div
      className={twMerge(
        `overflow-x-auto bg-white rounded-2xl shadow-sm border border-gray-100 ${className}`
      )}
    >
      <table className="min-w-full divide-y divide-gray-100">
        <thead className="bg-yambo-green-50/50">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={
                  column.className ||
                  "px-6 py-3 text-left text-xs font-bold text-yambo-green-700 uppercase tracking-wider"
                }
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-50">
          {data.map((item) => (
            <tr
              key={String(item[keyField])}
              className={`transition-colors duration-150 hover:bg-yambo-green-50/30 ${onRowClick ? "cursor-pointer" : ""}`}
              onClick={() => onRowClick?.(item)}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className="px-6 py-4 whitespace-nowrap text-sm text-gray-700"
                >
                  {column.render
                    ? column.render(item)
                    : String(item[column.key as keyof T] || "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
