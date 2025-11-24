"use client";

import { createContext, useContext, useState, ReactNode } from "react";

type SheetContextType = {
  isSheetOpen: boolean;
  setIsSheetOpen: (open: boolean) => void;
  isKeyboardVisible: boolean;
  setIsKeyboardVisible: (visible: boolean) => void;
};

const SheetContext = createContext<SheetContextType | undefined>(undefined);

export function SheetProvider({ children }: { children: ReactNode }) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  return (
    <SheetContext.Provider value={{
      isSheetOpen,
      setIsSheetOpen,
      isKeyboardVisible,
      setIsKeyboardVisible
    }}>
      {children}
    </SheetContext.Provider>
  );
}

export function useSheet() {
  const context = useContext(SheetContext);
  if (context === undefined) {
    throw new Error("useSheet must be used within a SheetProvider");
  }
  return context;
}
