import { useState, useEffect, useCallback } from "react";
import { useAuth } from "~/hooks/useAuth";
import { orderService, type Order } from "~/services/orderService";
import { adminUserService } from "~/services/adminUserService";
import { projectService } from "~/services/projectService";
import { activityService } from "~/services/activityService";
import { productService } from "~/services/productService";
import type { Activity } from "~/types/activity";

export interface PersonalDashboardData {
    orders: Order[];
    recentOrders: Order[];
    totalOrders: number;
    ordersByStatus: Record<string, number>;
}

export interface AdminDashboardData {
    totalUsers: number;
    totalOrders: number;
    totalProjects: number;
    totalProducts: number;
    recentActivities: Activity[];
}

export interface DashboardData {
    personal: PersonalDashboardData;
    admin: AdminDashboardData | null;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

export function useDashboardData(): DashboardData {
    const { user, hasPermission } = useAuth();

    const [personal, setPersonal] = useState<PersonalDashboardData>({
        orders: [],
        recentOrders: [],
        totalOrders: 0,
        ordersByStatus: {},
    });

    const [admin, setAdmin] = useState<AdminDashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const canReadUsers = hasPermission({ obj: "user", action: "read" });
    const canReadOrders = hasPermission({ obj: "order", action: "read" });
    const canReadProjects = hasPermission({ obj: "project", action: "read" });
    const canReadActivities = hasPermission({ obj: "activity", action: "read" });
    const canReadProducts = hasPermission({ obj: "family_product", action: "read" });
    const isAdmin = canReadUsers || canReadOrders || canReadProjects;

    const fetchData = useCallback(async () => {
        if (!user) return;

        try {
            setLoading(true);
            setError(null);

            // Personal data — always fetched
            const myOrdersResponse = await orderService.getMyOrders();
            const myOrders = myOrdersResponse.content;
            const sorted = [...myOrders].sort(
                (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            const ordersByStatus: Record<string, number> = {};
            myOrders.forEach((order) => {
                ordersByStatus[order.status] = (ordersByStatus[order.status] || 0) + 1;
            });

            setPersonal({
                orders: myOrders,
                recentOrders: sorted.slice(0, 5),
                totalOrders: myOrders.length,
                ordersByStatus,
            });

            // Admin data — only if user has admin permissions
            if (isAdmin) {
                const [usersRes, ordersRes, projectsRes, activitiesRes, productsRes] =
                    await Promise.allSettled([
                        canReadUsers
                            ? adminUserService.listUsers({ page: 0, size: 1 })
                            : Promise.resolve(null),
                        canReadOrders
                            ? orderService.getAllOrders(0, 1)
                            : Promise.resolve(null),
                        canReadProjects
                            ? projectService.listProjects(0, 1)
                            : Promise.resolve(null),
                        canReadActivities
                            ? activityService.getActivities(0, 5)
                            : Promise.resolve(null),
                        canReadProducts
                            ? productService.getAllProducts(0, 1)
                            : Promise.resolve(null),
                    ]);

                const adminData: AdminDashboardData = {
                    totalUsers:
                        usersRes.status === "fulfilled" && usersRes.value
                            ? usersRes.value.page.totalElements
                            : 0,
                    totalOrders:
                        ordersRes.status === "fulfilled" && ordersRes.value
                            ? ordersRes.value.page.totalElements
                            : 0,
                    totalProjects:
                        projectsRes.status === "fulfilled" && projectsRes.value
                            ? projectsRes.value.page.totalElements
                            : 0,
                    totalProducts:
                        productsRes.status === "fulfilled" && productsRes.value
                            ? productsRes.value.page.totalElements
                            : 0,
                    recentActivities:
                        activitiesRes.status === "fulfilled" && activitiesRes.value
                            ? activitiesRes.value.content
                            : [],
                };

                setAdmin(adminData);
            }
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Error al cargar los datos del dashboard"
            );
        } finally {
            setLoading(false);
        }
    }, [user, isAdmin, canReadUsers, canReadOrders, canReadProjects, canReadActivities, canReadProducts]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { personal, admin, loading, error, refetch: fetchData };
}
