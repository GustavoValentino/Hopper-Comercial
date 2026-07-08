"use client";

import { useAppDispatch, useAppSelector } from "@/app/redux";
import { setIsDarkMode, setIsSidebarCollapsed } from "@/state";
import { logout } from "@/state/authSlice";
import { authClient } from "@/lib/auth-client";
import { Menu, Moon, Settings, Sun, LogOut, ChevronDown } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState, useRef, useEffect, useCallback } from "react";
import NotificationBell from "../NotificationsBell";

const getInitials = (name: string) => {
  if (!name) return "OP";
  const parts = name.trim().split(" ");
  return parts.length > 1
    ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    : parts[0].slice(0, 2).toUpperCase();
};

const Navbar = () => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [formattedDate, setFormattedDate] = useState("");

  const user = useAppSelector((state) => state.auth.user);
  const isSidebarCollapsed = useAppSelector(
    (state) => state.global.isSidebarCollapsed,
  );
  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);

  useEffect(() => {
    const dateText = new Date().toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    setFormattedDate(dateText.charAt(0).toUpperCase() + dateText.slice(1));
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleSidebar = useCallback(() => {
    dispatch(setIsSidebarCollapsed(!isSidebarCollapsed));
  }, [dispatch, isSidebarCollapsed]);

  const toggleDarkMode = useCallback(() => {
    dispatch(setIsDarkMode(!isDarkMode));
  }, [dispatch, isDarkMode]);

  const handleLogout = useCallback(async () => {
    setIsProfileOpen(false);
    try {
      await authClient.signOut();
    } catch (error) {
      console.error("Erro ao encerrar sessão:", error);
    } finally {
      dispatch(logout());
      router.push("/login");
    }
  }, [dispatch, router]);

  return (
    <div className="flex justify-between items-center w-full mb-7 bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm transition-all">
      <div className="flex items-center gap-5">
        <button
          onClick={toggleSidebar}
          title="Alternar Menu"
          className="p-2.5 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-200 rounded-lg hover:bg-green-50 hover:text-[#006938] dark:hover:bg-green-950/30 transition-all active:scale-95"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <button
          onClick={toggleDarkMode}
          title={isDarkMode ? "Ativar Modo Claro" : "Ativar Modo Escuro"}
          className="p-2.5 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          {isDarkMode ? (
            <Sun className="w-5 h-5 text-amber-500" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
        </button>

        <NotificationBell />

        <hr className="w-0 h-6 border-l border-gray-200 dark:border-gray-600 mx-1" />

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsProfileOpen((prev) => !prev)}
            aria-haspopup="true"
            aria-expanded={isProfileOpen}
            className="flex items-center gap-1.5 p-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all group focus:outline-none"
          >
            <div className="relative w-9 h-9 rounded-full overflow-hidden border border-gray-200 dark:border-gray-600 bg-emerald-700 text-white shadow-sm flex items-center justify-center font-medium text-sm transition-transform group-hover:scale-105">
              {user?.image ? (
                <Image
                  src={user.image}
                  alt="Foto de Perfil"
                  fill
                  sizes="36px"
                  className="object-cover"
                  priority
                />
              ) : (
                <span>{getInitials(user?.name || "Operador")}</span>
              )}
            </div>
            <ChevronDown
              className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                isProfileOpen
                  ? "rotate-180 text-gray-600 dark:text-gray-200"
                  : ""
              }`}
            />
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-3 duration-150">
              <div className="px-4 py-2.5 border-b border-gray-50 dark:border-gray-700/50 mb-1">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                  {user?.name || "Operador"}
                </p>
                <p className="text-xs text-gray-400 truncate mt-0.5">
                  {user?.email || ""}
                </p>
                <span className="inline-block mt-2 text-[9px] font-bold text-[#006938] dark:text-green-400 uppercase tracking-wider bg-green-50 dark:bg-green-950/40 px-2 py-0.5 rounded">
                  {user?.role || "Operador"}
                </span>
              </div>

              <Link href="/settings" onClick={() => setIsProfileOpen(false)}>
                <div className="flex items-center gap-3 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors cursor-pointer">
                  <Settings className="w-4 h-4 text-gray-400" />
                  <span>Configurações</span>
                </div>
              </Link>

              <hr className="border-gray-50 dark:border-gray-700/50 my-1" />

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors text-left cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span className="font-medium">Sair da conta</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Navbar;
