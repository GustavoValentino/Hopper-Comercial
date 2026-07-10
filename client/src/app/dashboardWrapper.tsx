"use client";

import React, { useEffect, useState, createContext, useContext } from "react";
import Navbar from "@/app/(components)/Navbar";
import Sidebar from "@/app/(components)/Sidebar";
import StoreProvider, { useAppSelector, useAppDispatch } from "./redux";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { updateUser } from "@/state";
import { io, Socket } from "socket.io-client";

interface SocketContextType {
  onlineCount: number;
  socket: Socket | null;
}

const SocketContext = createContext<SocketContextType>({
  onlineCount: 0,
  socket: null,
});

export const useSocket = () => useContext(SocketContext);

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const dispatch = useAppDispatch();
  const pathname = usePathname();
  const router = useRouter();

  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineCount, setOnlineCount] = useState<number>(0);

  const { data: session, isPending } = useSession();

  const isEmailVerified = session?.user?.emailVerified;

  const isSidebarCollapsed = useAppSelector(
    (state) => state.global.isSidebarCollapsed,
  );
  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);
  const currentUser = useAppSelector((state) => state.auth.user);

  const rotasPublicas = [
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
  ];
  const isPublicPage = rotasPublicas.includes(pathname);

  useEffect(() => {
    const baseUrl =
      process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") ||
      "https://hopper-comercial.onrender.com";

    const novoSocket = io(baseUrl, {
      withCredentials: true,
      transports: ["websocket"], // Recomendado para evitar problemas de polling em produção
    });

    setSocket(novoSocket);

    novoSocket.on("update_online_count", (count: number) =>
      setOnlineCount(count),
    );

    return () => {
      novoSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (socket && currentUser?.id) socket.emit("register_user", currentUser.id);
  }, [socket, currentUser]);

  useEffect(() => {
    if (session?.user && !currentUser) {
      dispatch(
        updateUser({
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          image: session.user.image,
          role: (session.user as any).role || "operador",
          createdAt:
            session.user.createdAt instanceof Date
              ? session.user.createdAt.toISOString()
              : String(session.user.createdAt || new Date().toISOString()),
          criticalProductsCount:
            (session.user as any).criticalProductsCount ?? 0,
          language: (session.user as any).language || "Português (BR)",
        }),
      );
    }
  }, [session, currentUser, dispatch]);

  useEffect(() => {
    if (isPending || isPublicPage) return;

    const isLoggedIn = !!session;

    if (isLoggedIn && !isEmailVerified) {
      router.push("/login?error=verify");
      return;
    }

    if (!isLoggedIn) {
      router.push("/login");
    }
  }, [session, isEmailVerified, isPending, isPublicPage, pathname, router]);

  useEffect(() => {
    document.documentElement.className = isDarkMode ? "dark" : "light";
  }, [isDarkMode]);

  if (isPublicPage) {
    return (
      <div
        className={`${isDarkMode ? "dark" : "light"} w-full min-h-screen bg-gray-50 dark:bg-gray-900`}
      >
        {children}
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="flex min-h-screen flex-col gap-3 items-center justify-center bg-gray-50 dark:bg-gray-900 font-medium text-xs uppercase tracking-wider text-gray-500">
        <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-green-600 dark:border-green-400"></div>
        <span>Verificando autenticação...</span>
      </div>
    );
  }

  const hasAccess = !!session && isEmailVerified;

  if (!hasAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 font-medium text-gray-400">
        Redirecionando...
      </div>
    );
  }

  return (
    <SocketContext.Provider value={{ onlineCount, socket }}>
      <div
        className={`${isDarkMode ? "dark" : "light"} flex bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 w-full min-h-screen`}
      >
        <Sidebar />
        <main
          className={`flex flex-col w-full h-full py-7 px-9 bg-gray-50 dark:bg-gray-900 transition-all ${isSidebarCollapsed ? "md:pl-24" : "md:pl-72"}`}
        >
          <Navbar />
          {children}
        </main>
      </div>
    </SocketContext.Provider>
  );
};

const DashboardWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <StoreProvider>
      <DashboardLayout>{children}</DashboardLayout>
    </StoreProvider>
  );
};

export default DashboardWrapper;
