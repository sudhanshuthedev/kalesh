'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IoClose, IoHeartSharp, IoHeartOutline, IoPersonCircleOutline, IoSendSharp, IoTrashOutline, IoFlagOutline } from 'react-icons/io5';
import { Comment } from '@/types';
import { commentAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useModal } from '@/contexts/ModalContext';

interface CommentsModalProps {
  videoId: string;
  isOpen: boolean;
  onClose: () => void;
}

const CommentsModal: React.FC<CommentsModalProps> = ({ videoId, isOpen, onClose }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [showReportModal, setShowReportModal] = useState<{ type: 'video' | 'comment', id: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { isAuthenticated, user } = useAuth();
  const { addModal, removeModal } = useModal();

  useEffect(() => {
    if (isOpen && videoId) {
      loadComments();
    }
  }, [isOpen, videoId]);

  useEffect(() => {
    if (isOpen) {
      addModal(`comments-${videoId}`);
    } else {
      removeModal(`comments-${videoId}`);
    }

    return () => {
      if (isOpen) {
        removeModal(`comments-${videoId}`);
      }
    };
  }, [isOpen, videoId, addModal, removeModal]);

  const loadComments = async () => {
    try {
      setIsLoading(true);
      const response = await commentAPI.getVideoComments(videoId);
      if (response.status === 'success' && response.data?.comments) {
        setComments(response.data.comments);
      }
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !isAuthenticated) return;

    const newCommentText = commentText;
    const isReply = !!replyingTo;

    const tempComment: Comment = {
      id: `temp-${Date.now()}`,
      video_id: videoId,
      user_id: user?.id || '',
      text: newCommentText,
      username: user?.username || '',
      created_at: new Date().toISOString(),
      likes: 0,
      is_liked: false,
      replies: []
    };

    if (isReply && replyingTo) {

      setComments(prevComments =>
        prevComments.map(comment =>
          comment.id === replyingTo.id
            ? { ...comment, replies: [...(comment.replies || []), tempComment] }
            : comment
        )
      );
    } else {

      setComments(prevComments => [tempComment, ...prevComments]);
    }

    setCommentText('');
    setReplyingTo(null);

    try {
      if (isReply) {
        await commentAPI.replyToComment(videoId, replyingTo.id, newCommentText);
      } else {
        await commentAPI.createComment(videoId, newCommentText);
      }

      loadComments();
    } catch (error) {
      console.error('Failed to post comment:', error);

      if (isReply && replyingTo) {
        setComments(prevComments =>
          prevComments.map(comment =>
            comment.id === replyingTo.id
              ? { ...comment, replies: (comment.replies || []).filter(reply => reply.id !== tempComment.id) }
              : comment
          )
        );
      } else {
        setComments(prevComments => prevComments.filter(comment => comment.id !== tempComment.id));
      }
      alert('Failed to post comment. Please try again.');
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!isAuthenticated) {
      alert('Please login to like comments');
      return;
    }

    setComments(prevComments => {
      const updateCommentLikes = (comments: Comment[]): Comment[] => {
        return comments.map(comment => {
          if (comment.id === commentId) {
            const isCurrentlyLiked = comment.is_liked;
            return {
              ...comment,
              is_liked: !isCurrentlyLiked,
              likes: isCurrentlyLiked ? comment.likes - 1 : comment.likes + 1
            };
          }
          if (comment.replies && comment.replies.length > 0) {
            return {
              ...comment,
              replies: updateCommentLikes(comment.replies)
            };
          }
          return comment;
        });
      };
      return updateCommentLikes(prevComments);
    });

    try {
      await commentAPI.likeComment(commentId);
    } catch (error) {
      console.error('Failed to like comment:', error);

      setComments(prevComments => {
        const revertCommentLikes = (comments: Comment[]): Comment[] => {
          return comments.map(comment => {
            if (comment.id === commentId) {
              const isCurrentlyLiked = comment.is_liked;
              return {
                ...comment,
                is_liked: !isCurrentlyLiked,
                likes: isCurrentlyLiked ? comment.likes - 1 : comment.likes + 1
              };
            }
            if (comment.replies && comment.replies.length > 0) {
              return {
                ...comment,
                replies: revertCommentLikes(comment.replies)
              };
            }
            return comment;
          });
        };
        return revertCommentLikes(prevComments);
      });
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    setComments(prevComments => {
      const removeComment = (comments: Comment[]): Comment[] => {
        return comments.filter(comment => {
          if (comment.id === commentId) {
            return false;
          }
          if (comment.replies && comment.replies.length > 0) {
            comment.replies = removeComment(comment.replies);
          }
          return true;
        });
      };
      return removeComment(prevComments);
    });

    try {
      await commentAPI.deleteComment(commentId);
    } catch (error) {
      console.error('Failed to delete comment:', error);

      loadComments();
      alert('Failed to delete comment');
    }
  };

  const handleReply = (comment: Comment) => {
    setReplyingTo(comment);
    inputRef.current?.focus();
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `${weeks}w`;
    const months = Math.floor(days / 30);
    return `${months}mo`;
  };

  const renderComment = (comment: Comment, isReply = false) => (
    <div key={comment.id} className={`${isReply ? 'ml-10 mt-2' : 'mb-4'}`}>
      <div className="flex gap-2">
        <IoPersonCircleOutline size={isReply ? 28 : 32} className="text-gray-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-poppins font-semibold text-sm text-white">{comment.username}</span>
            <span className="font-poppins text-xs text-gray-500">{formatTimeAgo(comment.created_at)}</span>
          </div>
          <p className="font-poppins text-sm text-white mb-2 break-words">{comment.text}</p>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => handleLikeComment(comment.id)}
              className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
            >
              {comment.is_liked ? (
                <IoHeartSharp size={16} className="text-red-500" />
              ) : (
                <IoHeartOutline size={16} />
              )}
              {comment.likes > 0 && (
                <span className="font-poppins text-xs">{comment.likes}</span>
              )}
            </button>
            {!isReply && (
              <button
                type="button"
                onClick={() => handleReply(comment)}
                className="font-poppins text-xs text-gray-400 hover:text-white transition-colors"
              >
                Reply
              </button>
            )}
            {user?.username === comment.username && (
              <button
                type="button"
                onClick={() => handleDeleteComment(comment.id)}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                <IoTrashOutline size={16} />
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowReportModal({ type: 'comment', id: comment.id })}
              className="text-gray-400 hover:text-yellow-500 transition-colors"
            >
              <IoFlagOutline size={16} />
            </button>
          </div>
        </div>
      </div>
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-2">
          {comment.replies.map(reply => renderComment(reply, true))}
        </div>
      )}
    </div>
  );

  if (!isOpen) return null;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/70 md:hidden"
              style={{
                pointerEvents: 'auto',
                zIndex: 9998
              }}
            />

            {}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="md:hidden fixed left-0 right-0 bottom-0 h-[75vh] bg-app-gray rounded-t-3xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              style={{
                pointerEvents: 'auto',
                zIndex: 9999,
                touchAction: 'auto'
              }}
            >
              {}
              <div className="w-full flex justify-center pt-2 pb-3">
                <div className="w-12 h-1 bg-gray-600 rounded-full" />
              </div>

              {}
              <div className="flex items-center justify-between px-4 pb-3 border-b border-gray-700">
                <h2 className="font-poppins font-semibold text-white text-lg">Comments</h2>
                <button onClick={onClose} className="text-gray-400 hover:text-white">
                  <IoClose size={24} />
                </button>
              </div>

              {}
              <div className="flex-1 overflow-y-auto px-4 py-4">
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-8 h-8 border-2 border-white border-t-transparent rounded-full"
                    />
                  </div>
                ) : comments.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="font-poppins text-gray-400">No comments yet. Be the first!</p>
                  </div>
                ) : (
                  comments.map(comment => renderComment(comment))
                )}
              </div>

              {}
              {isAuthenticated ? (
                <div
                  className="border-t border-gray-700 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-app-gray"
                  style={{
                    position: 'sticky',
                    bottom: 0,
                    zIndex: 10000,
                    pointerEvents: 'auto',
                    touchAction: 'auto'
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                >
                  {replyingTo && (
                    <div className="flex items-center justify-between mb-2 bg-gray-800 px-3 py-2 rounded">
                      <span className="font-poppins text-xs text-gray-400">
                        Replying to @{replyingTo.username}
                      </span>
                      <button
                        onClick={() => setReplyingTo(null)}
                        className="text-gray-400 hover:text-white"
                        type="button"
                      >
                        <IoClose size={16} />
                      </button>
                    </div>
                  )}
                  <form
                    onSubmit={handleSubmitComment}
                    className="flex gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      ref={inputRef}
                      type="text"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Add a comment..."
                      className="flex-1 bg-gray-800 text-white font-poppins text-base px-4 py-2.5 rounded-full focus:outline-none focus:ring-2 focus:ring-white/20"
                      maxLength={1000}
                      autoComplete="off"
                      inputMode="text"
                      enterKeyHint="send"
                      style={{
                        fontSize: '16px',
                        pointerEvents: 'auto',
                        touchAction: 'manipulation'
                      }}
                    />
                    <button
                      type="submit"
                      disabled={!commentText.trim()}
                      onMouseDown={(e) => e.preventDefault()}
                      onTouchStart={(e) => e.preventDefault()}
                      className="bg-white text-black p-2 rounded-full disabled:opacity-30 disabled:cursor-not-allowed active:scale-90 transition-transform flex-shrink-0"
                      style={{
                        pointerEvents: 'auto',
                        touchAction: 'manipulation'
                      }}
                    >
                      <IoSendSharp size={20} />
                    </button>
                  </form>
                </div>
              ) : (
                <div className="border-t border-gray-700 p-4 text-center">
                  <p className="font-poppins text-gray-400 text-sm">Login to comment</p>
                </div>
              )}
            </motion.div>

            {}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="hidden md:flex fixed top-14 right-0 bottom-0 w-[400px] bg-app-gray flex-col shadow-2xl"
              style={{
                zIndex: 9999,
                pointerEvents: 'auto'
              }}
            >
              {}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
                <h2 className="font-poppins font-semibold text-white text-xl">Comments</h2>
                <button onClick={onClose} className="text-gray-400 hover:text-white">
                  <IoClose size={28} />
                </button>
              </div>

              {}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-8 h-8 border-2 border-white border-t-transparent rounded-full"
                    />
                  </div>
                ) : comments.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="font-poppins text-gray-400">No comments yet. Be the first!</p>
                  </div>
                ) : (
                  comments.map(comment => renderComment(comment))
                )}
              </div>

              {}
              {isAuthenticated ? (
                <div
                  className="border-t border-gray-700 p-6"
                  style={{
                    pointerEvents: 'auto',
                    zIndex: 10000
                  }}
                >
                  {replyingTo && (
                    <div className="flex items-center justify-between mb-3 bg-gray-800 px-3 py-2 rounded">
                      <span className="font-poppins text-sm text-gray-400">
                        Replying to @{replyingTo.username}
                      </span>
                      <button
                        onClick={() => setReplyingTo(null)}
                        className="text-gray-400 hover:text-white"
                        type="button"
                      >
                        <IoClose size={18} />
                      </button>
                    </div>
                  )}
                  <form onSubmit={handleSubmitComment} className="flex gap-3">
                    <input
                      ref={inputRef}
                      type="text"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Add a comment..."
                      className="flex-1 bg-gray-800 text-white font-poppins text-sm px-4 py-3 rounded-full focus:outline-none focus:ring-2 focus:ring-white/20"
                      maxLength={1000}
                      style={{ pointerEvents: 'auto' }}
                    />
                    <button
                      type="submit"
                      disabled={!commentText.trim()}
                      className="bg-white text-black p-3 rounded-full disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 active:scale-95 transition-transform"
                      style={{ pointerEvents: 'auto' }}
                    >
                      <IoSendSharp size={20} />
                    </button>
                  </form>
                </div>
              ) : (
                <div className="border-t border-gray-700 p-6 text-center">
                  <p className="font-poppins text-gray-400">Login to comment</p>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {}
      {showReportModal && (
        <ReportModal
          type={showReportModal.type}
          id={showReportModal.id}
          onClose={() => setShowReportModal(null)}
        />
      )}
    </>
  );
};

