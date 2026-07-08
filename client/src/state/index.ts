import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { User } from "@/state/api";

export interface InitialStateTypes {
  isSidebarCollapsed: boolean;
  isDarkMode: boolean;
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
}

const tokenInicial =
  typeof window !== "undefined"
    ? localStorage.getItem("braincore_token")
    : null;
const userInicial =
  typeof window !== "undefined" ? localStorage.getItem("braincore_user") : null;

const initialState: InitialStateTypes = {
  isSidebarCollapsed: false,
  isDarkMode: false,
  token: tokenInicial,
  user: userInicial ? JSON.parse(userInicial) : null,
  isAuthenticated: !!tokenInicial,
};

export const globalSlice = createSlice({
  name: "global",
  initialState,
  reducers: {
    // Reducers originais de Layout
    setIsSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.isSidebarCollapsed = action.payload;
    },
    setIsDarkMode: (state, action: PayloadAction<boolean>) => {
      state.isDarkMode = action.payload;
    },

    setCredentials: (
      state,
      action: PayloadAction<{ token: string; user: User }>,
    ) => {
      const { token, user } = action.payload;
      state.token = token;
      state.user = user;
      state.isAuthenticated = true;

      if (typeof window !== "undefined") {
        localStorage.setItem("braincore_token", token);
        localStorage.setItem("braincore_user", JSON.stringify(user));
      }
    },

    updateUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      // Sincroniza o localStorage para manter as alterações após o F5
      if (typeof window !== "undefined") {
        localStorage.setItem("braincore_user", JSON.stringify(action.payload));
      }
    },

    logout: (state) => {
      state.token = null;
      state.user = null;
      state.isAuthenticated = false;

      if (typeof window !== "undefined") {
        localStorage.removeItem("braincore_token");
        localStorage.removeItem("braincore_user");
      }
    },
  },
});

export const {
  setIsSidebarCollapsed,
  setIsDarkMode,
  setCredentials,
  updateUser,
  logout,
} = globalSlice.actions;

export default globalSlice.reducer;
