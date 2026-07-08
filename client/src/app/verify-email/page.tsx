"use client";

import { useEffect, useState, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";

const VerifyEmailContent = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );

  const hasFetched = useRef(false);

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setStatus("error");
      return;
    }

    if (hasFetched.current) return;
    hasFetched.current = true;

    fetch(`http://localhost:3001/api/auth/verify-email?token=${token}`, {
      method: "GET",

      redirect: "follow",
    })
      .then((res) => {
        if (res.ok || res.redirected) {
          setStatus("success");
          setTimeout(() => router.push("/login?verified=true"), 3000);
        } else {
          setStatus("error");
        }
      })
      .catch((err) => {
        console.error("Erro na validação do token:", err);
        setStatus("error");
      });
  }, [searchParams, router]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #f0faf4 0%, #ffffff 100%)",
        fontFamily: "'Segoe UI', Arial, sans-serif",
      }}
    >
      <div
        style={{
          textAlign: "center",
          padding: "48px 40px",
          background: "#ffffff",
          borderRadius: "20px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
          maxWidth: "420px",
          width: "90%",
        }}
      >
        {status === "loading" && (
          <>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>⏳</div>
            <h2
              style={{
                color: "#1a202c",
                fontSize: "20px",
                marginBottom: "8px",
              }}
            >
              Verificando seu e-mail...
            </h2>
            <p style={{ color: "#718096", fontSize: "14px" }}>
              Aguarde um momento, cruzando dados de segurança.
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <div style={{ fontSize: "56px", marginBottom: "16px" }}>✅</div>
            <h2
              style={{
                color: "#006938",
                fontSize: "22px",
                fontWeight: 700,
                marginBottom: "8px",
              }}
            >
              Autenticação Concluída
            </h2>
            <p style={{ color: "#4a5568", fontSize: "14px", lineHeight: 1.6 }}>
              Sua conta operacional foi ativada com sucesso.
              <br />
              Estabelecendo conexão com o portal de acesso...
            </p>
            <div
              style={{
                marginTop: "24px",
                height: "4px",
                background: "#edf2f7",
                borderRadius: "2px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  background: "linear-gradient(90deg, #006938, #00a855)",
                  borderRadius: "2px",
                  animation: "progress 3s linear forwards",
                }}
              />
            </div>
          </>
        )}

        {status === "error" && (
          <>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>❌</div>
            <h2
              style={{
                color: "#c53030",
                fontSize: "20px",
                fontWeight: 700,
                marginBottom: "8px",
              }}
            >
              Validação Expirada ou Incorreta
            </h2>
            <p style={{ color: "#718096", fontSize: "14px", lineHeight: 1.6 }}>
              O token de verificação perdeu a validade ou já foi consumido pelo
              sistema.
              <br />
              Acesse sua conta para solicitar uma nova emissão de credencial.
            </p>
            <button
              onClick={() => router.push("/login")}
              style={{
                marginTop: "24px",
                background: "linear-gradient(135deg, #006938 0%, #00a855 100%)",
                color: "#fff",
                border: "none",
                borderRadius: "10px",
                padding: "12px 28px",
                fontSize: "14px",
                fontWeight: 700,
                cursor: "pointer",
                letterSpacing: "0.5px",
                transition: "transform 0.1s ease",
              }}
              onMouseDown={(e) =>
                (e.currentTarget.style.transform = "scale(0.96)")
              }
              onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
              onMouseLeave={(e) =>
                (e.currentTarget.style.transform = "scale(1)")
              }
            >
              Retornar ao Login
            </button>
          </>
        )}
      </div>

      <style>{`
        @keyframes progress {
          from { width: 0% }
          to { width: 100% }
        }
      `}</style>
    </div>
  );
};

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  );
}
