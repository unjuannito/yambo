import React from "react";
import type { Activity } from "~/types/activity";

interface ActivitiesPreviewProps {
  title?: string;
  activities: Activity[];
  loading: boolean;
}

export default function ActivitiesPreview({ title, activities, loading }: ActivitiesPreviewProps) {
  if (loading) {
    return (
      <section id="actividades" className="w-full bg-white py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-10 text-gray-900">
            {title || "Actividades"}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="border rounded-lg p-4 animate-pulse">
                <div className="flex justify-between items-center mb-2">
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                  <div className="h-5 bg-gray-200 rounded-full w-20"></div>
                </div>
                <div className="h-5 bg-gray-200 rounded w-3/4 mb-3"></div>
                <div className="flex items-center mb-4">
                  <div className="h-8 w-8 bg-gray-200 rounded-full mr-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (activities.length === 0) {
    return null;
  }

  return (
    <section id="actividades" className="w-full bg-white py-16">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-10 text-gray-900">
          {title || "Actividades"}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {activities.map((act) => (
            <div key={act.id} className="border rounded-lg p-4 hover:shadow-md transition">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-500">
                  {act.date
                    ? new Date(act.date).toLocaleDateString("es-ES", { day: "numeric", month: "short" }) +
                      " · " +
                      new Date(act.date).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
                    : ""}
                </span>
                {act.status && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full text-center text-white"
                    style={{ backgroundColor: act.status.color }}
                  >
                    {act.status.label}
                  </span>
                )}
              </div>
              <h3 className="font-semibold text-lg mb-1">{act.name}</h3>
              {act.project && (
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">{act.project.name}</p>
              )}
              {act.manager && (
                <div className="flex items-center mb-4">
                  {act.manager.photo ? (
                    <img
                      src={act.manager.photo}
                      alt={act.manager.name}
                      className="h-8 w-8 rounded-full mr-2 object-cover"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500 mr-2">
                      {act.manager.name.charAt(0)}
                    </div>
                  )}
                  <span className="text-sm text-gray-700">{act.manager.name}</span>
                </div>
              )}
              <a
                href="/actividades"
                className="inline-block mt-auto text-blue-600 hover:underline text-sm"
              >
                Ver todas
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}