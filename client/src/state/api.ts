import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { updateUser } from "@/state";

export interface Product {
  productId: string;
  sku: string;
  name: string;
  weight?: number;
  unit: "KG" | "ML_G";
  expirationDate?: string;
  note?: string;
  stockQuantity: number;
  category: string;
  updatedAt?: string;
  imageUrl?: string;
}

export interface ProductFormData {
  productId?: string;
  sku: string;
  name: string;
  weight?: number;
  expirationDate?: string;
  note?: string;
  stockQuantity: number;
  category: string;
}

export interface DashboardMetrics {
  popularProducts: Product[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  image?: string | null;
  createdAt: string;
  criticalProductsCount: number;
  isOnline?: boolean;
  language?: string;
}

export interface GetUsersResponse {
  users: User[];
  totalCriticalSystem: number;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export interface AuditLog {
  logId: string;
  userId: string;
  action: string;
  details: string;
  timestamp: string;
  user?: {
    name: string;
    email: string;
  };
}

export interface UpdateUserFields {
  userId: string;
  username: string;
  email: string;
  language: string;
  profileImageBase64: string | null;
}

export const api = createApi({
  baseQuery: fetchBaseQuery({
    baseUrl: "/api",
    credentials: "include",
    prepareHeaders: (headers) => headers,
  }),
  reducerPath: "api",
  tagTypes: [
    "DashboardMetrics",
    "Products",
    "Users",
    "Notifications",
    "AuditLogs",
  ],
  endpoints: (build) => ({
    login: build.mutation<AuthResponse, any>({
      query: (credentials) => ({
        url: "/auth/login",
        method: "POST",
        body: credentials,
      }),
    }),

    register: build.mutation<any, any>({
      query: (userData) => ({
        url: "/auth/register",
        method: "POST",
        body: userData,
      }),
    }),

    getDashboardMetrics: build.query<DashboardMetrics, void>({
      query: () => "/dashboard",
      providesTags: ["DashboardMetrics"],
    }),

    getProducts: build.query<Product[], string | void>({
      query: (search) => ({
        url: "/products",
        params: search ? { search } : {},
      }),
      providesTags: ["Products"],
    }),

    createProduct: build.mutation<Product, ProductFormData>({
      query: (newProduct) => ({
        url: "/products",
        method: "POST",
        body: newProduct,
      }),
      invalidatesTags: ["Products", "DashboardMetrics"],
    }),

    updateProduct: build.mutation<Product, ProductFormData>({
      query: (data) => ({
        url: `/products/${data.productId}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["Products", "DashboardMetrics"],
    }),

    deleteProduct: build.mutation<
      { success: boolean; productId: string },
      string
    >({
      query: (productId) => ({
        url: `/products/${productId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Products", "DashboardMetrics"],
    }),

    getUsers: build.query<GetUsersResponse, void>({
      query: () => "/users",
      providesTags: ["Users"],
    }),

    updateUserSettings: build.mutation<
      { success: boolean; user: User },
      UpdateUserFields
    >({
      query: (updatedFields) => ({
        url: "/users/update",
        method: "PUT",
        body: updatedFields,
      }),
      invalidatesTags: ["Users", "AuditLogs"],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data.success && data.user) dispatch(updateUser(data.user));
        } catch (error) {
          console.error("Erro ao sincronizar estado global:", error);
        }
      },
    }),

    updateUserRole: build.mutation<
      any,
      { id: string; role: string; adminPassword?: string }
    >({
      query: ({ id, role, adminPassword }) => ({
        url: `/users/${id}/role`,
        method: "PATCH",
        body: { role, adminPassword },
      }),
      invalidatesTags: ["Users", "AuditLogs"],
    }),

    deleteUser: build.mutation<any, { id: string; adminPassword?: string }>({
      query: ({ id, adminPassword }) => ({
        url: `/users/${id}`,
        method: "DELETE",
        body: { adminPassword },
      }),
      invalidatesTags: ["Users", "AuditLogs"],
    }),

    getNotifications: build.query<Notification[], { userId: string }>({
      query: ({ userId }) => `/notifications?userId=${userId}`,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "Notifications" as const,
                id,
              })),
              { type: "Notifications", id: "LIST" },
            ]
          : [{ type: "Notifications", id: "LIST" }],
    }),

    createNotification: build.mutation<
      Notification,
      { targetUserId: string; message: string; type: string }
    >({
      query: (body) => ({ url: "/notifications", method: "POST", body }),
      invalidatesTags: [{ type: "Notifications", id: "LIST" }],
    }),

    markNotificationAsRead: build.mutation<any, { id: string }>({
      query: ({ id }) => ({
        url: `/notifications/${id}/read`,
        method: "PATCH",
      }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "Notifications", id }],
    }),

    markAllNotificationsAsRead: build.mutation<any, { userId: string }>({
      query: ({ userId }) => ({
        url: "/notifications/read-all",
        method: "PATCH",
        body: { userId },
      }),
      invalidatesTags: [{ type: "Notifications", id: "LIST" }],
    }),

    deleteNotification: build.mutation<any, { id: string }>({
      query: ({ id }) => ({ url: `/notifications/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "Notifications", id: "LIST" }],
    }),

    getAuditLogs: build.query<AuditLog[], void>({
      query: () => "/audit-logs",
      providesTags: ["AuditLogs"],
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useGetDashboardMetricsQuery,
  useGetProductsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useGetUsersQuery,
  useUpdateUserSettingsMutation,
  useUpdateUserRoleMutation,
  useDeleteUserMutation,
  useGetNotificationsQuery,
  useCreateNotificationMutation,
  useMarkNotificationAsReadMutation,
  useMarkAllNotificationsAsReadMutation,
  useDeleteNotificationMutation,
  useGetAuditLogsQuery,
} = api;
