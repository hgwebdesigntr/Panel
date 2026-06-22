"use client";

import { createContext, useContext, useState } from "react";

export interface AppSettings {
  companyName: string;
  logoBase64: string;
  faviconBase64: string;
}

interface SettingsContextValue {
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;
}

const defaultSettings: AppSettings = {
  companyName: "",
  logoBase64: "",
  faviconBase64: "",
};

const SettingsContext = createContext<SettingsContextValue>({
  settings: defaultSettings,
  updateSettings: () => {},
});

export function useSettings() {
  return useContext(SettingsContext).settings;
}

export function useUpdateSettings() {
  return useContext(SettingsContext).updateSettings;
}

export function SettingsProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: AppSettings;
}) {
  const [settings, setSettings] = useState<AppSettings>(value);

  const updateSettings = (patch: Partial<AppSettings>) =>
    setSettings((prev) => ({ ...prev, ...patch }));

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}
