export type NotificationPreferences = {
    orderStatus: boolean;
    orderCancelled: boolean;
    issueCreated: boolean;
    issueComments: boolean;
    issueStatus: boolean;
};

export type CurrentUser = {
    id: string;
    email: string;
    name: string;
    photo?: string;
    bio?: string;
    funFact?: string;
    notificationPreferences?: NotificationPreferences;
    groupRoles?: UserGroupRole[];
    permissions: Permission[]
};

export type User = {
    id: string;
    email: string;
    name: string;
    photo?: string;
    bio?: string;
    funFact?: string;
    groupRoles?: UserGroupRole[];
    createdAt: string;
    created_by: string;
    permissions: Permission[]
    profiles : Profile[]
    enabled: boolean;
    system?: boolean;
}

import type { GroupRole } from './role';

export type UserGroupRole = {
    groupId: string;
    groupName: string | null;
    projectId: string;
    projectName: string;
    role: GroupRole;
}

export type Profile = {
    id: string;
    name: string;
}

export type Permission = {
    obj: string
    actions: string[]
}

