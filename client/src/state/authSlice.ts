import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { User } from "@/state/api";

export type UserSession = Omit<User, "createdAt" | "criticalProductsCount"> & {
  createdAt?: string | Date;
  criticalProductsCount?: number;
};

interface AuthState {
  user: UserSession | null;
  isAuthenticated: boolean;
}

const userInicial =
  typeof window !== "undefined" ? localStorage.getItem("braincore_user") : null;

const initialState: AuthState = {
  user: userInicial ? JSON.parse(userInicial) : null,
  isAuthenticated: !!userInicial,
};

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<{ user: UserSession }>) => {
      const { user } = action.payload;
      state.user = user;
      state.isAuthenticated = true;

      if (typeof window !== "undefined") {
        localStorage.setItem("braincore_user", JSON.stringify(user));
      }
    },

    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;

      if (typeof window !== "undefined") {
        localStorage.removeItem("braincore_user");
      }
    },

    updateUserMetadata: (
      state,
      action: PayloadAction<Partial<UserSession>>,
    ) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        if (typeof window !== "undefined") {
          localStorage.setItem("braincore_user", JSON.stringify(state.user));
        }
      }
    },
  },
});

export const { setCredentials, logout, updateUserMetadata } = authSlice.actions;
export default authSlice.reducer;
