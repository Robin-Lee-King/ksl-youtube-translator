import { createContext, useContext, useState, type ReactNode } from "react";

export type ModalType = "info" | "profile" | "new-group" | "add-group" | "find-id" | "find-pw" | "signup";

export interface ModalState<T = unknown> {
  type: ModalType;
  arg?: T;
}

interface ModalContextValue {
  modal: ModalState | null;
  openModal: <T>(type: ModalType, arg?: T) => void;
  closeModal: () => void;
}

const ModalCtx = createContext<ModalContextValue | null>(null);

export function ModalProvider({ children }: { children: ReactNode }) {
  const [modal, setModal] = useState<ModalState | null>(null);

  const value: ModalContextValue = {
    modal,
    openModal: (type, arg) => setModal({ type, arg }),
    closeModal: () => setModal(null),
  };

  return <ModalCtx.Provider value={value}>{children}</ModalCtx.Provider>;
}

export function useModal(): ModalContextValue {
  const ctx = useContext(ModalCtx);
  if (!ctx) throw new Error("useModal must be used within ModalProvider");
  return ctx;
}
