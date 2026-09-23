import { projectService, type ProjectGroup } from "~/services/projectService";

export type GroupOption = { value: string; label: string };

type ActiveProject = { id: string; name: string };

type ProjectGroupApi = {
    listProjects: (
        page?: number,
        size?: number,
        name?: string,
        active?: boolean,
        season?: string,
    ) => Promise<{ content: ActiveProject[] }>;
    listGroups: (projectId: string) => Promise<ProjectGroup[]>;
    createGroup: (projectId: string, name?: string | null) => Promise<ProjectGroup>;
};

export async function loadAssignableGroupOptions(api: ProjectGroupApi = projectService): Promise<GroupOption[]> {
    const projectsRes = await api.listProjects(0, 100, undefined, true);
    const allOptions: GroupOption[] = [];

    for (const project of projectsRes.content) {
        const groups = await api.listGroups(project.id);
        const namedGroups = groups.filter((g) => g.name);
        let defaultGroup = groups.find((g) => !g.name);

        // Older projects may not have a project-level group; create it on demand.
        if (!defaultGroup) {
            defaultGroup = await api.createGroup(project.id, null);
        }

        allOptions.push({
            value: defaultGroup.id,
            label: namedGroups.length === 0 ? project.name : `${project.name} (sin grupo)`,
        });

        for (const group of namedGroups) {
            allOptions.push({
                value: group.id,
                label: `${group.name} (${project.name})`,
            });
        }
    }

    return allOptions;
}

export type GroupOptionGroup = {
    projectName: string;
    options: GroupOption[];
};

/**
 * Igual que {@link loadAssignableGroupOptions} pero agrupado por proyecto,
 * listo para renderizarse con `<optgroup>`.
 */
export async function loadAssignableGroupOptionsGrouped(
    api: ProjectGroupApi = projectService,
): Promise<GroupOptionGroup[]> {
    const projectsRes = await api.listProjects(0, 100, undefined, true);
    const result: GroupOptionGroup[] = [];

    for (const project of projectsRes.content) {
        const groups = await api.listGroups(project.id);
        const namedGroups = groups.filter(
            (g): g is ProjectGroup & { name: string } => !!g.name,
        );
        let defaultGroup = groups.find((g) => !g.name);

        // Older projects may not have a project-level group; create it on demand.
        if (!defaultGroup) {
            defaultGroup = await api.createGroup(project.id, null);
        }

        const options: GroupOption[] = [
            {
                value: defaultGroup.id,
                label: namedGroups.length === 0 ? project.name : `${project.name} (sin grupo)`,
            },
        ];

        for (const group of namedGroups) {
            options.push({ value: group.id, label: group.name });
        }

        result.push({ projectName: project.name, options });
    }

    return result;
}