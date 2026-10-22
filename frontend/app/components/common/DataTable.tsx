import React, { useContext } from "react";
import { useTranslation } from "react-i18next";
import { twMerge } from "tailwind-merge";
import { AuthContext } from "~/context/AuthContext";
import type { RequiredPermission } from "~/types/authContextType";

export interface TableColumn<T = any> {
  key: string;
  header: React.ReactNode;
  render?: (item: T) => React.ReactNode;
  className?: string;
  requiredPerms?: RequiredPermission[];
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
  const authCtx = useContext(AuthContext);

  const visibleColumns = authCtx
    ? columns.filter((col) => {
        if (!col.requiredPerms || col.requiredPerms.length === 0) return true;
        return col.requiredPerms.every((perm) =>
          authCtx.hasPermission(perm)
        );
      })
    : columns;

  return (
    <div
      className={twMerge(
        `overflow-x-auto bg-white rounded-2xl shadow-sm border border-gray-100 ${className}`
      )}
    >
      <table className="min-w-full divide-y divide-gray-100">
        <thead className="bg-yambo-green-50/50">
          <tr>
            {visibleColumns.map((column) => (
              <th
                key={column.key}
                className={twMerge(
                  "px-4 py-2.5 text-left text-xs font-bold text-yambo-green-700 uppercase tracking-wider",
                  column.className
                )}
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
              {visibleColumns.map((column) => (
                <td
                  key={column.key}
                  className={twMerge("px-4 py-2.5 text-sm text-gray-700", column.className)}
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