interface ReportModalProps {
  type: 'video' | 'comment';
  id: string;
  onClose: () => void;
}

const ReportModal: React.FC<ReportModalProps> = ({ type, id, onClose }) => {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reportReasons = [
    'Spam',
    'Harassment',
    'Hate Speech',
    'Violence',
    'Nudity or Sexual Content',
    'False Information',
    'Other'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) return;

    try {
      setIsSubmitting(true);
      if (type === 'video') {
        const { interactionAPI } = await import('@/lib/api');
        await interactionAPI.report(id, reason, details || undefined);
      } else {
        await commentAPI.reportComment(id, reason, details || undefined);
      }
      alert('Report submitted successfully');
      onClose();
    } catch (error) {
      console.error('Failed to submit report:', error);
      alert('Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
      style={{ zIndex: 10100, pointerEvents: 'auto' }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-app-gray rounded-lg p-6 max-w-md w-full"
        style={{ pointerEvents: 'auto' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-poppins font-semibold text-white text-lg">Report {type}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <IoClose size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="font-poppins text-sm text-gray-300 mb-2 block">Reason *</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-gray-800 text-white font-poppins text-sm px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-white/20"
              required
            >
              <option value="">Select a reason</option>
              {reportReasons.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div className="mb-6">
            <label className="font-poppins text-sm text-gray-300 mb-2 block">Additional details (optional)</label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Provide more information..."
              className="w-full bg-gray-800 text-white font-poppins text-sm px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-white/20 min-h-[100px] resize-none"
              maxLength={1000}
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-700 text-white font-poppins py-2 rounded hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!reason || isSubmitting}
              className="flex-1 bg-red-500 text-white font-poppins py-2 rounded hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default CommentsModal;

