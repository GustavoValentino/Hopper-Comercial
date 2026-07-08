"use client";

import React, { useState } from "react";
import { signUp, signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import Image from "next/image";
import {
  UserPlus,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  MailCheck,
} from "lucide-react";

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verSenha, setVerSenha] = useState(false);
  const [emailEnviado, setEmailEnviado] = useState("");

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    setSucesso(false);

    if (!name || !email || !password) {
      setErro("Por favor, preencha todos os campos.");
      return;
    }

    if (password.length < 8) {
      setErro("A senha deve ter no mínimo 8 caracteres.");
      return;
    }

    try {
      setLoading(true);

      const response = await signUp.email({ email, password, name });

      if (response?.error) {
        setErro(response.error.message || "Erro ao criar conta.");
        setLoading(false);
        return;
      }

      const emailCadastrado = email;
      setEmailEnviado(emailCadastrado);
      setSucesso(true);
      setLoading(false);

      (async () => {
        try {
          await signOut();
        } catch (signOutErr) {
          console.warn("signOut ignorado:", signOutErr);
        }

        if (response?.data?.user) {
          const user = response.data.user;
          try {
            await fetch(
              "http://localhost:3001/api/auth/send-verification-email",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  userId: user.id,
                  email: user.email,
                  name: user.name,
                }),
              },
            );
          } catch (emailErr) {
            console.error("Erro ao disparar email:", emailErr);
          }
        }
      })();

      setTimeout(() => {
        router.push("/login");
      }, 8000);
    } catch (err: any) {
      setLoading(false);
      setErro("Ocorreu um erro inesperado.");
      toast.error("Erro no cadastro", {
        description: "Tente novamente mais tarde.",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 transition-colors">
      {sucesso && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            backgroundColor: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "24rem",
              borderRadius: "1rem",
              padding: "2rem",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
            }}
            className="bg-white dark:bg-gray-800"
          >
            <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border-4 border-emerald-100 dark:border-emerald-900/50 flex items-center justify-center mb-5">
              <MailCheck className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            </div>

            <h2 className="text-base font-black text-gray-900 dark:text-gray-100 mb-1">
              Verifique seu e-mail
            </h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed mb-4">
              Enviamos um link de confirmação para o endereço abaixo.
              <br />
              Clique nele para ativar sua conta.
            </p>

            <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-full px-4 py-1.5 mb-6">
              <Mail className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 truncate max-w-[220px]">
                {emailEnviado}
              </span>
            </div>

            <div className="w-full flex flex-col gap-2 mb-6">
              {[
                "Abra sua caixa de entrada",
                "Localize o e-mail do Hopper",
                "Clique em Confirmar cadastro para ativar sua conta",
              ].map((step, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700/60 rounded-xl px-3 py-2.5 text-left"
                >
                  <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-black flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug">
                    {step}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 mb-5">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span className="text-[10px]">
                Redirecionando para o login em instantes...
              </span>
            </div>

            <button
              onClick={() => router.push("/login")}
              className="w-full flex items-center justify-center gap-2 border border-gray-200 dark:border-gray-700 rounded-xl py-2.5 text-xs font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-700 dark:hover:text-gray-200 transition-all cursor-pointer"
            >
              Ir para o login agora
            </button>
          </div>
        </div>
      )}

      {/* ── Card de cadastro ── */}
      <div className="w-full max-w-md bg-white dark:bg-gray-800 shadow-[0_4px_20px_rgb(0,0,0,0.02)] rounded-2xl border border-gray-100 dark:border-gray-700/60 p-8 space-y-6">
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2.5">
            <Image
              src="https://res.cloudinary.com/rz9e24ny/image/upload/v1783305928/hopper_icon_tight_hvpesz.svg"
              alt="Hopper logo"
              width={36}
              height={36}
              className="shrink-0 object-contain"
              unoptimized
            />
            <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">
              Hopper
            </h1>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Crie sua conta de colaborador para acessar o sistema.
          </p>
        </div>

        {erro && (
          <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40 rounded-xl flex gap-2 items-center text-red-700 dark:text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="text-xs font-medium">{erro}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Nome Completo
            </label>
            <div className="relative flex items-center">
              <User className="absolute left-3.5 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome completo"
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-700 dark:text-gray-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-medium"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              E-mail
            </label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3.5 text-gray-400 w-4 h-4" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@gmail.com"
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-700 dark:text-gray-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-medium"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Senha
            </label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3.5 text-gray-400 w-4 h-4" />
              <input
                type={verSenha ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="w-full pl-10 pr-10 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-700 dark:text-gray-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-medium"
                required
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

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className={`w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider py-3 rounded-xl transition-all shadow-sm hover:shadow-md cursor-pointer ${loading ? "opacity-60 cursor-not-allowed" : "active:scale-[0.99]"}`}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              {loading ? "Cadastrando..." : "Concluir Cadastro"}
            </button>
          </div>

          <div className="text-center text-xs pt-2">
            <span className="text-gray-500 dark:text-gray-400">
              Já possui uma conta?{" "}
            </span>
            <Link
              href="/login"
              className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              Fazer Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
