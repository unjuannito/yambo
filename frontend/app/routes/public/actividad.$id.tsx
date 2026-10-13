import { redirect, useLoaderData } from "react-router";
import { useTranslation } from "react-i18next";
import { getSiteUrl } from "~/utils/env.server";
import { activityJsonLd, breadcrumbJsonLd } from "~/utils/jsonld";
import { buildMeta, isIndexableActivity, metaDescription } from "~/utils/seo";
import type { Route } from "./+types/actividad.$id";
import type { Activity } from "~/types/activity";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faShareNodes, faCalendarDays, faMapPin, faEuroSign, faTag, faBell } from "@fortawesome/free-solid-svg-icons";
import toast from "react-hot-toast";
import { useState } from "react";
import { publicService } from "~/services/publicService";
import { activityPath } from "~/utils/publicPaths";

export async function loader({ params, request }: Route.LoaderArgs) {
    const backendUrl =
        process.env.BACKEND_INTERNAL_URL || "http://localhost:8080/api";

    const cookie = request.headers.get("Cookie") || "";
    const backendCookie = cookie.split(";")
        .find(c => c.trim().startsWith("waitlist_email="))
        ?.split("=")[1]?.trim();

    const [activityRes, contactRes] = await Promise.all([
        fetch(`${backendUrl}/public/activities/${params.id}`, {
            headers: { "Content-Type": "application/json" },
        }),
        fetch(`${backendUrl}/public/settings/contact`, {
            headers: { "Content-Type": "application/json" },
        }),
    ]);

    if (!activityRes.ok) {
        throw new Response(null, {
            status: 404,
            statusText: "Activity not found",
        });
    }

    const activity: Activity = await activityRes.json();
    // Los enlaces antiguos llevan el id: se envían a la URL con nombre
    if (activity.slug && params.id !== activity.slug) {
        throw redirect(activityPath(activity), 301);
    }
    const contactSettings = contactRes.ok ? await contactRes.json() : {};
    return { activity, siteUrl: getSiteUrl(), contactEmail: contactSettings["contact.email"] || "yamboalcobendas@gmail.com", savedEmail: backendCookie || "" };
}

export function meta({ data }: Route.MetaArgs) {
    const { t } = useTranslation();
    const { activity, siteUrl } = data;
    const pageUrl = `${siteUrl}${activityPath(activity)}`;
    const cancelled = activity.status?.value === "CANCELLED";
    const statusPrefix = cancelled ? `[${t('public.activityCancelledTitle')}] ` : "";

    const descParts = [
        activity.description && metaDescription(activity.description, 120),
        activity.location && `${activity.location}`,
        activity.price != null && `${activity.price} €`,
        activity.date &&
            `${new Date(activity.date).toLocaleDateString("es-ES", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
            })}`,
    ].filter(Boolean) as string[];
    const description = descParts.join(" | ") || activity.name;

    return [
        ...buildMeta({
            siteUrl,
            path: activityPath(activity),
            title: `${statusPrefix}${activity.name} | Yambo`,
            description,
            image: activity.image,
            index: isIndexableActivity(activity),
        }),
        { "script:ld+json": activityJsonLd(activity, siteUrl) },
        {
            "script:ld+json": breadcrumbJsonLd([
                { name: t('nav.home'), url: siteUrl },
                { name: t('public.activitiesTitle'), url: `${siteUrl}/actividades` },
                { name: activity.name, url: pageUrl },
            ]),
        },
    ];
}

