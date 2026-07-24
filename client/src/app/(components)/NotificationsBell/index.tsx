"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
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
  X,
  ImageOff,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────

/**
 * Extensão local do tipo de notificação vindo da API. O backend agora
 * também retorna os dados do produto relacionado (foto, setor e dias
 * restantes até o vencimento). Se o tipo `Notification` em
 * `@/state/api` ainda não tiver esse campo, adicione-o lá para ter
 * tipagem completa de ponta a ponta:
 *
 *   product?: {
 *     name: string;
 *     imageUrl: string | null;
 *     section: string;
 *     diasRestantes: number | null;
 *   } | null;
 */
type NotificationComProduto = ApiNotification & {
  product?: {
    name: string;
    imageUrl: string | null;
    section: string;
    diasRestantes: number | null;
  } | null;
};

type FiltroAba = "todas" | "nao_lidas" | "criticas";

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const formatRelativeTime = (isoString: string) => {
  if (!isoString) return "---";
  const parsed = new Date(isoString);
  if (isNaN(parsed.getTime())) return "---";
  const diffMs = Date.now() - parsed.getTime();
  if (diffMs < 0) return "Agora mesmo";
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  if (diffMins < 1) return "Agora mesmo";
  if (diffMins < 60) return `Há ${diffMins} min`;
  if (diffHours < 24) return `Há ${diffHours} h`;
  return parsed.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
};

/** Agrupa pelo dia do calendário local do dispositivo — adequado aqui,
 * já que é só para organizar visualmente o feed pela percepção de tempo
 * de quem está olhando, e não uma regra de negócio como o vencimento. */
const getGrupoData = (isoString: string): "Hoje" | "Ontem" | "Mais antigas" => {
  const data = new Date(isoString);
  const hoje = new Date();
  const ontem = new Date(hoje);
  ontem.setDate(hoje.getDate() - 1);
  const mesmoDia = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (mesmoDia(data, hoje)) return "Hoje";
  if (mesmoDia(data, ontem)) return "Ontem";
  return "Mais antigas";
};

const ORDEM_GRUPOS = ["Hoje", "Ontem", "Mais antigas"] as const;

type Urgencia = { label: string; classes: string };

