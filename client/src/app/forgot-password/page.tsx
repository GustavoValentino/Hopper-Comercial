"use client";

import React, { useState, FormEvent, useCallback } from "react";
import { Mail, ArrowLeft, CheckCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isEnviado, setIsEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setIsLoading(true);
      setError(null);

      try {
        // Dica: Em um ambiente de produção, substitua localhost por uma variável de ambiente (ex: process.env.NEXT_PUBLIC_API_URL)
        const response = await fetch(
          "http://localhost:3001/api/auth/forgot-password",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          },
        );

        if (response.ok) {
          setIsEnviado(true);
        } else {
          const data = await response.json();
          setError(
            data.error ||
              "Ocorreu um erro operacional ao processar a solicitação.",
          );
        }
      } catch (err) {
        setError("Falha de comunicação com o servidor de inventário.");
      } finally {
        setIsLoading(false);
      }
    },
    [email],
  );

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 transition-colors">
      <section
        aria-labelledby="forgot-password-heading"
        className="w-full max-w-md bg-white dark:bg-gray-800 shadow-[0_4px_20px_rgb(0,0,0,0.02)] rounded-2xl border border-gray-100 dark:border-gray-700/60 p-8 space-y-6"
      >
        {!isEnviado ? (
          <>
            <header className="text-center space-y-3">
              <div className="flex items-center justify-center gap-2.5">
                <Image
                  src="https://res.cloudinary.com/ds3pzejhd/image/upload/v1782679376/hopper_icon_tight_q1zomt.svg"
                  alt="Logotipo da plataforma Hopper"
                  width={36}
                  height={36}
                  className="shrink-0 object-contain"
                  unoptimized
                />
                <h1
                  id="forgot-password-heading"
                  className="text-2xl font-black tracking-tight text-gray-900 dark:text-white"
                >
                  Hopper
                </h1>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Recuperação de credencial de acesso
              </p>
            </header>

            {error && (
              <div
                role="alert"
                aria-live="assertive"
                className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40 rounded-xl flex gap-2 items-center text-red-700 dark:text-red-400"
              >
                <span className="text-xs font-medium">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="email-input"
                  className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide"
                >
                  E-mail
                </label>
                <div className="relative">
                  <input
                    id="email-input"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="usuario@gmail.com"
                    aria-invalid={!!error}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-700 dark:text-gray-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-medium"
                  />
                  <Mail
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4"
                    aria-hidden="true"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  aria-busy={isLoading}
                  className={`w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider py-3 rounded-xl transition-all shadow-sm hover:shadow-md cursor-pointer ${
                    isLoading
                      ? "opacity-60 cursor-not-allowed"
                      : "active:scale-[0.99]"
                  }`}
                >
                  {isLoading ? (
                    <>
                      <Loader2
                        className="w-4 h-4 animate-spin"
                        aria-hidden="true"
                      />
                      <span className="sr-only">
                        Processando solicitação...
                      </span>
                    </>
                  ) : (
                    "Enviar"
                  )}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div
            role="status"
            aria-live="polite"
            className="text-center py-4 space-y-3 animate-in fade-in zoom-in-95 duration-200"
          >
            <CheckCircle
              className="w-12 h-12 text-emerald-500 mx-auto"
              aria-hidden="true"
            />
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
              Verifique seu e-mail
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mx-auto leading-relaxed">
              As instruções operacionais de redefinição foram disparadas e
              chegarão na sua caixa de entrada em instantes.
            </p>
          </div>
        )}

        <div className="relative flex py-1 items-center" aria-hidden="true">
          <div className="flex-grow border-t border-gray-200 dark:border-gray-700" />
        </div>

        <nav className="text-center text-xs">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400 hover:underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 rounded-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            Voltar para o Login
          </Link>
        </nav>
      </section>
    </main>
  );
}
