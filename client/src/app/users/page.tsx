"use client";

import {
  useGetUsersQuery,
  useUpdateUserRoleMutation,
  useDeleteUserMutation,
  useCreateNotificationMutation,
  useGetAuditLogsQuery,
} from "@/state/api";
import { useAppSelector } from "@/app/redux";
import Header from "@/app/(components)/Header";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { ptBR } from "@mui/x-data-grid/locales";
import Image from "next/image";
import { useSocket } from "@/app/dashboardWrapper";
import {
  Trash2,
  ShieldAlert,
  X,
  Eye,
  EyeOff,
  Mail,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Bell,
  Clock,
  Users,
  Activity,
  PackageX,
  Wifi,
  MessageSquare,
  Search,
  SlidersHorizontal,
  ChevronDown,
  CheckCircle2Icon,
} from "lucide-react";
import React, { useState, useEffect } from "react";

// ============================================================
// TIPOS
// ============================================================
type AuditLog = {
  logId: string;
  userId: string;
  action: string;
  details: string;
  timestamp: string;
  user?: { name: string; email: string };
};

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  image?: string | null;
  createdAt: string;
  criticalProductsCount: number;
  isOnline?: boolean;
};

// ============================================================
// FUNÇÕES UTILITÁRIAS
// ============================================================
const getInitials = (name: string) => {
  if (!name) return "OP";
  const parts = name.trim().split(" ");
  if (parts.length > 1) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
};

