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
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null);

  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    const id = `${Date.now()}-${Math.random()}`;
    const notification: Notification = { id, message, type };

    setNotifications((prev) => [...prev, notification]);

    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 3000);
  }, []);

  const showConfirm = useCallback((message: string, onConfirm: () => void) => {
    setConfirmModal({ message, onConfirm });
  }, []);

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
        return <IoCheckmarkCircle size={20} className="text-green-500 flex-shrink-0" />;
      case 'error':
        return <IoCloseCircle size={20} className="text-red-500 flex-shrink-0" />;
      case 'warning':
        return <IoWarning size={20} className="text-yellow-500 flex-shrink-0" />;
      default:
        return <IoInformationCircle size={20} className="text-blue-500 flex-shrink-0" />;
    }
  };

  return (
    <NotificationContext.Provider value={{ showNotification, showConfirm }}>
      {children}

      {}
      <div className="fixed top-32 md:top-24 left-0 right-0 z-[10000] flex flex-col items-center gap-2 px-4 pointer-events-none">
        <AnimatePresence>
          {notifications.map((notification) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="bg-black text-white px-4 py-3 rounded-lg shadow-2xl flex items-center gap-3 max-w-md w-full pointer-events-auto"
            >
              {getIcon(notification.type)}
              <span className="font-poppins text-sm flex-1">{notification.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {}
      <AnimatePresence>
        {confirmModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-[10001] flex items-center justify-center p-4"
            onClick={handleCancel}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-black text-white rounded-lg p-6 max-w-sm w-full shadow-2xl"
            >
              <p className="font-poppins text-base mb-6">{confirmModal.message}</p>
              <div className="flex gap-3">
                <button
                  onClick={handleCancel}
                  className="flex-1 bg-gray-800 text-white font-poppins py-2.5 rounded hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 bg-white text-black font-poppins py-2.5 rounded hover:bg-gray-200 transition-colors"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </NotificationContext.Provider>
  );
};

