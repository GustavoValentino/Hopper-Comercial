"use client";

import React, { useState, FormEvent, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Lock, Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";
import Link from "next/link";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, confirmSetPassword] = useState("");
  const [verSenha, setVerSenha] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setStatus({ type: "error", msg: "As senhas digitadas não coincidem." });
      return;
    }

    setIsLoading(true);
    setStatus(null);

    try {
      const response = await fetch(
        "http://localhost:3001/api/auth/reset-password",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, newPassword }),
        },
      );

      const data = await response.json();

      if (response.ok) {
        setStatus({ type: "success", msg: data.message });
        setTimeout(() => router.push("/login"), 3000);
      } else {
        setStatus({ type: "error", msg: data.error || "Erro ao redefinir." });
      }
    } catch (err) {
      setStatus({
        type: "error",
        msg: "Erro de comunicação com o servidor operacional.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="w-full max-w-md bg-white dark:bg-gray-800 shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-gray-100 dark:border-gray-700/60 p-8 rounded-2xl text-xs text-center font-bold text-rose-500">
        Acesso Negado. Token de verificação de segurança ausente ou corrompido.
      </div>
    );
  }

  return (
    <div className="w-full max-w-md bg-white dark:bg-gray-800 shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-gray-100 dark:border-gray-700/60 rounded-2xl p-8 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-gray-100">
          Inventary Comercial
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Criar Nova Senha de Acesso
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Nova Senha
          </label>
          <div className="relative flex items-center">
            <Lock className="absolute left-3.5 text-gray-400 w-4 h-4" />
            <input
              type={verSenha ? "text" : "password"}
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-10 pr-10 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-700 dark:text-gray-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-medium"
            />
            <button
              type="button"
              onClick={() => setVerSenha(!verSenha)}
              className="absolute right-3.5 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer transition-colors"
            >
              {verSenha ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Confirmar Nova Senha
          </label>
          <div className="relative flex items-center">
            <Lock className="absolute left-3.5 text-gray-400 w-4 h-4" />
            <input
              type={verSenha ? "text" : "password"}
              required
              value={confirmPassword}
              onChange={(e) => confirmSetPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-700 dark:text-gray-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-medium"
            />
          </div>
        </div>

        {status && (
          <div
            className={`p-3 border rounded-xl text-xs font-medium flex items-center gap-2 ${
              status.type === "success"
                ? "bg-green-50 dark:bg-green-950/30 border-green-100 dark:border-green-900/40 text-green-700 dark:text-green-400"
                : "bg-red-50 dark:bg-red-950/30 border-red-100 dark:border-red-900/40 text-red-700 dark:text-red-400"
            }`}
          >
            {status.type === "success" && (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            )}
            <span>{status.msg}</span>
          </div>
        )}

        <div className="pt-2">
          <button
            type="submit"
            className={`w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider py-3 rounded-xl transition-all shadow-sm hover:shadow-md cursor-pointer ${
              isLoading
                ? "opacity-60 cursor-not-allowed"
                : "active:scale-[0.99]"
            }`}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Redefinir Credencial"
            )}
          </button>
        </div>
      </form>

      <div className="relative flex py-1 items-center">
        <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
      </div>

      <div className="text-center text-xs">
        <Link
          href="/login"
          className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline transition-colors"
        >
          Voltar para o Login
        </Link>
      </div>
    </div>
  );
}

export default function ResetPassword() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4 transition-colors">
      <Suspense
        fallback={
          <div className="flex flex-col items-center gap-3 text-xs text-gray-500 font-bold uppercase tracking-wider">
            <Loader2 className="w-7 h-7 animate-spin text-emerald-600 dark:text-emerald-400" />{" "}
            Verificando chaves operacionais...
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
