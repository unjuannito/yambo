import type { TFunction } from "i18next";
import type { StaffGroup } from "~/services/publicService";

export interface StaffRoleLabel {
    key: string;
    label: string;
    role: StaffGroup["role"];
    /** Semilla para `projectColor`, estable por proyecto y grupo. */
    colorSeed: string;
}

/** «Barrio Peques»: el grupo con su proyecto delante, salvo que el nombre ya lo lleve. */
function groupDisplayName(group: StaffGroup): string {
    if (!group.name) return group.projectName;
    const alreadyPrefixed = group.name.toLowerCase().startsWith(group.projectName.toLowerCase());
    return alreadyPrefixed ? group.name : `${group.projectName} ${group.name}`;
}

/**
 * Etiquetas de rol de una persona del equipo: primero las de coordinación
 * («Coordinador - Jambo»), después las de monitor («Monitor en Barrio Peques»).
 * Con `projectName` devuelve solo los grupos de monitor de ese proyecto, sin prefijo,
 * porque la página del proyecto ya separa coordinación y monitores.
 */
export function staffRoleLabels(groups: StaffGroup[], t: TFunction, projectName?: string): StaffRoleLabel[] {
    const byKey = new Map<string, StaffRoleLabel>();
    const add = (entry: StaffRoleLabel) => {
        if (!byKey.has(entry.key)) byKey.set(entry.key, entry);
    };

    for (const group of groups) {
        const colorSeed = group.projectName + (group.name || "");
        if (projectName) {
            if (group.projectName === projectName && group.name && group.role === "MONITOR") {
                add({ key: `${group.id}-MONITOR`, label: group.name, role: "MONITOR", colorSeed });
            }
        } else if (group.role === "COORDINATOR") {
            add({
                key: `${group.projectName}-COORDINATOR`,
                label: t("public.staffRoleCoordinator", { project: group.projectName }),
                role: "COORDINATOR",
                colorSeed: group.projectName,
            });
        } else {
            add({
                key: `${group.id}-MONITOR`,
                label: t("public.staffRoleMonitor", { name: groupDisplayName(group) }),
                role: "MONITOR",
                colorSeed,
            });
        }
    }

    return [...byKey.values()].sort((a, b) => {
        if (a.role !== b.role) return a.role === "COORDINATOR" ? -1 : 1;
        return a.label.localeCompare(b.label, "es");
    });
}
