"use client";

import React, { useState, useRef, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/app/redux";
import { setIsDarkMode } from "@/state";
import { setCredentials } from "@/state/authSlice";
import {
  useUpdateUserSettingsMutation,
  useGetWhatsappStatusQuery,
  useRequestWhatsappOtpMutation,
  useVerifyWhatsappOtpMutation,
  useDisableWhatsappMutation,
} from "@/state/api";
import { authClient } from "@/lib/auth-client";
import {
  User,
  Bell,
  Moon,
  Globe,
  Save,
  Pencil,
  AlertTriangle,
  ShieldAlert,
  Clock,
  Eye,
  EyeOff,
  Sliders,
  MessageCircle,
  X,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  RotateCw,
  Unlink,
} from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type TextSettings = {
  username: string;
  email: string;
  language: string;
};

type TabType = "geral" | "seguranca";

const OTP_RESEND_COOLDOWN = 60;

const formatarNumeroExibicao = (numero: string): string => {
  const digitos = numero.replace(/\D/g, "");
  const semDDI = digitos.startsWith("55") ? digitos.slice(2) : digitos;
  if (semDDI.length < 10) return numero;
  const ddd = semDDI.slice(0, 2);
  const parte1 = semDDI.slice(2, semDDI.length - 4);
  const parte2 = semDDI.slice(-4);
  return `+55 (${ddd}) ${parte1}-${parte2}`;
};

const formatarInputTelefone = (valor: string): string => {
  const digitos = valor.replace(/\D/g, "").slice(0, 11);
  if (digitos.length <= 2) return digitos;
  if (digitos.length <= 7)
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`;
  return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
};

const Settings = () => {
  const dispatch = useAppDispatch();

  const currentUser = useAppSelector((state) => state.auth.user);
  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);

  // ── WhatsApp: estado sincronizado com o backend ────────────────
  const { data: whatsappStatus, isLoading: isLoadingWhatsappStatus } =
    useGetWhatsappStatusQuery();
  const [requestOtp] = useRequestWhatsappOtpMutation();
  const [verifyOtp] = useVerifyWhatsappOtpMutation();
  const [disableWhatsapp, { isLoading: isDisabling }] =
    useDisableWhatsappMutation();

  const [isWhatsappModalOpen, setIsWhatsappModalOpen] = useState(false);
  const [whatsappStep, setWhatsappStep] = useState<"phone" | "otp">("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpValues, setOtpValues] = useState<string[]>([
    "",
    "",
    "",
    "",
    "",
    "",
  ]);
  const [isSubmittingWhatsapp, setIsSubmittingWhatsapp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const whatsappAtivo = whatsappStatus?.whatsappOptIn ?? false;

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const [updateUserSettings, { isLoading }] = useUpdateUserSettingsMutation();

  const [activeTab, setActiveTab] = useState<TabType>("geral");

  const [initialFormData, setInitialFormData] = useState<TextSettings>({
    username: "",
    email: "",
    language: "Português (BR)",
  });
  const [formData, setFormData] = useState<TextSettings>({
    username: "",
    email: "",
    language: "Português (BR)",
  });
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isImageChanged, setIsImageChanged] = useState(false);
  const [pushAtivo, setPushAtivo] = useState(false);
  const [isRegisteringPush, setIsRegisteringPush] = useState(false);

  const [securityData, setSecurityData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isSocialUser =
    currentUser?.image?.includes("googleusercontent.com") || false;

  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    title: string;
    description: string;
    isError: boolean;
  }>({ title: "", description: "", isError: false });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [zoom, setZoom] = useState<number>(1.2);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<any>(null);

  useEffect(() => {
    if (currentUser) {
      const loadedData = {
        username: currentUser.name || "",
        email: currentUser.email || "",
        language: currentUser.language || "Português (BR)",
      };
      setInitialFormData(loadedData);
      setFormData(loadedData);

      if (currentUser.image) {
        setProfileImage(currentUser.image);
      }
    }
  }, [currentUser]);

  useEffect(() => {
    const verificarInscricaoPush = async () => {
      if ("serviceWorker" in navigator && "PushManager" in window) {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) {
            const subscription =
              await registration.pushManager.getSubscription();
            if (subscription) {
              setPushAtivo(true);
            }
          }
        } catch (error) {
          console.error("Erro ao verificar inscrição push existente:", error);
        }
      }
    };
    verificarInscricaoPush();
  }, []);

  const hasGeralChanges =
    formData.username !== initialFormData.username ||
    formData.email !== initialFormData.email ||
    formData.language !== initialFormData.language ||
    isImageChanged;

  const handleInputChange = (key: keyof TextSettings, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, "+")
      .replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const handleNotificationToggle = async (checked: boolean) => {
    if (!checked) {
      setPushAtivo(false);
      return;
    }

    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      alert("Seu navegador não suporta Notificações Push.");
      return;
    }

    setIsRegisteringPush(true);
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const permission = await window.Notification.requestPermission();
      if (permission !== "granted") {
        alert("Permissão de notificação negada pelo navegador.");
        setIsRegisteringPush(false);
        return;
      }

      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        console.error("Chave VAPID pública não definida no client (.env).");
        alert("Configuração de push ausente. Contate o suporte.");
        setIsRegisteringPush(false);
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      const response = await fetch("/api/notifications/subscribe", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      });

      if (!response.ok) {
        throw new Error("Erro ao salvar inscrição no servidor.");
      }

      setPushAtivo(true);
    } catch (error) {
      console.error("Erro ao ativar Push Notification:", error);
      alert("Não foi possível ativar as notificações push.");
    } finally {
      setIsRegisteringPush(false);
    }
  };

  const handlePencilClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setIsEditorOpen(true);
    }
  };

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser?.id) {
      setAlertConfig({
        title: "Sessão Expirada",
        description:
          "ID do usuário não encontrado. Por favor, realize o login novamente.",
        isError: true,
      });
      setIsAlertOpen(true);
      return;
    }

    try {
      const result = await updateUserSettings({
        userId: currentUser.id,
        username: formData.username,
        email: formData.email,
        language: formData.language,
        profileImageBase64:
          isImageChanged && profileImage?.startsWith("data:image")
            ? profileImage
            : null,
      }).unwrap();

      if (result.success) {
        dispatch(
          setCredentials({
            user: {
              ...currentUser,
              name: formData.username,
              email: formData.email,
              language: formData.language,
              image: profileImage || currentUser.image,
            },
          }),
        );

        setAlertConfig({
          title: "Alterações Salvas!",
          description:
            "Suas preferências de perfil e interface foram atualizadas com sucesso.",
          isError: false,
        });
        setIsAlertOpen(true);
        setInitialFormData(formData);
        setIsImageChanged(false);
      }
    } catch (error: any) {
      console.error("Erro ao salvar configurações:", error);
      setAlertConfig({
        title: "Falha na Atualização",
        description:
          error?.data?.error ||
          "Ocorreu um erro inesperado de comunicação com o servidor.",
        isError: true,
      });
      setIsAlertOpen(true);
    }
  };

  const handleUpdatePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (securityData.newPassword.length < 8) {
      setAlertConfig({
        title: "Senha muito curta",
        description:
          "A nova senha deve conter pelo menos 8 caracteres para garantir a segurança do sistema.",
        isError: true,
      });
      setIsAlertOpen(true);
      return;
    }

    if (securityData.newPassword !== securityData.confirmPassword) {
      setAlertConfig({
        title: "Senhas Divergentes",
        description:
          "A nova senha e a confirmação digitada não coincidem. Verifique os valores.",
        isError: true,
      });
      setIsAlertOpen(true);
      return;
    }

    setIsChangingPassword(true);

    const { error } = await authClient.changePassword({
      newPassword: securityData.newPassword,
      currentPassword: securityData.currentPassword,
    });

    setIsChangingPassword(false);

    if (error) {
      setAlertConfig({
        title: "Erro de Segurança",
        description:
          error.message ||
          "Não foi possível processar a alteração da sua senha. Verifique a senha atual.",
        isError: true,
      });
      setIsAlertOpen(true);
      return;
    }

    setAlertConfig({
      title: "Senha Modificada!",
      description:
        "Suas credenciais de acesso foram atualizadas com sucesso no Better Auth.",
      isError: false,
    });
    setIsAlertOpen(true);
    setSecurityData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  };

  // ── WhatsApp: handlers ──────────────────────────────────────────
  const abrirModalWhatsapp = () => {
    setPhoneNumber("");
    setOtpValues(["", "", "", "", "", ""]);
    setWhatsappStep("phone");
    setResendCooldown(0);
    setIsWhatsappModalOpen(true);
  };

  const handleWhatsappToggle = async (checked: boolean) => {
    if (checked) {
      abrirModalWhatsapp();
      return;
    }

    // Desligando um número já confirmado: chama o backend direto,
    // sem precisar reabrir o fluxo de OTP.
    try {
      await disableWhatsapp().unwrap();
      setAlertConfig({
        title: "WhatsApp Desconectado",
        description: "Você não receberá mais alertas por este canal.",
        isError: false,
      });
      setIsAlertOpen(true);
    } catch (error: any) {
      setAlertConfig({
        title: "Erro",
        description:
          error?.data?.message || "Não foi possível desativar o WhatsApp.",
        isError: true,
      });
      setIsAlertOpen(true);
    }
  };

  const handleRequestWhatsAppOtp = async () => {
    const digitos = phoneNumber.replace(/\D/g, "");
    if (digitos.length < 10) {
      setAlertConfig({
        title: "Número Inválido",
        description: "Insira um número de WhatsApp válido, com DDD.",
        isError: true,
      });
      setIsAlertOpen(true);
      return;
    }

    setIsSubmittingWhatsapp(true);
    try {
      await requestOtp({ phoneNumber: digitos }).unwrap();
      setWhatsappStep("otp");
      setResendCooldown(OTP_RESEND_COOLDOWN);
      setOtpValues(["", "", "", "", "", ""]);
    } catch (error: any) {
      setAlertConfig({
        title: "Erro ao Enviar",
        description:
          error?.data?.message || "Falha ao enviar o código de verificação.",
        isError: true,
      });
      setIsAlertOpen(true);
    } finally {
      setIsSubmittingWhatsapp(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, "").split("").slice(0, 6);
      const newOtp = ["", "", "", "", "", ""];

      digits.forEach((d, idx) => {
        newOtp[idx] = d;
      });

      setOtpValues(newOtp);

      const nextFocus = digits.length < 6 ? digits.length : 5;
      otpInputRefs.current[nextFocus]?.focus();
      return;
    }

    const newOtp = [...otpValues];
    newOtp[index] = value.replace(/\D/g, "");
    setOtpValues(newOtp);

    // Avança o foco automaticamente
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !otpValues[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyWhatsAppOtp = async () => {
    const code = otpValues.join("");
    if (code.length < 6) {
      setAlertConfig({
        title: "Código Incompleto",
        description: "Digite os 6 dígitos enviados para o seu WhatsApp.",
        isError: true,
      });
      setIsAlertOpen(true);
      return;
    }

    setIsSubmittingWhatsapp(true);
    try {
      await verifyOtp({ code }).unwrap();
      setIsWhatsappModalOpen(false);
      setAlertConfig({
        title: "WhatsApp Vinculado!",
        description: "Notificações via WhatsApp ativadas com sucesso.",
        isError: false,
      });
      setIsAlertOpen(true);
    } catch (error: any) {
      setAlertConfig({
        title: "Erro de Validação",
        description: error?.data?.message || "Código incorreto ou expirado.",
        isError: true,
      });
      setIsAlertOpen(true);
    } finally {
      setIsSubmittingWhatsapp(false);
    }
  };

  const handleFecharModalWhatsapp = () => {
    setIsWhatsappModalOpen(false);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
          Configurações do Sistema
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Gerencie suas preferências de perfil, aparência e segurança de
          credenciais.
        </p>
      </div>

      <div className="flex border-b border-gray-200 dark:border-gray-700/60 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("geral")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
            activeTab === "geral"
              ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
              : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          Geral
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("seguranca")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
            activeTab === "seguranca"
              ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
              : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          Segurança
        </button>
      </div>

      {activeTab === "geral" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col items-center justify-center py-6 bg-white dark:bg-gray-800 shadow-[0_4px_20px_rgb(0,0,0,0.01)] rounded-xl border border-gray-100 dark:border-gray-700/60">
            <div className="relative group">
              <div className="w-28 h-28 rounded-full border-4 border-white dark:border-gray-800 shadow-md overflow-hidden bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-12 h-12 text-gray-400 dark:text-gray-600" />
                )}
              </div>

              <button
                type="button"
                onClick={handlePencilClick}
                disabled={isLoading}
                className="absolute bottom-1 right-1 bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-full shadow-md border border-white dark:border-gray-800 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
            </div>

            <div className="flex flex-col items-center mt-3 gap-0.5">
              <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
                {formData.username || "Usuário"}
              </span>
            </div>
          </div>

          <form onSubmit={handleSaveChanges} className="space-y-6">
            <div className="bg-white dark:bg-gray-800 shadow-[0_4px_20px_rgb(0,0,0,0.01)] rounded-xl border border-gray-100 dark:border-gray-700/60 p-6">
              <div className="flex items-center gap-2 pb-4 mb-5 border-b border-gray-100 dark:border-gray-700/50">
                <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Perfil e Conta
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Nome de Usuário
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) =>
                      handleInputChange("username", e.target.value)
                    }
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-700 dark:text-gray-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-medium"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    E-mail Corporativo
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-700 dark:text-gray-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-medium"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 shadow-[0_4px_20px_rgb(0,0,0,0.01)] rounded-xl border border-gray-100 dark:border-gray-700/60 p-6">
              <div className="flex items-center gap-2 pb-4 mb-5 border-b border-gray-100 dark:border-gray-700/50">
                <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Preferências de Interface
                </h2>
              </div>

              <div className="space-y-5">
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-start gap-3">
                    <Moon className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-200">
                        Modo Escuro
                      </span>
                      <span className="text-[11px] text-gray-400">
                        Alternar aparência geral do sistema.
                      </span>
                    </div>
                  </div>
                  <label className="inline-flex relative items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={isDarkMode}
                      onChange={() => dispatch(setIsDarkMode(!isDarkMode))}
                    />
                    <div className="w-10 h-5 bg-gray-200 dark:bg-gray-700 rounded-full peer-focus:ring-0 transition after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between py-2 border-t border-gray-50 dark:border-gray-700/30">
                  <div className="flex items-start gap-3">
                    <Bell className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-200">
                        Alertas Globais & Push
                      </span>
                      <span className="text-[11px] text-gray-400">
                        {isRegisteringPush
                          ? "Ativando neste dispositivo..."
                          : "Receber notificações push de estoque crítico neste dispositivo."}
                      </span>
                    </div>
                  </div>
                  <label className="inline-flex relative items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={pushAtivo}
                      disabled={isRegisteringPush}
                      onChange={(e) =>
                        handleNotificationToggle(e.target.checked)
                      }
                    />
                    <div className="w-10 h-5 bg-gray-200 dark:bg-gray-700 rounded-full peer-focus:ring-0 transition after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full peer-checked:bg-emerald-500 peer-disabled:opacity-50"></div>
                  </label>
                </div>

                {/* WhatsApp */}
                <div className="flex items-center justify-between py-2 border-t border-gray-50 dark:border-gray-700/30">
                  <div className="flex items-start gap-3">
                    <MessageCircle className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-200">
                        Notificações por WhatsApp
                      </span>
                      {isLoadingWhatsappStatus ? (
                        <span className="text-[11px] text-gray-400">
                          Verificando status...
                        </span>
                      ) : whatsappAtivo && whatsappStatus?.whatsappNumber ? (
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          Conectado:{" "}
                          {formatarNumeroExibicao(
                            whatsappStatus.whatsappNumber,
                          )}
                        </span>
                      ) : (
                        <span className="text-[11px] text-gray-400">
                          Receba alertas automáticos de vencimento e estoque
                          pelo WhatsApp.
                        </span>
                      )}
                    </div>
                  </div>
                  <label className="inline-flex relative items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={whatsappAtivo}
                      disabled={isLoadingWhatsappStatus || isDisabling}
                      onChange={(e) => handleWhatsappToggle(e.target.checked)}
                    />
                    <div className="w-10 h-5 bg-gray-200 dark:bg-gray-700 rounded-full peer-focus:ring-0 transition after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full peer-checked:bg-emerald-500 peer-disabled:opacity-50"></div>
                  </label>
                </div>

                <div className="flex flex-col gap-1.5 pt-3 border-t border-gray-50 dark:border-gray-700/30">
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Idioma Local
                  </label>
                  <input
                    type="text"
                    value={formData.language}
                    onChange={(e) =>
                      handleInputChange("language", e.target.value)
                    }
                    className="w-full md:w-1/2 px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-700 dark:text-gray-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-medium"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isLoading || !hasGeralChanges}
                className={`flex items-center gap-2 font-bold text-xs uppercase tracking-wider py-3 px-6 rounded-xl transition-all shadow-sm cursor-pointer ${
                  isLoading || !hasGeralChanges
                    ? "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed shadow-none"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white hover:shadow-md active:scale-98"
                }`}
              >
                <Save className="w-4 h-4" />
                {isLoading ? "Salvando..." : "Salvar Configurações"}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === "seguranca" && (
        <form
          onSubmit={handleUpdatePasswordSubmit}
          className="space-y-6 animate-in fade-in duration-200"
        >
          <div className="bg-white dark:bg-gray-800 shadow-[0_4px_20px_rgb(0,0,0,0.01)] rounded-xl border border-gray-100 dark:border-gray-700/60 p-6">
            <div className="flex items-center gap-2 pb-4 mb-5 border-b border-gray-100 dark:border-gray-700/50">
              <ShieldAlert className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                Redefinição de Credenciais
              </h2>
            </div>

            {isSocialUser ? (
              <div className="mb-5 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 rounded-xl flex gap-3 items-start">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 dark:text-amber-400 leading-relaxed font-medium">
                  Sua conta está vinculada ao <strong>Google Login</strong>{" "}
                  através do Better Auth. A senha atual não é solicitada para
                  vincular uma credencial fixa de e-mail e senha.
                </p>
              </div>
            ) : (
              <div className="mb-5 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-xl flex gap-3 items-start">
                <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-800 dark:text-blue-400 leading-relaxed font-medium">
                  Recomendamos alterar sua senha periodicamente para manter o
                  nível de segurança do inventário alto.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Senha Atual
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  disabled={isSocialUser}
                  value={securityData.currentPassword}
                  onChange={(e) =>
                    setSecurityData((prev) => ({
                      ...prev,
                      currentPassword: e.target.value,
                    }))
                  }
                  placeholder={
                    isSocialUser ? "Não necessária (Google)" : "••••••••"
                  }
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-700 dark:text-gray-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-medium disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-800"
                  required={!isSocialUser}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Nova Senha
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={securityData.newPassword}
                  onChange={(e) =>
                    setSecurityData((prev) => ({
                      ...prev,
                      newPassword: e.target.value,
                    }))
                  }
                  placeholder="Mínimo 8 caracteres"
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-700 dark:text-gray-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-medium"
                  required
                />
                {securityData.newPassword.length > 0 && (
                  <span
                    className={`text-[10px] font-semibold transition-all ${
                      securityData.newPassword.length >= 8
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {securityData.newPassword.length >= 8
                      ? "✓ Senha atende ao tamanho mínimo"
                      : `Faltam ${8 - securityData.newPassword.length} caracteres (mínimo 8)`}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Confirmar Nova Senha
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={securityData.confirmPassword}
                    onChange={(e) =>
                      setSecurityData((prev) => ({
                        ...prev,
                        confirmPassword: e.target.value,
                      }))
                    }
                    placeholder="Repita a nova senha"
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-700 dark:text-gray-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-medium"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-5">
              <button
                type="submit"
                disabled={
                  isChangingPassword ||
                  !securityData.newPassword ||
                  !securityData.confirmPassword
                }
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isChangingPassword ? "Atualizando..." : "Alterar Senha"}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ── Modal sofisticado de vínculo do WhatsApp ─────────────── */}
      {isWhatsappModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 p-4">
          <div className="bg-white dark:bg-gray-900 border-0 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Cabeçalho com faixa colorida, consistente com o AlertDialog */}
            <div className="relative bg-gradient-to-br from-emerald-500 to-emerald-600 px-6 pt-7 pb-6 text-center">
              <button
                onClick={handleFecharModalWhatsapp}
                className="absolute top-3.5 right-3.5 text-white/70 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>

              <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
                <MessageCircle className="w-7 h-7 text-white" strokeWidth={2} />
              </div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Vincular WhatsApp
              </h3>
              <p className="text-[11px] text-white/80 mt-1">
                {whatsappStep === "phone"
                  ? "Confirme seu número para receber alertas"
                  : "Digite o código enviado ao seu WhatsApp"}
              </p>

              {/* Indicador de etapas */}
              <div className="flex items-center justify-center gap-1.5 mt-4">
                <div
                  className={`h-1.5 rounded-full transition-all ${
                    whatsappStep === "phone"
                      ? "w-6 bg-white"
                      : "w-1.5 bg-white/40"
                  }`}
                />
                <div
                  className={`h-1.5 rounded-full transition-all ${
                    whatsappStep === "otp"
                      ? "w-6 bg-white"
                      : "w-1.5 bg-white/40"
                  }`}
                />
              </div>
            </div>

            <div className="px-6 pt-5 pb-6">
              {whatsappStep === "phone" ? (
                <div className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Número do WhatsApp
                    </label>
                    <div className="flex items-center border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 rounded-xl overflow-hidden focus-within:ring-1 focus-within:ring-emerald-500 focus-within:border-emerald-500 transition-all">
                      <span className="px-3.5 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700 select-none">
                        +55
                      </span>
                      <input
                        type="tel"
                        inputMode="numeric"
                        placeholder="(11) 99999-9999"
                        value={phoneNumber}
                        onChange={(e) =>
                          setPhoneNumber(formatarInputTelefone(e.target.value))
                        }
                        className="w-full px-3.5 py-3 bg-transparent text-xs text-gray-700 dark:text-gray-200 focus:outline-none font-medium"
                        autoFocus
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-relaxed">
                      Enviaremos um código de 6 dígitos para confirmar que este
                      número é seu.
                    </p>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleFecharModalWhatsapp}
                      className="px-4 py-2.5 text-xs font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={isSubmittingWhatsapp || !phoneNumber}
                      onClick={handleRequestWhatsAppOtp}
                      className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      {isSubmittingWhatsapp && (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      )}
                      {isSubmittingWhatsapp ? "Enviando..." : "Enviar Código"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400 text-center">
                      Código enviado para{" "}
                      <strong className="text-gray-700 dark:text-gray-200">
                        +55 {phoneNumber}
                      </strong>
                    </span>

                    <div className="flex gap-2 justify-center my-4">
                      {otpValues.map((digit, idx) => (
                        <input
                          key={idx}
                          ref={(el) => {
                            otpInputRefs.current[idx] = el;
                          }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpChange(idx, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                          onPaste={(e) => {
                            e.preventDefault();
                            const pastedData = e.clipboardData.getData("text");
                            handleOtpChange(0, pastedData);
                          }}
                          className="w-11 h-13 text-center text-lg font-bold bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-800 dark:text-gray-100 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                          autoFocus={idx === 0}
                        />
                      ))}
                    </div>

                    <button
                      type="button"
                      disabled={resendCooldown > 0 || isSubmittingWhatsapp}
                      onClick={handleRequestWhatsAppOtp}
                      className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline disabled:text-gray-400 dark:disabled:text-gray-500 disabled:no-underline disabled:cursor-not-allowed cursor-pointer transition-colors"
                    >
                      <RotateCw className="w-3 h-3" />
                      {resendCooldown > 0
                        ? `Reenviar código em ${resendCooldown}s`
                        : "Reenviar código"}
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700/60">
                    <button
                      type="button"
                      onClick={() => {
                        setWhatsappStep("phone");
                        setResendCooldown(0);
                      }}
                      className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer mt-4"
                    >
                      Alterar número
                    </button>
                    <div className="flex gap-2 mt-4">
                      <button
                        type="button"
                        onClick={handleFecharModalWhatsapp}
                        className="px-4 py-2.5 text-xs font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        disabled={
                          isSubmittingWhatsapp || otpValues.some((v) => !v)
                        }
                        onClick={handleVerifyWhatsAppOtp}
                        className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50"
                      >
                        {isSubmittingWhatsapp && (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        )}
                        {isSubmittingWhatsapp ? "Validando..." : "Validar"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AlertDialog padrão do Shadcn para avisos/erros */}
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent className="max-w-sm bg-white dark:bg-gray-900 border-0 shadow-2xl rounded-2xl p-0 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div
            className={`flex flex-col items-center text-center px-6 pt-8 pb-6 ${
              alertConfig.isError
                ? "bg-gradient-to-br from-rose-500 to-rose-600"
                : "bg-gradient-to-br from-emerald-500 to-emerald-600"
            }`}
          >
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mb-3.5">
              {alertConfig.isError ? (
                <AlertTriangle className="w-7 h-7 text-white" strokeWidth={2} />
              ) : (
                <CheckCircle2 className="w-7 h-7 text-white" strokeWidth={2} />
              )}
            </div>
            <AlertDialogHeader className="items-center gap-1">
              <AlertDialogTitle className="text-base font-bold text-white tracking-tight">
                {alertConfig.title}
              </AlertDialogTitle>
            </AlertDialogHeader>
          </div>

          <div className="px-6 pt-5 pb-6">
            <AlertDialogDescription className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed text-center mb-5">
              {alertConfig.description}
            </AlertDialogDescription>

            <AlertDialogFooter className="mx-0 mb-0 p-0 border-t-0 bg-transparent rounded-none justify-center sm:justify-center">
              <button
                type="button"
                onClick={() => setIsAlertOpen(false)}
                className={`w-full font-bold text-xs uppercase tracking-wider text-white py-3 rounded-xl transition-all shadow-md active:scale-98 cursor-pointer ${
                  alertConfig.isError
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                Entendido
              </button>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Settings;
