import React from "react";

export const StatCard = React.memo(function StatCard({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className: string;
}) {
  return (
    <div
      className={`rounded-2xl px-4 py-4 hover-lift transition-all duration-200 ${className}`}
    >
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
});
