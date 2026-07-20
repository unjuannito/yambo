export interface ActivityProject {
    id: string;
    name: string;
}

export interface ActivityManager {
    id: string;
    name: string;
    photo: string | null;
}

export interface ActivityStatusInfo {
    value: string;
    label: string;
    color: string;
}

export enum ActivityStatus {
    PLANNED = "PLANNED",
    OPEN_REGISTRATION = "OPEN_REGISTRATION",
    REGISTRATION_CLOSED = "REGISTRATION_CLOSED",
    CLOSED = "CLOSED",
    CANCELLED = "CANCELLED",
}

export const ACTIVITY_STATUS_OPTIONS: { value: string; label: string }[] = [
    { value: ActivityStatus.PLANNED, label: "Planificada" },
    { value: ActivityStatus.OPEN_REGISTRATION, label: "Abierta para apuntarse" },
    { value: ActivityStatus.REGISTRATION_CLOSED, label: "Inscripciones cerradas" },
    { value: ActivityStatus.CLOSED, label: "Cerrada" },
    { value: ActivityStatus.CANCELLED, label: "Cancelada" },
];

export interface Activity {
    id: string;
    name: string;
    description: string | null;
    image: string | null;
    location: string | null;
    price: number | null;
    date: string | null;
    endDate: string | null;
    status: ActivityStatusInfo | null;
    public: boolean;
    project: ActivityProject | null;
    manager: ActivityManager | null;
    waitlistCount: number;
}
