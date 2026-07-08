"use client";

import React, { useState, useRef, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/app/redux";
import { setIsDarkMode } from "@/state";
import { setCredentials } from "@/state/authSlice";
import { useUpdateUserSettingsMutation } from "@/state/api";
import { authClient } from "@/lib/auth-client";
import AvatarEditor from "react-avatar-editor";
import {
  User,
  Bell,
  Moon,
  Globe,
  Save,
  Pencil,
  ZoomIn,
  X,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Clock,
  Eye,
  EyeOff,
  Sliders,
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

const Settings = () => {
  const dispatch = useAppDispatch();

  const currentUser = useAppSelector((state) => state.auth.user);
  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);

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
  const [notifications, setNotifications] = useState(true);

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

  const hasGeralChanges =
    formData.username !== initialFormData.username ||
    formData.email !== initialFormData.email ||
    formData.language !== initialFormData.language ||
    isImageChanged;

  const handleInputChange = (key: keyof TextSettings, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
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

  const handleSaveCroppedImage = () => {
    if (editorRef.current) {
      const canvas = editorRef.current.getImageScaledToCanvas();
      const dataUrl = canvas.toDataURL();
      setProfileImage(dataUrl);
      setIsImageChanged(true);
      setIsEditorOpen(false);
      setSelectedFile(null);
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
                        Alertas Globais
                      </span>
                      <span className="text-[11px] text-gray-400">
                        Notificar sobre produtos com estoque crítico.
                      </span>
                    </div>
                  </div>
                  <label className="inline-flex relative items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={notifications}
                      onChange={() => setNotifications(!notifications)}
                    />
                    <div className="w-10 h-5 bg-gray-200 dark:bg-gray-700 rounded-full peer-focus:ring-0 transition after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full peer-checked:bg-emerald-500"></div>
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

      {/* Aba Acesso & Segurança */}
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
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isChangingPassword ? "Processando..." : "Atualizar Senha"}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Modal de Crop */}
      {isEditorOpen && selectedFile && (
        <div className="fixed inset-0 bg-gray-900/40 dark:bg-black/60 backdrop-blur-xs overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-sm bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/70 shadow-2xl rounded-xl p-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsEditorOpen(false);
                setSelectedFile(null);
              }}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wider mb-5">
              Ajustar Imagem
            </h3>

            <div className="flex justify-center bg-gray-50 dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-700/50 overflow-hidden">
              <AvatarEditor
                ref={editorRef}
                image={selectedFile}
                width={180}
                height={180}
                border={20}
                borderRadius={100}
                color={[31, 41, 55, 0.6]}
                scale={zoom}
                rotate={0}
              />
            </div>

            <div className="mt-5 flex items-center gap-3 justify-center">
              <ZoomIn className="w-4 h-4 text-gray-400" />
              <input
                type="range"
                min="1"
                max="3"
                step="0.01"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            <div className="flex gap-3 mt-6 justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsEditorOpen(false);
                  setSelectedFile(null);
                }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-bold uppercase tracking-wider rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveCroppedImage}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent className="max-w-md bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-2xl rounded-2xl p-6 animate-in fade-in zoom-in-95 duration-200">
          <AlertDialogHeader className="flex flex-col items-center text-center gap-3">
            <div
              className={`p-3 rounded-full ${alertConfig.isError ? "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400" : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"}`}
            >
              {alertConfig.isError ? (
                <AlertTriangle className="w-8 h-8" />
              ) : (
                <CheckCircle2 className="w-8 h-8" />
              )}
            </div>
            <AlertDialogTitle className="text-lg font-bold text-gray-900 dark:text-gray-100 tracking-tight">
              {alertConfig.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed max-w-sm">
              {alertConfig.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex justify-center w-full">
            <AlertDialogAction
              className={`w-full sm:w-auto px-6 py-2.5 font-bold text-xs uppercase tracking-wider text-white rounded-xl ${alertConfig.isError ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"}`}
            >
              Entendido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Settings;
