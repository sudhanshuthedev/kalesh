'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ModalContextType {
  isAnyModalOpen: boolean;
  setAnyModalOpen: (isOpen: boolean) => void;
  openModals: Set<string>;
  addModal: (modalId: string) => void;
  removeModal: (modalId: string) => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const useModal = () => {
  const context = useContext(ModalContext);
  if (context === undefined) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};

interface ModalProviderProps {
  children: ReactNode;
}

export const ModalProvider: React.FC<ModalProviderProps> = ({ children }) => {
  const [isAnyModalOpen, setAnyModalOpen] = useState(false);
  const [openModals, setOpenModals] = useState<Set<string>>(new Set());

  const addModal = (modalId: string) => {
    setOpenModals(prev => {
      const newSet = new Set(prev);
      newSet.add(modalId);
      setAnyModalOpen(newSet.size > 0);
      return newSet;
    });
  };

  const removeModal = (modalId: string) => {
    setOpenModals(prev => {
      const newSet = new Set(prev);
      newSet.delete(modalId);
      setAnyModalOpen(newSet.size > 0);
      return newSet;
    });
  };

  return (
    <ModalContext.Provider
      value={{
        isAnyModalOpen,
        setAnyModalOpen,
        openModals,
        addModal,
        removeModal,
      }}
    >
      {children}
    </ModalContext.Provider>
  );
};
