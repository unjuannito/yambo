export type CurrentUser = {
    email: string;
    name: string;
    permissions: Permission[]
};

export type User = {
    id: string;
    email: string;
    name: string;
    createdAt: string;
    created_by: string;
    permissions: Permission[]
    profiles : Profile[]
}

export type Profile = {
    id: string;
    name: string;
}

export type Permission = {
    obj: string
    actions: string[]
}