const getUrgencia = (dias: number | null | undefined): Urgencia | null => {
  if (dias === null || dias === undefined) return null;
  if (dias < 0)
    return {
      label: "VENCIDO",
      classes: "bg-red-600/90 text-white dark:bg-red-500/90 dark:text-white",
    };
  if (dias === 0)
    return {
      label: "HOJE",
      classes: "bg-red-600/90 text-white dark:bg-red-500/90 dark:text-white",
    };
  if (dias === 1)
    return {
      label: "AMANHÃ",
      classes: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400",
    };
  if (dias <= 5)
    return {
      label: `${dias} DIAS`,
      classes:
        "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400",
    };
  return {
    label: `${dias} DIAS`,
    classes: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  };
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

// ─────────────────────────────────────────────────────────────
// Subcomponentes
// ─────────────────────────────────────────────────────────────

const SkeletonRow = () => (
  <div className="flex gap-3 px-4 py-3.5 animate-pulse">
    <div className="w-11 h-11 rounded-xl bg-gray-100 dark:bg-gray-800 shrink-0" />
    <div className="flex-1 min-w-0 space-y-2 py-0.5">
      <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-4/5" />
      <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-3/5" />
      <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded w-1/4 mt-2" />
    </div>
  </div>
);

const AvatarNotificacao = ({ item }: { item: NotificationComProduto }) => {
  const [erroImagem, setErroImagem] = useState(false);
  const temFoto =
    item.type === "CRITICAL_EXPIRY" && item.product?.imageUrl && !erroImagem;

  if (temFoto) {
    return (
      <div className="relative w-11 h-11 rounded-xl overflow-hidden shrink-0 mt-0.5 ring-1 ring-gray-100 dark:ring-gray-700/60">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.product!.imageUrl as string}
          alt={item.product?.name || "Produto"}
          className="w-full h-full object-cover"
          onError={() => setErroImagem(true)}
        />
        <div className="absolute inset-0 ring-1 ring-inset ring-black/5 dark:ring-white/5 rounded-xl pointer-events-none" />
      </div>
    );
  }

  const semFotoMasCritico = item.type === "CRITICAL_EXPIRY";

  return (
    <div
      className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center mt-0.5 ${
        item.type === "CRITICAL_EXPIRY"
          ? "bg-red-50 dark:bg-red-950/40"
          : item.type === "SYSTEM"
            ? "bg-blue-50 dark:bg-blue-950/40"
            : "bg-gray-100 dark:bg-gray-800"
      }`}
    >
      {semFotoMasCritico && erroImagem ? (
        <ImageOff className="w-4 h-4 text-red-400 dark:text-red-500/70" />
      ) : (
        getNotificationIcon(item.type)
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────

const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [aba, setAba] = useState<FiltroAba>("todas");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentUser = useAppSelector((state) => state.auth.user);

  const { data: notificationsRaw = [], isLoading } = useGetNotificationsQuery(
    undefined,
    {
      skip: !currentUser?.id,
      pollingInterval: 30000,
    },
  );

  const notifications = notificationsRaw as NotificationComProduto[];

  const [markAsRead] = useMarkNotificationAsReadMutation();
  const [markAllAsRead] = useMarkAllNotificationsAsReadMutation();
  const [deleteNotification] = useDeleteNotificationMutation();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Trava o scroll do body quando o sheet mobile está aberto
  useEffect(() => {
    if (isOpen) {
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const criticalCount = notifications.filter(
    (n) => n.type === "CRITICAL_EXPIRY" && !n.isRead,
  ).length;

  // Pequeno "pulso" no sino quando a contagem de não lidas aumenta
  const [pulsar, setPulsar] = useState(false);
  const contagemAnterior = useRef(unreadCount);
  useEffect(() => {
    if (unreadCount > contagemAnterior.current) {
      setPulsar(true);
      const t = setTimeout(() => setPulsar(false), 700);
      return () => clearTimeout(t);
    }
    contagemAnterior.current = unreadCount;
  }, [unreadCount]);

  const handleMarkAsRead = useCallback(
    async (id: string) => {
      try {
        await markAsRead({ id }).unwrap();
      } catch (error) {
        console.error("Erro ao marcar notificação como lida:", error);
      }
    },
    [markAsRead],
  );

  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await markAllAsRead().unwrap();
    } catch (error) {
      console.error("Erro ao marcar todas como lidas:", error);
    }
  }, [markAllAsRead]);

  const handleDelete = useCallback(
    async (id: string, e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      try {
        await deleteNotification({ id }).unwrap();
      } catch (error) {
        console.error("Erro ao excluir notificação:", error);
      }
    },
    [deleteNotification],
  );

  const notificationsFiltradas = useMemo(() => {
    switch (aba) {
      case "nao_lidas":
        return notifications.filter((n) => !n.isRead);
      case "criticas":
        return notifications.filter((n) => n.type === "CRITICAL_EXPIRY");
      default:
        return notifications;
    }
  }, [notifications, aba]);

  const grupos = useMemo(() => {
    const mapa = new Map<string, NotificationComProduto[]>();
    for (const item of notificationsFiltradas) {
      const grupo = getGrupoData(item.createdAt);
      if (!mapa.has(grupo)) mapa.set(grupo, []);
      mapa.get(grupo)!.push(item);
    }
    return ORDEM_GRUPOS.filter((g) => mapa.has(g)).map((g) => ({
      titulo: g,
      itens: mapa.get(g)!,
    }));
  }, [notificationsFiltradas]);

  const abas: { id: FiltroAba; label: string; contagem?: number }[] = [
    { id: "todas", label: "Todas" },
    { id: "nao_lidas", label: "Não lidas", contagem: unreadCount },
    { id: "criticas", label: "Críticas", contagem: criticalCount },
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label={`Notificações. ${unreadCount > 0 ? `${unreadCount} alertas não lidos.` : "Nenhum alerta."}`}
        className={`relative p-2.5 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#006938] ${
          pulsar ? "animate-bounce" : ""
        }`}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 inline-flex items-center justify-center min-w-4 h-4 px-1 text-[10px] font-bold leading-none text-white bg-red-500 rounded-full ring-2 ring-white dark:ring-gray-900">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Backdrop — some no desktop, escurece no mobile (comportamento de bottom sheet) */}
          <div
            className="fixed inset-0 z-40 bg-gray-900/40 backdrop-blur-[1px] sm:bg-transparent sm:backdrop-blur-none"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          <div
            role="dialog"
            aria-label="Notificações"
            className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] rounded-t-3xl
              sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-full sm:mt-3
              sm:w-96 sm:max-h-[34rem] sm:rounded-2xl
              bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800
              shadow-[0_-8px_40px_rgba(0,0,0,0.12)] sm:shadow-2xl
              flex flex-col overflow-hidden
              origin-bottom sm:origin-top-right
              animate-in fade-in slide-in-from-bottom-4 sm:slide-in-from-top-2 duration-200"
          >
            {/* Alça de arrastar (só mobile) */}
            <div className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0">
              <div className="w-9 h-1 rounded-full bg-gray-200 dark:bg-gray-700" />
            </div>

            {/* Cabeçalho */}
            <div className="px-4 py-3.5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/30 shrink-0">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                  Notificações
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {unreadCount === 0
                    ? "Tudo em dia!"
                    : `${unreadCount} alertas não lidos`}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="flex items-center gap-1 text-xs font-semibold text-[#006938] hover:text-[#004d29] dark:text-green-400 dark:hover:text-green-300 transition-colors cursor-pointer focus:outline-none px-2 py-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span className="hidden xs:inline">Marcar todas</span>
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  aria-label="Fechar notificações"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors cursor-pointer sm:hidden"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Abas de filtro */}
            <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-gray-50 dark:border-gray-800/60 shrink-0 overflow-x-auto">
              {abas.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setAba(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wide transition-colors cursor-pointer whitespace-nowrap ${
                    aba === tab.id
                      ? "bg-[#006938] text-white shadow-sm"
                      : "bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/60"
                  }`}
                >
                  {tab.label}
                  {typeof tab.contagem === "number" && tab.contagem > 0 && (
                    <span
                      className={`inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[10px] ${
                        aba === tab.id
                          ? "bg-white/20 text-white"
                          : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                      }`}
                    >
                      {tab.contagem}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Lista */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800/60">
              {isLoading && (
                <div>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </div>
              )}

              {!isLoading && notificationsFiltradas.length === 0 && (
                <div className="flex flex-col items-center justify-center py-14 text-gray-400 gap-2 px-6 text-center">
                  <Bell className="w-8 h-8 opacity-30" />
                  <span className="text-xs font-medium">
                    {aba === "criticas"
                      ? "Nenhum produto em vencimento crítico."
                      : aba === "nao_lidas"
                        ? "Nenhuma notificação não lida."
                        : "Nenhum aviso por aqui."}
                  </span>
                  <span className="text-[11px] text-gray-400 dark:text-gray-500 max-w-[220px]">
                    Assim que um produto entrar em vencimento crítico, o alerta
                    aparece aqui.
                  </span>
                </div>
              )}

              {!isLoading &&
                grupos.map((grupo) => (
                  <div key={grupo.titulo}>
                    <div className="px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 bg-gray-50/70 dark:bg-gray-900/40 sticky top-0">
                      {grupo.titulo}
                    </div>
                    {grupo.itens.map((item) => {
                      const urgencia =
                        item.type === "CRITICAL_EXPIRY"
                          ? getUrgencia(item.product?.diasRestantes)
                          : null;

                      return (
                        <div
                          key={item.id}
                          role="button"
                          tabIndex={0}
                          onClick={() =>
                            !item.isRead && handleMarkAsRead(item.id)
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              if (!item.isRead) handleMarkAsRead(item.id);
                            }
                          }}
                          className={`flex flex-col px-4 py-3.5 transition-all relative border-l-4 cursor-pointer focus:outline-none focus:bg-gray-50 dark:focus:bg-gray-800/40 pr-12
                          ${!item.isRead ? "bg-emerald-50/40 dark:bg-gray-800/40" : "hover:bg-gray-50 dark:hover:bg-gray-800/20"}
                          ${item.type === "CRITICAL_EXPIRY" ? "border-l-red-500" : "border-l-transparent"}
                        `}
                        >
                          <div className="flex gap-3">
                            <AvatarNotificacao item={item} />

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p
                                  className={`text-xs sm:text-sm leading-relaxed text-gray-700 dark:text-gray-300 ${
                                    !item.isRead
                                      ? "font-medium text-gray-900 dark:text-gray-100"
                                      : ""
                                  }`}
                                >
                                  {item.message}
                                </p>
                                {!item.isRead && (
                                  <span className="w-2 h-2 rounded-full bg-[#006938] shrink-0 mt-1.5" />
                                )}
                              </div>

                              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                <div className="flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-gray-500">
                                  <Clock className="w-3 h-3" />
                                  <span>
                                    {formatRelativeTime(item.createdAt)}
                                  </span>
                                </div>
                                {urgencia && (
                                  <span
                                    className={`text-[10px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-md ${urgencia.classes}`}
                                  >
                                    {urgencia.label}
                                  </span>
                                )}
                                {item.product?.section && (
                                  <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500">
                                    · {item.product.section}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={(e) => handleDelete(item.id, e)}
                            title="Apagar aviso"
                            aria-label="Apagar notificação"
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;
