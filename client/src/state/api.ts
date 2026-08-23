import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { updateUser } from "@/state";

export interface Lote {
  loteId: string;
  productId: string;
  lotNumber?: string | null;
  expirationDate: string;
  stockQuantity: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Product {
  productId: string;
  sku: string;
  name: string;
  weight?: number | null;
  unit: "KG" | "ML_G";
  category: string;
  section: string;
  note?: string | null;
  imageUrl?: string | null;
  userId: string;
  lotes: Lote[];
  // Campos virtuais de compatibilidade calculados pelo backend
  stockQuantity?: number;
  expirationDate?: string | null;
  lotNumber?: string | null;
  updatedAt?: string;
}

export interface ProductFormData {
  productId?: string;
  sku: string;
  name: string;
  weight?: number;
  unit?: "KG" | "ML_G";
  category: string;
  section: string;
  note?: string;
  imageUrl?: string;
  lotes: {
    lotNumber?: string;
    expirationDate: string;
    stockQuantity: number;
  }[];
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
  notifications?: boolean;
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

export interface ProductLookupResult {
  name: string;
  weightGrams: number | null;
  unit: "KG" | "ML_G";
  brand: string | null;
  imageBase64: string | null;
  source: "cosmos" | "openfoodfacts";
}

export interface WhatsappStatus {
  whatsappOptIn: boolean;
  whatsappNumber: string | null;
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
    "WhatsappStatus",
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

    lookupProductByEan: build.query<ProductLookupResult, string>({
      query: (ean) => `/products/lookup/${ean}`,
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

    getNotifications: build.query<Notification[], void>({
      query: () => "/notifications",
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

    markAllNotificationsAsRead: build.mutation<any, void>({
      query: () => ({ url: "/notifications/read-all", method: "PATCH" }),
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

    getWhatsappStatus: build.query<WhatsappStatus, void>({
      query: () => "/whatsapp/status",
      providesTags: ["WhatsappStatus"],
    }),

    requestWhatsappOtp: build.mutation<
      { message: string; whatsappOnline?: boolean },
      { phoneNumber: string }
    >({
      query: (body) => ({
        url: "/whatsapp/request-otp",
        method: "POST",
        body,
      }),
    }),

    verifyWhatsappOtp: build.mutation<{ message: string }, { code: string }>({
      query: (body) => ({
        url: "/whatsapp/verify-otp",
        method: "POST",
        body,
      }),
      invalidatesTags: ["WhatsappStatus"],
    }),

    disableWhatsapp: build.mutation<{ message: string }, void>({
      query: () => ({
        url: "/whatsapp/disable",
        method: "POST",
      }),
      invalidatesTags: ["WhatsappStatus"],
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
  useLazyLookupProductByEanQuery,
  useGetWhatsappStatusQuery,
  useRequestWhatsappOtpMutation,
  useVerifyWhatsappOtpMutation,
  useDisableWhatsappMutation,
} = api;
