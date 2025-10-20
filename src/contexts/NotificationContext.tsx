'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IoCheckmarkCircle, IoCloseCircle, IoInformationCircle, IoWarning } from 'react-icons/io5';

interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface NotificationContextType {
  showNotification: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  showConfirm: (message: string, onConfirm: () => void) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notification, setNotification] = useState<Notification | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null);

  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    const id = `${Date.now()}-${Math.random()}`;
    const newNotification: Notification = { id, message, type };
    setNotification(newNotification);
  }, []);

  const showConfirm = useCallback((message: string, onConfirm: () => void) => {
    setConfirmModal({ message, onConfirm });
  }, []);

  const handleNotificationClose = () => {
    setNotification(null);
  };

  const handleConfirm = () => {
    if (confirmModal) {
      confirmModal.onConfirm();
      setConfirmModal(null);
    }
  };

  const handleCancel = () => {
    setConfirmModal(null);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <IoCheckmarkCircle size={28} className="text-green-500" />;
      case 'error':
        return <IoCloseCircle size={28} className="text-red-500" />;
      case 'warning':
        return <IoWarning size={28} className="text-yellow-500" />;
      default:
        return <IoInformationCircle size={28} className="text-blue-500" />;
    }
  };

  return (
    <NotificationContext.Provider value={{ showNotification, showConfirm }}>
      {children}

      {}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
            onClick={handleNotificationClose}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-app-gray rounded-lg p-6 w-[300px] shadow-2xl border border-white/10"
            >
              {}
              <div className="flex flex-col items-center text-center">
                {}
                <div className="mb-4">
                  {getIcon(notification.type)}
                </div>

                {}
                <p className="text-white font-poppins text-sm mb-6 leading-relaxed px-2">
                  {notification.message}
                </p>

                {}
                <button
                  onClick={handleNotificationClose}
                  className="w-full bg-white text-black font-poppins font-medium py-2 rounded-md hover:bg-gray-200 active:scale-95 transition-all text-sm"
                >
                  Okay
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {}
      <AnimatePresence>
        {confirmModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[201] flex items-center justify-center p-4"
            onClick={handleCancel}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-app-gray rounded-lg p-6 w-[300px] shadow-2xl border border-white/10"
            >
              <div className="flex flex-col items-center text-center">
                {}
                <div className="mb-4">
                  <IoWarning size={28} className="text-yellow-500" />
                </div>

                {}
                <p className="text-white font-poppins text-sm mb-6 leading-relaxed px-2">
                  {confirmModal.message}
                </p>

                {}
                <div className="flex gap-2 w-full">
                  <button
                    onClick={handleCancel}
                    className="flex-1 bg-gray-700 text-white font-poppins font-medium py-2 rounded-md hover:bg-gray-600 active:scale-95 transition-all text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirm}
                    className="flex-1 bg-white text-black font-poppins font-medium py-2 rounded-md hover:bg-gray-200 active:scale-95 transition-all text-sm"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </NotificationContext.Provider>
  );
};

