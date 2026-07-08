"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAppSelector } from "@/app/redux";
import {
  useGetNotificationsQuery,
  useMarkNotificationAsReadMutation,
  useMarkAllNotificationsAsReadMutation,
  useDeleteNotificationMutation,
  Notification as ApiNotification,
} from "@/state/api";
import {
  Bell,
  Trash2,
  CheckCheck,
  AlertTriangle,
  Clock,
  Package,
  MessageSquare,
} from "lucide-react";

const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentUser = useAppSelector((state) => state.auth.user);

  const { data: notifications = [], isLoading } = useGetNotificationsQuery(
    { userId: currentUser?.id ?? "" },
    {
      skip: !currentUser?.id,
      pollingInterval: 30000,
    },
  );

  const [markAsRead] = useMarkNotificationAsReadMutation();
  const [markAllAsRead] = useMarkAllNotificationsAsReadMutation();
  const [deleteNotification] = useDeleteNotificationMutation();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(
    (n: ApiNotification) => !n.isRead,
  ).length;

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsRead({ id }).unwrap();
    } catch (error) {
      console.error("Erro ao marcar notificação como lida:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!currentUser?.id) return;
    try {
      await markAllAsRead({ userId: currentUser.id }).unwrap();
    } catch (error) {
      console.error("Erro ao marcar todas as notificações como lidas:", error);
    }
  };

  const handleDeleteNotification = async (
    id: string,
    e: React.MouseEvent<HTMLButtonElement>,
  ) => {
    e.stopPropagation();
    try {
      await deleteNotification({ id }).unwrap();
    } catch (error) {
      console.error("Erro ao deletar notificação:", error);
    }
  };

  const formatRelativeTime = (isoString: string) => {
    if (!isoString) return "---";

    const parsedDate = new Date(isoString);
    if (isNaN(parsedDate.getTime())) return "---";

    const diffMs = Date.now() - parsedDate.getTime();
    if (diffMs < 0) return "Agora mesmo";

    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return "Agora mesmo";
    if (diffMins < 60) return `Há ${diffMins} min`;
    if (diffHours < 24) return `Há ${diffHours} h`;

    return parsedDate.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "CRITICAL_EXPIRY":
        return (
          <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
        );
      case "SYSTEM":
        return <Package className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      default:
        return (
          <MessageSquare className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        );
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label={`Notificações. Você tem ${unreadCount} alertas não lidos.`}
        className="relative p-2.5 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#006938]"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold leading-none text-white bg-red-500 rounded-full animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-2xl z-50 overflow-hidden transform origin-top-right transition-all animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-4 py-3.5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/30">
            <div>
              <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                Notificações
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {unreadCount === 0
                  ? "Tudo em dia!"
                  : `Você tem ${unreadCount} alertas não lidos`}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-1 text-xs font-semibold text-[#006938] hover:text-[#004d29] dark:text-green-400 dark:hover:text-green-300 transition-colors bg-transparent border-none cursor-pointer focus:outline-none"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Marcar todas como lidas
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800/60">
            {isLoading && (
              <div className="flex items-center justify-center py-8 text-gray-400 gap-2">
                <Clock className="w-4 h-4 animate-spin" />
                <span className="text-xs">Buscando alertas...</span>
              </div>
            )}

            {!isLoading && notifications.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-2">
                <Bell className="w-8 h-8 opacity-30" />
                <span className="text-xs font-medium">
                  Nenhum aviso por aqui.
                </span>
              </div>
            )}

            {!isLoading &&
              notifications.map((item: ApiNotification) => (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => !item.isRead && handleMarkAsRead(item.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      if (!item.isRead) handleMarkAsRead(item.id);
                    }
                  }}
                  className={`flex flex-col px-4 py-3.5 text-left transition-all relative group border-l-4 cursor-pointer focus:outline-none focus:bg-gray-50 dark:focus:bg-gray-800/40 pr-12
                  ${!item.isRead ? "bg-green-50/5 dark:bg-gray-800/40" : "hover:bg-gray-50 dark:hover:bg-gray-800/20"}
                  ${item.type === "CRITICAL_EXPIRY" ? "border-l-red-500" : "border-l-transparent"}
                `}
                >
                  <div className="flex gap-3">
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center mt-0.5
                      ${item.type === "CRITICAL_EXPIRY" ? "bg-red-50 dark:bg-red-950/40 text-red-600" : "bg-gray-100 dark:bg-gray-800 text-gray-500"}
                    `}
                    >
                      {getNotificationIcon(item.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-xs sm:text-sm leading-relaxed text-gray-700 dark:text-gray-300 ${!item.isRead ? "font-medium text-gray-900 dark:text-gray-100" : ""}`}
                      >
                        {item.message}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-gray-400 dark:text-gray-500">
                        <Clock className="w-3 h-3" />
                        <span>{formatRelativeTime(item.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleDeleteNotification(item.id, e)}
                    title="Apagar aviso"
                    aria-label="Apagar notificação"
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors bg-transparent border-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
