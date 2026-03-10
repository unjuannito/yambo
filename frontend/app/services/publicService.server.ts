/**
 * Server-side public service for SSR loaders.
 *
 * Uses plain fetch() with an absolute backend URL (process.env.BACKEND_INTERNAL_URL)
 * so that server loaders can call the API without browser APIs like window or localStorage.
 *
 * The `.server.ts` suffix ensures this module is never bundled into the client.
 */

import type {
    HomeSettings,
    FeaturedProject,
    StaffMember,
    ActiveProject,
    ProjectDetail,
    ContactSettings,
} from "./publicService";
import type { Activity } from "~/types/activity";

const BACKEND_URL =
    process.env.BACKEND_INTERNAL_URL || "http://localhost:8080/api";

async function fetchJson<T>(endpoint: string): Promise<T> {
    const url = `${BACKEND_URL}${endpoint}`;
    const res = await fetch(url, {
        headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) {
        throw new Error(
            `Server fetch failed: ${res.status} ${res.statusText} for ${url}`,
        );
    }

    return res.json() as Promise<T>;
}

export async function getHomeSettings(): Promise<HomeSettings> {
    return fetchJson("/public/settings/home");
}

export async function getContactSettings(): Promise<ContactSettings> {
    return fetchJson("/public/settings/contact");
}

export async function getFeaturedProjects(): Promise<FeaturedProject[]> {
    return fetchJson("/public/projects/featured");
}

export async function getStaff(): Promise<StaffMember[]> {
    return fetchJson("/public/monitors");
}

export async function getActiveProjects(): Promise<ActiveProject[]> {
    return fetchJson("/public/projects/active");
}

export async function getProjectDetail(id: string): Promise<ProjectDetail> {
    return fetchJson(`/public/projects/${encodeURIComponent(id)}`);
}

export async function getPublicActivities(): Promise<Activity[]> {
    return fetchJson("/public/activities");
}
