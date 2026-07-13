import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  // O cliente DEVE apontar para o seu backend no Render
  baseURL:
    process.env.NEXT_PUBLIC_API_URL || "https://hopper-comercial.onrender.com",

  fetchOptions: {
    credentials: "include",
  },
});

export const { signIn, signUp, signOut, useSession } = authClient;
