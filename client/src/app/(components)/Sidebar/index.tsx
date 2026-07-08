"use client";

import { useAppDispatch, useAppSelector } from "@/app/redux";
import { setIsSidebarCollapsed } from "@/state";
import {
  Archive,
  LayoutDashboard,
  LucideIcon,
  Menu,
  X,
  SlidersHorizontal,
  PackagePlus,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect } from "react";

interface SidebarLinkProps {
  href: string;
  icon: LucideIcon;
  label: string;
  isCollapsed: boolean;
  onClick?: () => void;
}

const SidebarLink = ({
  href,
  icon: Icon,
  label,
  isCollapsed,
  onClick,
}: SidebarLinkProps) => {
  const pathname = usePathname();
  const isActive =
    pathname === href || (pathname === "/" && href === "/dashboard");

  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-xl mx-3 my-1"
    >
      <div
        className={`cursor-pointer flex items-center rounded-xl transition-all duration-200 ${
          isCollapsed
            ? "justify-center py-3.5 px-0"
            : "justify-start px-4 py-3 gap-3"
        } ${
          isActive
            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 font-bold shadow-xs border border-emerald-100/20"
            : "text-gray-500 hover:text-gray-900 hover:bg-gray-50/80 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800/50 border border-transparent"
        }`}
      >
        <Icon
          className={`w-5 h-5 transition-colors ${
            isActive
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-gray-400 dark:text-gray-500"
          }`}
          aria-hidden="true"
        />

        <span
          className={`${
            isCollapsed ? "hidden" : "block"
          } text-xs font-bold uppercase tracking-wider`}
        >
          {label}
        </span>
      </div>
    </Link>
  );
};

const Sidebar = () => {
  const dispatch = useAppDispatch();
  const isSidebarCollapsed = useAppSelector(
    (state) => state.global.isSidebarCollapsed,
  );

  const toggleSidebar = () => {
    dispatch(setIsSidebarCollapsed(!isSidebarCollapsed));
  };

  useEffect(() => {
    const handleScrollLock = () => {
      if (window.innerWidth < 768 && !isSidebarCollapsed) {
        document.body.style.overflow = "hidden";
      } else {
        document.body.style.overflow = "";
      }
    };

    handleScrollLock();

    window.addEventListener("resize", handleScrollLock);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("resize", handleScrollLock);
    };
  }, [isSidebarCollapsed]);

  const handleLinkClick = () => {
    if (window.innerWidth < 768) {
      dispatch(setIsSidebarCollapsed(true));
    }
  };

  const sidebarClassNames = `fixed flex flex-col ${
    isSidebarCollapsed ? "w-0 md:w-16" : "w-72 md:w-64"
  } bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800/70 transition-all duration-300 overflow-hidden h-full z-40 shadow-[4px_0_24px_rgba(0,0,0,0.01)]`;

  return (
    <aside
      className={sidebarClassNames}
      aria-label="Menu de Navegação Principal"
    >
      <div
        className={`flex justify-between items-center py-5 border-b border-gray-100/50 dark:border-gray-800/60 ${
          isSidebarCollapsed ? "px-3 justify-center" : "px-5"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Image
            src="https://res.cloudinary.com/rz9e24ny/image/upload/v1783305928/hopper_icon_tight_hvpesz.svg"
            alt="Logotipo Hopper"
            width={36}
            height={36}
            className="shrink-0 object-contain"
            unoptimized
          />
          <span
            className={`${
              isSidebarCollapsed ? "hidden" : "block"
            } font-black text-xl tracking-tight text-gray-900 dark:text-white transition-all duration-300 whitespace-nowrap`}
          >
            Hopper
          </span>
        </div>

        <button
          className="md:hidden p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:text-gray-500 dark:hover:text-gray-300 dark:hover:bg-gray-800 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
          onClick={toggleSidebar}
          aria-expanded={!isSidebarCollapsed}
          aria-label="Alternar menu de navegação"
        >
          {isSidebarCollapsed ? (
            <Menu className="w-5 h-5" aria-hidden="true" />
          ) : (
            <X className="w-5 h-5" aria-hidden="true" />
          )}
        </button>
      </div>

      <nav className="flex-grow mt-6 space-y-1 overflow-y-auto">
        <SidebarLink
          href="/dashboard"
          icon={LayoutDashboard}
          label="Dashboard"
          isCollapsed={isSidebarCollapsed}
          onClick={handleLinkClick}
        />
        <SidebarLink
          href="/inventory"
          icon={Archive}
          label="Inventário"
          isCollapsed={isSidebarCollapsed}
          onClick={handleLinkClick}
        />
        <SidebarLink
          href="/products"
          icon={PackagePlus}
          label="Produtos"
          isCollapsed={isSidebarCollapsed}
          onClick={handleLinkClick}
        />
        <SidebarLink
          href="/users"
          icon={Users}
          label="Colaboradores"
          isCollapsed={isSidebarCollapsed}
          onClick={handleLinkClick}
        />
        <SidebarLink
          href="/settings"
          icon={SlidersHorizontal}
          label="Configurações"
          isCollapsed={isSidebarCollapsed}
          onClick={handleLinkClick}
        />
      </nav>

      <div className={`${isSidebarCollapsed ? "hidden" : "block"} mb-6 px-6`}>
        <p className="text-left text-[9px] font-bold uppercase tracking-widest text-gray-300 dark:text-gray-600">
          &copy; {new Date().getFullYear()} Hopper
        </p>
      </div>
    </aside>
  );
};

export default Sidebar;
