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
      <section id="actividades" className="w-full bg-yambo-white py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-10 text-yambo-black font-display">
            {title || "Actividades"}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 stagger">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-5 shadow-sm animate-pulse">
                <div className="flex justify-between items-center mb-3">
                  <div className="h-4 bg-gray-200 rounded-full w-24"></div>
                  <div className="h-5 bg-gray-200 rounded-full w-20"></div>
                </div>
                <div className="h-5 bg-gray-200 rounded-lg w-3/4 mb-3"></div>
                <div className="flex items-center mb-4">
                  <div className="h-9 w-9 bg-gray-200 rounded-full mr-3"></div>
                  <div className="h-4 bg-gray-200 rounded-lg w-16"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded-full w-16"></div>
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
    <section id="actividades" className="w-full bg-yambo-white py-20">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-3 text-yambo-black font-display">
          {title || "Actividades"}
        </h2>
        <p className="text-center text-gray-500 mb-10 max-w-lg mx-auto">
          Próximas actividades abiertas al público
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 stagger">
          {activities.map((act, idx) => (
            <div
              key={act.id}
              className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover-lift fade-up transition-all"
              style={{ animationDelay: `${idx * 80}ms` }}
            >
              {/* Status accent bar */}
              <div
                className="h-1 rounded-full mb-3 -mt-1"
                style={{ backgroundColor: act.status?.color || "#e5e7eb" }}
              />

              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-gray-400 font-medium">
                  {act.date
                    ? new Date(act.date).toLocaleDateString("es-ES", { day: "numeric", month: "short" }) +
                      " · " +
                      new Date(act.date).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
                    : ""}
                </span>
                {act.status && (
                  <span
                    className="text-xs px-2.5 py-0.5 rounded-full text-center text-white font-medium"
                    style={{ backgroundColor: act.status.color }}
                  >
                    {act.status.label}
                  </span>
                )}
              </div>
              <h3 className="font-bold text-lg mb-1 text-yambo-black">{act.name}</h3>
              {act.project && (
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-3 font-medium">{act.project.name}</p>
              )}
              {act.manager && (
                <div className="flex items-center mb-4">
                  {act.manager.photo ? (
                    <img
                      src={act.manager.photo}
                      alt={act.manager.name}
                      className="h-9 w-9 rounded-full mr-3 object-cover ring-2 ring-yambo-green-100 shadow-sm"
                    />
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-yambo-green-200 to-yambo-purple-200 flex items-center justify-center text-xs font-bold text-yambo-black mr-3 shadow-sm">
                      {act.manager.name.charAt(0)}
                    </div>
                  )}
                  <span className="text-sm text-gray-600">{act.manager.name}</span>
                </div>
              )}
              <a
                href="/actividades"
                className="inline-flex items-center gap-1 mt-auto text-yambo-green-600 hover:text-yambo-green-700 text-sm font-semibold transition-colors"
              >
                Ver todas →
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
