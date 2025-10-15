'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

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
  const [openModals, setOpenModals] = useState<Set<string>>(new Set());

  const isAnyModalOpen = openModals.size > 0;

  const addModal = useCallback((modalId: string) => {
    setOpenModals(prev => {
      const newSet = new Set(prev);
      newSet.add(modalId);
      return newSet;
    });
  }, []);

  const removeModal = useCallback((modalId: string) => {
    setOpenModals(prev => {
      const newSet = new Set(prev);
      newSet.delete(modalId);
      return newSet;
    });
  }, []);

  const setAnyModalOpen = useCallback((isOpen: boolean) => {

  }, []);

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