const getAvatarColor = (name: string) => {
  if (!name)
    return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  const colors = [
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
    "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
    "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400",
    "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
    "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400",
    "bg-pink-50 text-pink-700 dark:bg-pink-950/40 dark:text-pink-400",
    "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-400",
    "bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const getCriticalBadge = (count: number) => {
  if (count === 0)
    return {
      label: "Nenhum",
      className:
        "bg-slate-100 text-slate-500 border border-slate-200/60 dark:bg-gray-700/30 dark:text-gray-400 dark:border-transparent",
      icon: CheckCircle2Icon,
    };
  if (count <= 3)
    return {
      label: `${count} Atenção`,
      className:
        "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-500/30",
      icon: AlertTriangle,
    };
  return {
    label: `${count} Críticos`,
    className:
      "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-500/30",
    icon: PackageX,
  };
};

const formatTimestamp = (ts: string) => {
  const d = new Date(ts);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getActionMeta = (action: string) => {
  const map: Record<string, { label: string; color: string; border: string }> =
    {
      UPDATE_ROLE: {
        label: "Alteração de Cargo",
        color:
          "text-blue-700 dark:text-blue-400 bg-blue-50/60 dark:bg-blue-950/30",
        border: "border-l-4 border-l-blue-500",
      },
      DELETE_USER: {
        label: "Remoção de Operador",
        color:
          "text-rose-700 dark:text-rose-400 bg-rose-50/60 dark:bg-rose-950/30",
        border: "border-l-4 border-l-rose-500",
      },
      EXPIRE_PRODUCT: {
        label: "Produto Vencido",
        color:
          "text-rose-700 dark:text-rose-400 bg-rose-50/60 dark:bg-rose-950/30",
        border: "border-l-4 border-l-rose-600",
      },
      ADD_PRODUCT: {
        label: "Produto Cadastrado",
        color:
          "text-emerald-700 dark:text-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/30",
        border: "border-l-4 border-l-emerald-500",
      },
    };
  return (
    map[action] ?? {
      label: action,
      color: "text-gray-600 dark:text-gray-300 bg-slate-50 dark:bg-gray-700/40",
      border: "border-l-4 border-l-slate-300 dark:border-l-gray-600",
    }
  );
};

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
const UsersPage = () => {
  const { data, isError, isLoading } = useGetUsersQuery();
  const currentUser = useAppSelector((state) => state.auth.user);

  const { onlineCount } = useSocket();

  const userListFromBackend: UserRow[] = data?.users || [];
  const totalCriticalSystem: number = data?.totalCriticalSystem || 0;

  const [userList, setUserList] = useState<UserRow[]>([]);

  useEffect(() => {
    if (userListFromBackend.length > 0) {
      const updatedList = userListFromBackend.map((u) => ({
        ...u,

        isOnline:
          u.email?.toLowerCase() === currentUser?.email?.toLowerCase() &&
          onlineCount > 0
            ? true
            : u.isOnline,
      }));
      setUserList(updatedList);
    }
  }, [userListFromBackend, currentUser, onlineCount]);

  const dbCurrentUser = userList.find(
    (u: UserRow) =>
      u.email?.toLowerCase() === currentUser?.email?.toLowerCase(),
  );
  const isAdmin = dbCurrentUser?.role?.toLowerCase() === "admin";

  const [updateUserRole] = useUpdateUserRoleMutation();
  const [deleteUser] = useDeleteUserMutation();
  const [createNotification] = useCreateNotificationMutation();

  // ── Estados de UI ──────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"operadores" | "auditoria">(
    "operadores",
  );
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // ── Estados dos Modais ─────────────────────────────────────
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isNotifyModalOpen, setIsNotifyModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Dados em espera ────────────────────────────────────────
  const [pendingRoleChange, setPendingRoleChange] = useState<{
    userId: string;
    userName: string;
    newRole: string;
  } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    userId: string;
    userName: string;
  } | null>(null);
  const [notifyTarget, setNotifyTarget] = useState<UserRow | null>(null);
  const [notifyMessage, setNotifyMessage] = useState("");

  // ── RTM Audit Logs ─────────────────────────────────────────
  const { data: fetchedLogs, isLoading: logsLoading } = useGetAuditLogsQuery(
    undefined,
    { skip: !isAdmin || activeTab !== "auditoria" },
  );

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAction, setSelectedAction] = useState("TODOS");
  const [visibleLogsCount, setVisibleLogsCount] = useState(10);

  useEffect(() => {
    if (fetchedLogs) {
      setAuditLogs(fetchedLogs);
    }
  }, [fetchedLogs]);

  useEffect(() => {
    setVisibleLogsCount(10);
  }, [searchTerm, selectedAction]);

  const filteredLogs = auditLogs.filter((log) => {
    const operator = userList.find((u) => u.id === log.userId);
    const operatorName =
      operator?.name || log.user?.name || "Operador desconhecido";

    const matchesSearch =
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      operatorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAction =
      selectedAction === "TODOS" || log.action === selectedAction;

    return matchesSearch && matchesAction;
  });

  const logsToRender = filteredLogs.slice(0, visibleLogsCount);
  const hasMoreLogs = filteredLogs.length > visibleLogsCount;

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleRoleSelectChange = (
    userId: string,
    userName: string,
    newRole: string,
  ) => {
    setPendingRoleChange({ userId, userName, newRole });
    setAdminPassword("");
    setShowPassword(false);
    setIsRoleModalOpen(true);
  };

  const handleConfirmRoleChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingRoleChange) return;
    setIsSubmitting(true);
    try {
      await updateUserRole({
        id: pendingRoleChange.userId,
        role: pendingRoleChange.newRole,
        adminPassword,
      }).unwrap();
      showToast(
        `Acesso de ${pendingRoleChange.userName} alterado para ${pendingRoleChange.newRole.toUpperCase()}!`,
        "success",
      );
      setIsRoleModalOpen(false);
      setPendingRoleChange(null);
    } catch (error: any) {
      showToast(
        error?.data?.message || "Falha ao processar autorização.",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (userId: string, userName: string) => {
    if (!isAdmin) return;
    setPendingDelete({ userId, userName });
    setAdminPassword("");
    setShowPassword(false);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingDelete) return;
    setIsSubmitting(true);
    try {
      await deleteUser({
        id: pendingDelete.userId,
        adminPassword,
      }).unwrap();
      showToast(
        `Operador "${pendingDelete.userName}" foi banido do sistema.`,
        "success",
      );
      setIsDeleteModalOpen(false);
      setPendingDelete(null);
    } catch (error: any) {
      showToast(
        error?.data?.message || "Erro ao tentar excluir operador.",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendEmailNotification = () => {
    if (!notifyTarget) return;
    const subject = encodeURIComponent(
      "⚠️ Braincore — Mensagem Administrativa",
    );
    const body = encodeURIComponent(notifyMessage);
    window.open(`mailto:${notifyTarget.email}?subject=${subject}&body=${body}`);
    showToast(`E-mail preparado para ${notifyTarget.name}.`, "success");
    setIsNotifyModalOpen(false);
  };

  const handleSendInternalNotification = async () => {
    if (!notifyTarget) return;
    setIsSubmitting(true);
    try {
      await createNotification({
        targetUserId: notifyTarget.id,
        message: notifyMessage,
        type: "CUSTOM_ALERT",
      }).unwrap();

      showToast(
        `Notificação interna enviada para ${notifyTarget.name}.`,
        "success",
      );
      setIsNotifyModalOpen(false);
    } catch {
      showToast("Erro ao enviar notificação interna.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Colunas do DataGrid ────────────────────────────────────
  const columns: GridColDef[] = [
    {
      field: "name",
      headerName: "Operador",
      width: 210,
      renderCell: (params) => {
        const userName =
          params.row.name ||
          params.row.email?.split("@")[0] ||
          "Operador Anônimo";
        const avatarColorClass = getAvatarColor(userName);
        return (
          <div className="flex items-center gap-3 h-full">
            <div className="relative">
              <div
                className={`relative w-8 h-8 rounded-full overflow-hidden border border-gray-200/60 dark:border-gray-700/50 flex items-center justify-center font-bold text-xs shadow-xs transition-colors duration-300 ${avatarColorClass}`}
              >
                {params.row.image ? (
                  <Image
                    src={params.row.image}
                    alt={userName}
                    fill
                    className="object-cover"
                    sizes="32px"
                  />
                ) : (
                  <span>{getInitials(userName)}</span>
                )}
              </div>
              {params.row.isOnline && (
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-gray-800 rounded-full animate-pulse" />
              )}
            </div>
            <span className="font-semibold text-gray-800 dark:text-gray-100 truncate tracking-tight">
              {userName}
            </span>
          </div>
        );
      },
    },
    {
      field: "email",
      headerName: "E-mail Corporativo",
      width: 210,
      renderCell: (params) => (
        <span className="text-gray-600 dark:text-gray-300 text-sm truncate flex items-center h-full font-medium">
          {params.value}
        </span>
      ),
    },
    {
      field: "role",
      headerName: "Nível de Acesso",
      width: 155,
      renderCell: (params) => {
        const currentRole = params.value?.toLowerCase() || "operador";
        const isSelf =
          params.row.email?.toLowerCase() === currentUser?.email?.toLowerCase();
        return (
          <div className="flex items-center h-full w-full pr-2">
            <select
              value={currentRole}
              disabled={!isAdmin || isSelf}
              onChange={(e) =>
                handleRoleSelectChange(
                  params.row.id,
                  params.row.name,
                  e.target.value,
                )
              }
              className={`w-full text-xs font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg border focus:outline-none focus:ring-2 transition-all bg-white dark:bg-gray-800
                ${!isAdmin || isSelf ? "opacity-60 cursor-not-allowed border-gray-100 dark:border-gray-700/60 text-gray-400" : "cursor-pointer border-slate-200 text-slate-700 hover:border-slate-300 dark:border-gray-700 dark:text-gray-200 dark:hover:border-gray-600"}
                ${currentRole === "admin" && isAdmin && !isSelf ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60 focus:ring-emerald-500" : ""}
              `}
            >
              <option value="operador">Operador</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        );
      },
    },
    {
      field: "criticalProductsCount",
      headerName: "Produtos Críticos",
      width: 165,
      renderCell: (params) => {
        const count: number = params.value ?? 0;
        const badge = getCriticalBadge(count);
        const IconComponent = badge.icon;

        return (
          <div className="flex items-center h-full gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${badge.className}`}
            >
              {IconComponent && <IconComponent className="w-3 h-3 shrink-0" />}
              {badge.label}
            </span>
          </div>
        );
      },
    },
    {
      field: "createdAt",
      headerName: "Data de Registro",
      width: 150,
      renderCell: (params) => {
        if (!params.value) return "---";
        const date = new Date(params.value);
        return (
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs h-full font-medium">
            <Calendar className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
            <span>{date.toLocaleDateString("pt-BR")}</span>
          </div>
        );
      },
    },
    {
      field: "acoes",
      headerName: "Ações",
      width: 130,
      sortable: false,
      renderCell: (params) => {
        const isSelf =
          params.row.email?.toLowerCase() === currentUser?.email?.toLowerCase();
        return (
          <div className="flex items-center gap-2 h-full">
            {isAdmin && !isSelf && (
              <button
                onClick={() => {
                  setNotifyTarget(params.row as UserRow);
                  setNotifyMessage(`Olá, ${params.row.name.split(" ")[0]}! `);
                  setIsNotifyModalOpen(true);
                }}
                title={`Enviar mensagem direta para ${params.row.name}`}
                className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-blue-600 hover:bg-slate-100 transition-all dark:bg-gray-700/50 dark:border-gray-700 dark:text-blue-400 dark:hover:bg-gray-700"
              >
                <MessageSquare className="w-4 h-4" />
              </button>
            )}

            <a
              href={`mailto:${params.row.email}?subject=Contato%20Braincore`}
              title={`Contatar ${params.row.name}`}
              className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-gray-600 hover:bg-slate-100 transition-all dark:bg-gray-700/50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <Mail className="w-4 h-4" />
            </a>
            <button
              disabled={!isAdmin || isSelf}
              onClick={() => handleDeleteClick(params.row.id, params.row.name)}
              className={`p-1.5 rounded-lg border transition-all ${
                !isAdmin || isSelf
                  ? "bg-slate-50 dark:bg-gray-800/40 text-gray-300 border-slate-100 dark:border-gray-800/60 cursor-not-allowed"
                  : "bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-600 hover:text-white dark:bg-rose-950/20 dark:border-rose-900/40 dark:text-rose-400 dark:hover:bg-rose-600 dark:hover:text-white"
              }`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col space-y-6 relative text-gray-900 dark:text-gray-100">
      {/* TOAST NOTIFICATION */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border animate-bounce bg-white dark:bg-gray-900 ${
            toast.type === "success"
              ? "border-emerald-200 text-emerald-800 dark:border-emerald-900 dark:text-emerald-400"
              : "border-rose-200 text-rose-800 dark:border-rose-900 dark:text-rose-400"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
          )}
          <span className="text-sm font-bold tracking-tight">
            {toast.message}
          </span>
        </div>
      )}

      <div className="flex flex-col">
        <Header name="Usuários e Controle de Acesso" />
        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">
          Gerenciamento de credenciais, monitoramento de atividade em tempo real
          e auditoria master
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100/50 dark:border-gray-700/40 p-5 flex items-center gap-4 shadow-[0_4px_20px_rgb(0,0,0,0.01)] hover:shadow-[0_6px_24px_rgb(0,0,0,0.02)] transition-all">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl">
            <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">
              Total de Operadores
            </p>
            <p className="text-2xl font-black text-gray-800 dark:text-gray-100 mt-0.5 tracking-tight">
              {userList.length}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100/50 dark:border-gray-700/40 p-5 flex items-center gap-4 shadow-[0_4px_20px_rgb(0,0,0,0.01)] hover:shadow-[0_6px_24px_rgb(0,0,0,0.02)] transition-all">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl">
            <Wifi className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">
              Online Agora
            </p>
            <p className="text-2xl font-black text-gray-800 dark:text-gray-100 mt-0.5 tracking-tight">
              {onlineCount}
            </p>
          </div>
        </div>

        <div
          className={`rounded-xl p-5 flex items-center gap-4 border transition-all duration-300 shadow-[0_4px_20px_rgb(0,0,0,0.01)] ${
            totalCriticalSystem > 0
              ? "bg-rose-50/40 dark:bg-rose-950/10 border-rose-200 dark:border-rose-900/60"
              : "bg-white dark:bg-gray-800 border-gray-100/50 dark:border-gray-700/40"
          }`}
        >
          <div
            className={`p-3 rounded-xl ${
              totalCriticalSystem > 0
                ? "bg-rose-100/60 dark:bg-rose-950/40"
                : "bg-slate-50 dark:bg-gray-700/60"
            }`}
          >
            <PackageX
              className={`w-5 h-5 ${
                totalCriticalSystem > 0
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-gray-400 dark:text-gray-500"
              }`}
            />
          </div>
          <div>
            <p
              className={`text-[10px] font-bold uppercase tracking-wider ${
                totalCriticalSystem > 0
                  ? "text-rose-700 dark:text-rose-400"
                  : "text-gray-400 dark:text-gray-500"
              }`}
            >
              Produtos Críticos no Sistema
            </p>
            <p
              className={`text-2xl font-black mt-0.5 tracking-tight ${
                totalCriticalSystem > 0
                  ? "text-rose-700 dark:text-rose-400"
                  : "text-gray-800 dark:text-gray-100"
              }`}
            >
              {totalCriticalSystem}
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700/60 pt-2">
        <button
          onClick={() => setActiveTab("operadores")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-t-xl transition-all ${
            activeTab === "operadores"
              ? "bg-white dark:bg-gray-800 border-x border-t border-gray-200 dark:border-gray-700 text-emerald-600 dark:text-emerald-400 -mb-px shadow-xs"
              : "text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
          }`}
        >
          <Users className="w-4 h-4" />
          Operadores
        </button>
        {isAdmin && (
          <button
            onClick={() => setActiveTab("auditoria")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-t-xl transition-all ${
              activeTab === "auditoria"
                ? "bg-white dark:bg-gray-800 border-x border-t border-gray-200 dark:border-gray-700 text-emerald-600 dark:text-emerald-400 -mb-px shadow-xs"
                : "text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            }`}
          >
            <Activity className="w-4 h-4" />
            Histórico de Ações
          </button>
        )}
      </div>

      {activeTab === "operadores" && (
        <div className="w-full bg-white dark:bg-gray-800 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-xl border border-gray-100 dark:border-gray-700/60 overflow-hidden transition-all">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-6 h-6 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 tracking-wide">
                Carregando operadores ativos...
              </span>
            </div>
          )}
          {isError && (
            <div className="flex items-center justify-center py-16 text-rose-500 font-bold gap-3">
              <AlertTriangle className="w-5 h-5" />
              <span className="text-sm">
                Erro ao sincronizar lista de operadores.
              </span>
            </div>
          )}
          {!isLoading && !isError && (
            <DataGrid
              rows={userList}
              columns={columns}
              getRowId={(row) => row.id}
              checkboxSelection
              disableRowSelectionOnClick
              autoHeight
              rowHeight={52}
              localeText={ptBR.components.MuiDataGrid.defaultProps.localeText}
              sx={{
                border: "none",
                backgroundColor: "transparent",
                "& .MuiDataGrid-columnHeaderTitle": {
                  fontWeight: "700 !important",
                  color: "#374151 !important",
                },
                "& .MuiDataGrid-columnHeader": {
                  backgroundColor: "#f9fafb !important",
                  borderBottom: "1px solid #f3f4f6",
                },
                "& .MuiDataGrid-columnHeaders": {
                  backgroundColor: "#f9fafb !important",
                  borderBottom: "1px solid #f3f4f6",
                },
                "& .MuiDataGrid-cell": {
                  borderBottom: "1px solid #f3f4f6",
                  display: "flex",
                  alignItems: "center",
                  color: "#374151",
                },
                "& .MuiDataGrid-footerContainer": {
                  borderTop: "1px solid #f3f4f6",
                  backgroundColor: "transparent",
                  color: "#374151",
                },
                "& .MuiTablePagination-root, & .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows, & .MuiTablePagination-select, & .MuiTablePagination-actions .MButtonBase-root":
                  {
                    color: "#374151 !important",
                  },
                ":global(.dark) & .MuiDataGrid-columnHeaders": {
                  backgroundColor: "#1f2937 !important",
                  borderBottom: "1px solid #374151 !important",
                },
                ":global(.dark) & .MuiDataGrid-columnHeader": {
                  backgroundColor: "#1f2937 !important",
                  borderBottom: "1px solid #374151 !important",
                },
                ":global(.dark) & .MuiDataGrid-columnHeaderTitle": {
                  color: "#f3f4f6 !important",
                },
                ":global(.dark) & .MuiDataGrid-columnHeader--scrollbarFiller, :global(.dark) & .MuiDataGrid-filler, :global(.dark) & .MuiDataGrid-scrollbarFiller":
                  {
                    backgroundColor: "#1f2937 !important",
                    borderBottom: "1px solid #374151 !important",
                  },
                ":global(.dark) & .MuiDataGrid-cell": {
                  borderBottom: "1px solid #374151 !important",
                  color: "#e5e7eb !important",
                },
                ":global(.dark) & .MuiDataGrid-footerContainer": {
                  borderTop: "1px solid #374151 !important",
                  backgroundColor: "transparent",
                },
                ":global(.dark) & .MuiTablePagination-root, :global(.dark) & .MuiTablePagination-selectLabel, :global(.dark) & .MuiTablePagination-displayedRows, :global(.dark) & .MuiTablePagination-select, :global(.dark) & .MuiTablePagination-actions .MuiButtonBase-root":
                  {
                    color: "#e5e7eb !important",
                  },
                "& .MuiDataGrid-iconButtonContainer, & .MuiDataGrid-menuIcon": {
                  visibility: "visible !important",
                  width: "auto !important",
                },
                "& .MuiSvgIcon-root": {
                  color: "#374151 !important",
                },
                ":global(.dark) & .MuiSvgIcon-root": {
                  color: "#9ca3af !important",
                },
                "& .MuiCheckbox-root": {
                  color: "#10b981 !important",
                },
              }}
            />
          )}
        </div>
      )}

      {activeTab === "auditoria" && isAdmin && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700/50 shadow-[0_4px_20px_rgb(0,0,0,0.01)] overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50 dark:bg-gray-900/10">
            <div>
              <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm tracking-tight">
                Linha do Tempo de Ações
              </h3>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium mt-0.5">
                Exibindo {logsToRender.length} de {filteredLogs.length} logs
                encontrados no registro master
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por operador ou detalhes..."
                  className="w-full pl-9 pr-4 py-2 text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-200 focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-500 transition-all font-medium"
                />
              </div>

              <div className="relative">
                <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  value={selectedAction}
                  onChange={(e) => setSelectedAction(e.target.value)}
                  className="w-full sm:w-48 pl-9 pr-8 py-2 text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-200 font-bold focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-500 transition-all cursor-pointer appearance-none uppercase tracking-wider"
                >
                  <option value="TODOS">Todos os Eventos</option>
                  <option value="UPDATE_ROLE">Alterações de Cargo</option>
                  <option value="DELETE_USER">Remoções de Operador</option>
                  <option value="ADD_PRODUCT">Produtos Cadastrados</option>
                  <option value="EXPIRE_PRODUCT">Produtos Vencidos</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {logsLoading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-6 h-6 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 tracking-wide">
                Sincronizando registros de auditoria...
              </span>
            </div>
          )}

          {!logsLoading && filteredLogs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500 gap-2">
              <Activity className="w-8 h-8 opacity-40" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Nenhum log localizado nos filtros atuais.
              </span>
              <button
                onClick={() => {
                  setSearchTerm("");
                  setSelectedAction("TODOS");
                }}
                className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 underline font-bold"
              >
                Zerar filtros de busca
              </button>
            </div>
          )}

          {!logsLoading && filteredLogs.length > 0 && (
            <>
              <div className="divide-y divide-gray-100 dark:divide-gray-700/50 max-h-[520px] overflow-y-auto">
                {logsToRender.map((log) => {
                  const meta = getActionMeta(log.action);
                  const operator = userList.find((u) => u.id === log.userId);
                  const operatorName =
                    operator?.name || log.user?.name || "Operador desconhecido";
                  const avatarColor = getAvatarColor(operatorName);

                  return (
                    <div
                      key={log.logId}
                      className={`flex items-start gap-4 px-5 py-4 hover:bg-slate-50/50 dark:hover:bg-gray-700/20 transition-all duration-200 ${meta.border}`}
                    >
                      <div
                        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mt-0.5 shadow-xs ${avatarColor}`}
                      >
                        {getInitials(operatorName)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-sm font-bold text-gray-800 dark:text-gray-100 tracking-tight">
                            {operatorName}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-2.5 py-0.5 rounded-md tracking-wider uppercase ${meta.color}`}
                          >
                            {meta.label}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mt-1.5 leading-relaxed">
                          {log.details}
                        </p>
                        <div className="flex items-center gap-1.5 mt-2 text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{formatTimestamp(log.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {hasMoreLogs && (
                <div className="p-4 border-t border-gray-100 dark:border-gray-700/50 flex justify-center bg-slate-50/30 dark:bg-gray-900/10">
                  <button
                    onClick={() => setVisibleLogsCount((prev) => prev + 10)}
                    className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-slate-50 dark:hover:bg-gray-700 transition-all shadow-xs active:scale-95"
                  >
                    <span>Carregar Mais Registros</span>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {isRoleModalOpen && pendingRoleChange && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800/80 rounded-2xl max-w-md w-full shadow-2xl p-6 relative">
            <button
              onClick={() => setIsRoleModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 text-amber-500 mb-4">
              <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 tracking-tight">
                Alteração de Hierarquia
              </h3>
            </div>
            <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
              Confirmar a alteração de nível de acesso corporativo do operador{" "}
              <strong>{pendingRoleChange.userName}</strong> para o cargo de{" "}
              <span className="text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md text-[10px]">
                {pendingRoleChange.newRole}
              </span>
              ?
            </p>
            <form onSubmit={handleConfirmRoleChange} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                  Senha de Segurança Master
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Digite a credencial master de autorização..."
                    className="w-full pl-3 pr-10 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-medium focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-500 text-gray-700 dark:text-gray-200 rounded-xl transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 dark:text-gray-500 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsRoleModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider border border-gray-200 dark:border-gray-700 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-gray-800 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl disabled:opacity-50 transition-all shadow-md active:scale-95"
                >
                  {isSubmitting ? "Validando..." : "Confirmar Mudança"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDeleteModalOpen && pendingDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white dark:bg-gray-900 border border-rose-100 dark:border-rose-950/60 rounded-2xl max-w-md w-full shadow-2xl p-6 relative">
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 text-rose-600 mb-4">
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 rounded-xl">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 tracking-tight">
                Revogar Acesso do Operador
              </h3>
            </div>
            <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
              Tem certeza absoluta que deseja banir o operador{" "}
              <strong>{pendingDelete.userName}</strong>? O desligamento impedirá
              conexões futuras imediatas e limpará a sessão atual. Esta ação é
              definitiva.
            </p>
            <form onSubmit={handleConfirmDelete} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                  Senha Master do Administrador
                </label>
                <input
                  type="password"
                  required
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Confirme com sua credencial master..."
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-medium focus:outline-none focus:border-rose-500 dark:focus:border-rose-500 text-gray-700 dark:text-gray-200 rounded-xl transition-all"
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider border border-gray-200 dark:border-gray-700 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-gray-800 transition-all"
                >
                  Manter Ativo
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white bg-rose-600 hover:bg-rose-700 rounded-xl disabled:opacity-50 transition-all shadow-md active:scale-95"
                >
                  {isSubmitting ? "Excluindo..." : "Banir Operador"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isNotifyModalOpen && notifyTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800/80 rounded-2xl max-w-md w-full shadow-2xl p-6 relative">
            <button
              onClick={() => setIsNotifyModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 text-blue-600 dark:text-blue-400 mb-4">
              <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 rounded-xl">
                <Bell className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 tracking-tight">
                Notificar Operador
              </h3>
            </div>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider mb-4">
              Destinatário:{" "}
              <span className="text-gray-700 dark:text-gray-300 normal-case font-medium">
                {notifyTarget.name} ({notifyTarget.email})
              </span>
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                  Mensagem de Alerta Direto
                </label>
                <textarea
                  rows={4}
                  value={notifyMessage}
                  onChange={(e) => setNotifyMessage(e.target.value)}
                  placeholder="Escreva as diretrizes ou avisos administrativos..."
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-medium focus:outline-none focus:border-blue-500 dark:focus:border-blue-500 text-gray-700 dark:text-gray-200 rounded-xl transition-all resize-none leading-relaxed"
                />
              </div>
              <div className="flex flex-wrap gap-2 justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={handleSendEmailNotification}
                  className="flex items-center gap-2 px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider border border-gray-200 dark:border-gray-700 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-800 transition-all active:scale-95"
                >
                  <Mail className="w-3.5 h-3.5" />
                  Abrir Via E-mail
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsNotifyModalOpen(false)}
                    className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider border border-gray-200 dark:border-gray-700 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-gray-800 transition-all"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={handleSendInternalNotification}
                    disabled={isSubmitting}
                    className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50 transition-all"
                  >
                    {isSubmitting ? "Enviando..." : "Alerta Interno"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
