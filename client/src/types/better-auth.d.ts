import { auth } from "@/auth";

declare module "better-auth" {
  interface User {
    role?: string;
  }
}
