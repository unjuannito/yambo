export type CurrentUser = {
    email: string;
    name: string;
    photo?: string;
    bio?: string;
    groups?: UserGroup[];
    permissions: Permission[]
};

export type User = {
    id: string;
    email: string;
    name: string;
    photo?: string;
    bio?: string;
    groups?: UserGroup[];
    createdAt: string;
    created_by: string;
    permissions: Permission[]
    profiles : Profile[]
    enabled: boolean;
}

export type UserGroup = {
    id: string;
    name: string | null;
    projectId: string;
    projectName: string;
}

export type Profile = {
    id: string;
    name: string;
}

export type Permission = {
    obj: string
    actions: string[]
}

