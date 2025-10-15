'use client';

import React, { useState, useEffect } from 'react';
import { useModal } from '@/contexts/ModalContext';
import { motion, AnimatePresence } from 'framer-motion';
import { IoClose, IoWarning } from 'react-icons/io5';
import { videoAPI } from '@/lib/api';

interface DeleteVideoModalProps {
  videoId: string;
  videoTitle: string;
  onClose: () => void;
  onDelete: () => void;
}

const DeleteVideoModal: React.FC<DeleteVideoModalProps> = ({
  videoId,
  videoTitle,
  onClose,
  onDelete
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const { addModal, removeModal } = useModal();

  useEffect(() => {
    addModal('delete-video-modal');

    return () => {
      removeModal('delete-video-modal');
    };
  }, [addModal, removeModal]);

  const handleDelete = async () => {
    setError('');
    setIsDeleting(true);

    try {
      await videoAPI.deleteVideo(videoId);

      setTimeout(() => {
        onDelete();
        onClose();
      }, 300);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to delete video';
      setError(errorMessage);
      setIsDeleting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-80 z-[100] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="bg-app-gray w-full max-w-md p-6 md:p-8 relative"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:text-gray-400 transition-colors"
            disabled={isDeleting}
          >
            <IoClose size={24} />
          </button>

          <div className="flex items-center gap-3 mb-4">
            <IoWarning size={32} className="text-red-500" />
            <h2 className="text-white font-poppins text-xl md:text-2xl font-bold">
              Delete Video?
            </h2>
          </div>

          <p className="text-gray-300 font-poppins mb-2">
            Are you sure you want to delete this video?
          </p>

          <p className="text-white font-poppins font-semibold mb-4 line-clamp-2">
            "{videoTitle}"
          </p>

          <p className="text-gray-400 font-poppins text-sm mb-6">
            This action cannot be undone. The video will be permanently removed from the platform.
          </p>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500 bg-opacity-10 border border-red-500 text-red-500 px-4 py-3 mb-4 font-poppins text-sm"
            >
              {error}
            </motion.div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 bg-gray-700 text-white py-3 font-poppins font-semibold hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex-1 bg-red-600 text-white py-3 font-poppins font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default DeleteVideoModal;