export default function ActivityDetail() {
    const { t } = useTranslation();
    const { activity, contactEmail, savedEmail } = useLoaderData<typeof loader>();
    const [waitlistEmail, setWaitlistEmail] = useState(savedEmail);
    const [waitlistSubmitting, setWaitlistSubmitting] = useState(false);
    const [waitlistDone, setWaitlistDone] = useState(false);
    const [waitlistError, setWaitlistError] = useState("");
    const now = new Date();
    const activityDate = activity.date ? new Date(activity.date) : null;
    const isPast = activityDate ? activityDate < now : false;
    const cancelled = activity.status?.value === "CANCELLED";
    const canRegister = !isPast && !cancelled && activity.status?.value === "OPEN_REGISTRATION";
    const canJoinWaitlist = !isPast && !cancelled && activity.status?.value === "PLANNED";
    const imageUrl = activity.image || null;

    const handleWaitlistSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!waitlistEmail || !waitlistEmail.includes("@")) return;
        setWaitlistSubmitting(true);
        setWaitlistError("");
        try {
            await publicService.joinWaitlist(activity.id, waitlistEmail);
            // Save email in cookie for 30 days
            document.cookie = `waitlist_email=${encodeURIComponent(waitlistEmail)}; path=/; max-age=${60*60*24*30}; SameSite=Lax`;
            setWaitlistDone(true);
            toast(t('public.waitlistSuccess'), { duration: 4000 });
        } catch (err: any) {
            setWaitlistError(err.message || "Error de conexión");
        } finally {
            setWaitlistSubmitting(false);
        }
    };

    return (
        <section className="w-full bg-gradient-to-b from-yambo-purple-50/30 to-yambo-white min-h-screen">
            {/* ── Top bar: back + share ── */}
            <div className="sticky top-16 z-20 bg-white/80 backdrop-blur-md border-b border-gray-100">
                <div className="max-w-6xl mx-auto px-4 md:px-8 py-3 flex items-center justify-between">
                    <a
                        href="/actividades"
                        className="inline-flex items-center gap-1.5 text-sm font-bold text-yambo-green-700 hover:text-yambo-green-800 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                        {t('public.backToList') || "Todas las actividades"}
                    </a>
                    <button type="button"
                        onClick={() => {
                            if (navigator.share) {
                                navigator.share({
                                    title: activity.name,
                                    text: activity.description?.slice(0, 200) || activity.name,
                                    url: window.location.href,
                                });
                            } else {
                                navigator.clipboard.writeText(window.location.href);
                                toast(t('public.activityCopied'), { duration: 2000 });
                            }
                        }}
                        className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-yambo-green-600 transition-colors"
                    >
                        <FontAwesomeIcon icon={faShareNodes} className="w-4 h-4" />
                        {t('public.activityShare')}
                    </button>
                </div>
            </div>

            {/* ── DESKTOP: Split layout ── */}
            <div className="hidden md:flex min-h-[calc(100vh-4rem-53px)]">
                {/* Left: Image panel — fixed */}
                {imageUrl ? (
                    <div className={`w-2/5 fixed top-[calc(4rem+53px)] left-0 h-[calc(100vh-4rem-53px)] overflow-hidden ${cancelled ? "opacity-55" : ""}`}>
                        <img
                            src={imageUrl}
                            alt={activity.name}
                            className="w-full h-full object-contain bg-yambo-black"
                        />
                    </div>
                ) : (
                    <div className="w-2/5 fixed top-[calc(4rem+53px)] left-0 h-[calc(100vh-4rem-53px)] bg-yambo-purple-100 flex items-center justify-center p-10">
                        <div className="text-4xl lg:text-5xl font-extrabold text-yambo-black font-display leading-tight">
                            {activity.name}
                        </div>
                    </div>
                )}

                {/* Right: Content panel — scrollable */}
                <div className="w-3/5 ml-[40%] overflow-y-auto p-8 lg:p-12">
                    {/* Title */}
                    <h1 className="text-3xl lg:text-4xl font-extrabold text-yambo-black font-display leading-tight mb-6">
                        {activity.name}
                    </h1>

                    {/* Status badge — desktop */}
                    {activity.status && (
                        <div className="mb-4">
                            <span
                                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-bold text-white shadow-sm ${
                                    cancelled ? "bg-red-600" : ""
                                }`}
                                style={!cancelled ? { backgroundColor: activity.status.color } : {}}
                            >
                                ● {activity.status.label}
                            </span>
                        </div>
                    )}

                    {/* Cancelled alert */}
                    {cancelled && (
                        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 mb-6">
                            <p className="font-bold text-red-800 text-sm">{t('public.activityCancelledTitle')}</p>
                            <p className="text-red-600 text-sm mt-1 leading-relaxed">
                                {t('public.activityCancelledDesc')}
                            </p>
                        </div>
                    )}

                    {/* Info grid: Fecha | Ubicación | Precio | Proyecto */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
                        <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                            {activity.date && (
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5 w-8 h-8 rounded-lg bg-yambo-green-50 flex items-center justify-center text-yambo-green-600 shrink-0">
                                        <FontAwesomeIcon icon={faCalendarDays} className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('public.activityDate')}</p>
                                        <p className="text-base font-bold text-yambo-black mt-0.5">
                                            {new Date(activity.date).toLocaleDateString("es-ES", {
                                                weekday: "long",
                                                year: "numeric",
                                                month: "long",
                                                day: "numeric",
                                            })}
                                        </p>
                                        {activity.endDate && (
                                            <p className="text-sm text-gray-500 mt-0.5">
                                                {t('public.activityUntil')}{" "}
                                                {new Date(activity.endDate).toLocaleDateString("es-ES", {
                                                    weekday: "long",
                                                    year: "numeric",
                                                    month: "long",
                                                    day: "numeric",
                                                })}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                            {activity.location && (
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5 w-8 h-8 rounded-lg bg-yambo-purple-50 flex items-center justify-center text-yambo-purple-600 shrink-0">
                                        <FontAwesomeIcon icon={faMapPin} className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('public.activityLocation')}</p>
                                        <p className="text-base font-semibold text-yambo-black mt-0.5">{activity.location}</p>
                                    </div>
                                </div>
                            )}
                            {activity.price != null && (
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5 w-8 h-8 rounded-lg bg-yambo-green-50 flex items-center justify-center text-yambo-green-600 shrink-0">
                                        <FontAwesomeIcon icon={faEuroSign} className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('public.activityPrice')}</p>
                                        <p className="text-lg font-extrabold text-yambo-green-700 mt-0.5">
                                            {activity.price.toFixed(2).replace(".", ",")} €
                                        </p>
                                    </div>
                                </div>
                            )}
                            {activity.project && (
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5 w-8 h-8 rounded-lg bg-yambo-orange-50 flex items-center justify-center text-yambo-orange-600 shrink-0">
                                        <FontAwesomeIcon icon={faTag} className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('public.activityProject')}</p>
                                        <p className="text-base font-semibold text-yambo-black mt-0.5">{activity.project.name}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Description */}
                    {activity.description && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
                            <h2 className="text-lg font-bold text-yambo-black mb-3 font-display">
                                {t('public.activityDescription')}
                            </h2>
                            <div className="text-gray-600 leading-relaxed whitespace-pre-line text-base">
                                {activity.description}
                            </div>
                        </div>
                    )}

                    {/* CTA */}
                    {canRegister && (
                        <div className="pt-2 pb-8">
                            <a
                                href={`mailto:${contactEmail}?subject=Quiero%20apuntarme%20a%20${encodeURIComponent(activity.name)}`}
                                className="inline-flex items-center justify-center w-full bg-yambo-green-600 hover:bg-yambo-green-700 text-white font-bold py-4 px-10 rounded-full transition-all shadow-lg hover:shadow-xl text-base"
                            >
                                {t('public.activityRegister')}
                            </a>
                        </div>
                    )}

                    {/* Waitlist for planned activities */}
                    {canJoinWaitlist && !waitlistDone && (
                        <div className="bg-yambo-purple-50 border border-yambo-purple-200 rounded-2xl p-6 mb-6">
                            <div className="flex items-start gap-3 mb-3">
                                <div className="w-10 h-10 rounded-full bg-yambo-purple-100 flex items-center justify-center text-yambo-purple-600 shrink-0">
                                    <FontAwesomeIcon icon={faBell} className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-yambo-black text-base">{t('public.waitlistTitle')}</h3>
                                    <p className="text-sm text-gray-600 mt-1">{t('public.waitlistDesc')}</p>
                                </div>
                            </div>
                            <form onSubmit={handleWaitlistSubmit} className="flex gap-2 mt-3">
                                <input
                                    type="email"
                                    value={waitlistEmail}
                                    onChange={(e) => setWaitlistEmail(e.target.value)}
                                    placeholder={t('public.waitlistPlaceholder')}
                                    required
                                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-yambo-purple-400 focus:border-transparent"
                                />
                                <button
                                    type="submit"
                                    disabled={waitlistSubmitting}
                                    className="px-5 py-2.5 bg-yambo-purple-600 hover:bg-yambo-purple-700 disabled:bg-yambo-purple-300 text-white font-bold rounded-xl transition-colors text-sm whitespace-nowrap"
                                >
                                    {waitlistSubmitting ? "..." : t('public.waitlistButton')}
                                </button>
                            </form>
                            {waitlistError && (
                                <p className="text-red-600 text-sm mt-2">{waitlistError}</p>
                            )}
                        </div>
                    )}

                    {canJoinWaitlist && waitlistDone && (
                        <div className="bg-green-50 border border-green-200 rounded-2xl p-5 mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 shrink-0">
                                    <FontAwesomeIcon icon={faBell} className="w-5 h-5" />
                                </div>
                                <p className="font-semibold text-green-800 text-sm">{t('public.waitlistDone')}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── MOBILE: Vertical layout ── */}
            <div className="md:hidden pb-24">
                <div className="max-w-4xl mx-auto px-4 pt-5">
                    {/* Cover image */}
                    {imageUrl ? (
                        <div className={`relative w-full aspect-[9/16] max-h-[60vh] rounded-2xl overflow-hidden mb-5 shadow-lg bg-yambo-black ${cancelled ? "opacity-55" : ""}`}>
                            <img
                                src={imageUrl}
                                alt={activity.name}
                                className="w-full h-full object-contain"
                            />
                        </div>
                    ) : (
                        <h2 className="text-3xl font-extrabold text-yambo-black font-display leading-tight mb-5">
                            {activity.name}
                        </h2>
                    )}

                    {/* Title (when image exists) */}
                    {imageUrl && (
                        <h2 className="text-2xl font-extrabold text-yambo-black font-display leading-tight mb-4">
                            {activity.name}
                        </h2>
                    )}

                    {/* Status badge — mobile */}
                    {activity.status && (
                        <div className="mb-4">
                            <span
                                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-bold text-white shadow-sm ${
                                    cancelled ? "bg-red-600" : ""
                                }`}
                                style={!cancelled ? { backgroundColor: activity.status.color } : {}}
                            >
                                ● {activity.status.label}
                            </span>
                        </div>
                    )}

                    {/* Cancelled alert — mobile */}
                    {cancelled && (
                        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-5">
                            <p className="font-bold text-red-800 text-sm">{t('public.activityCancelledTitle')}</p>
                            <p className="text-red-600 text-sm mt-1 leading-relaxed">
                                {t('public.activityCancelledDesc')}
                            </p>
                        </div>
                    )}

                    {/* Info card — mobile */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                            {activity.date && (
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5 w-8 h-8 rounded-lg bg-yambo-green-50 flex items-center justify-center text-yambo-green-600 shrink-0">
                                        <FontAwesomeIcon icon={faCalendarDays} className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('public.activityDate')}</p>
                                        <p className="text-base font-bold text-yambo-black mt-0.5">
                                            {new Date(activity.date).toLocaleDateString("es-ES", {
                                                weekday: "long",
                                                year: "numeric",
                                                month: "long",
                                                day: "numeric",
                                            })}
                                        </p>
                                        {activity.endDate && (
                                            <p className="text-sm text-gray-500 mt-0.5">
                                                {t('public.activityUntil')}{" "}
                                                {new Date(activity.endDate).toLocaleDateString("es-ES", {
                                                    weekday: "long",
                                                    year: "numeric",
                                                    month: "long",
                                                    day: "numeric",
                                                })}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                            {activity.location && (
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5 w-8 h-8 rounded-lg bg-yambo-purple-50 flex items-center justify-center text-yambo-purple-600 shrink-0">
                                        <FontAwesomeIcon icon={faMapPin} className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('public.activityLocation')}</p>
                                        <p className="text-base font-semibold text-yambo-black mt-0.5">{activity.location}</p>
                                    </div>
                                </div>
                            )}
                            {activity.price != null && (
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5 w-8 h-8 rounded-lg bg-yambo-green-50 flex items-center justify-center text-yambo-green-600 shrink-0">
                                        <FontAwesomeIcon icon={faEuroSign} className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('public.activityPrice')}</p>
                                        <p className="text-lg font-extrabold text-yambo-green-700 mt-0.5">
                                            {activity.price.toFixed(2).replace(".", ",")} €
                                        </p>
                                    </div>
                                </div>
                            )}
                            {activity.project && (
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5 w-8 h-8 rounded-lg bg-yambo-orange-50 flex items-center justify-center text-yambo-orange-600 shrink-0">
                                        <FontAwesomeIcon icon={faTag} className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('public.activityProject')}</p>
                                        <p className="text-base font-semibold text-yambo-black mt-0.5">{activity.project.name}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Description — mobile */}
                    {activity.description && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-5">
                            <h2 className="text-lg font-bold text-yambo-black mb-3 font-display">Descripción</h2>
                            <div className="text-gray-600 leading-relaxed whitespace-pre-line text-sm md:text-base">
                                {activity.description}
                            </div>
                        </div>
                    )}
                </div>

                {/* Waitlist for planned activities — mobile */}
                    {canJoinWaitlist && !waitlistDone && (
                        <div className="bg-yambo-purple-50 border border-yambo-purple-200 rounded-2xl p-5 mb-5">
                            <div className="flex items-start gap-3 mb-3">
                                <div className="w-9 h-9 rounded-full bg-yambo-purple-100 flex items-center justify-center text-yambo-purple-600 shrink-0">
                                    <FontAwesomeIcon icon={faBell} className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-yambo-black text-sm">{t('public.waitlistTitle')}</h3>
                                    <p className="text-xs text-gray-600 mt-0.5">{t('public.waitlistDesc')}</p>
                                </div>
                            </div>
                            <form onSubmit={handleWaitlistSubmit} className="flex flex-col gap-2 mt-2">
                                <input
                                    type="email"
                                    value={waitlistEmail}
                                    onChange={(e) => setWaitlistEmail(e.target.value)}
                                    placeholder={t('public.waitlistPlaceholder')}
                                    required
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-yambo-purple-400 focus:border-transparent"
                                />
                                <button
                                    type="submit"
                                    disabled={waitlistSubmitting}
                                    className="w-full py-2.5 bg-yambo-purple-600 hover:bg-yambo-purple-700 disabled:bg-yambo-purple-300 text-white font-bold rounded-xl transition-colors text-sm"
                                >
                                    {waitlistSubmitting ? "..." : t('public.waitlistButton')}
                                </button>
                            </form>
                            {waitlistError && (
                                <p className="text-red-600 text-xs mt-2">{waitlistError}</p>
                            )}
                        </div>
                    )}

                    {canJoinWaitlist && waitlistDone && (
                        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-5">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-green-600 shrink-0">
                                    <FontAwesomeIcon icon={faBell} className="w-4 h-4" />
                                </div>
                                <p className="font-semibold text-green-800 text-xs">{t('public.waitlistDone')}</p>
                            </div>
                        </div>
                    )}

                {/* Floating CTA — mobile */}
                {canRegister && (
                    <div className="fixed bottom-0 left-0 right-0 z-20 bg-white/95 backdrop-blur-md border-t border-gray-200 p-4 md:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
                        <a
                            href={`mailto:${contactEmail}?subject=Quiero%20apuntarme%20a%20${encodeURIComponent(activity.name)}`}
                            className="block w-full bg-yambo-green-600 hover:bg-yambo-green-700 text-white font-bold py-3.5 px-6 rounded-full text-center shadow-lg transition-colors text-base"
                        >
                            {t('public.activityRegister')}
                        </a>
                    </div>
                )}
            </div>
        </section>
    );
}
