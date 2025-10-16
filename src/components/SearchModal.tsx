'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IoClose, IoSearchSharp, IoPersonCircleOutline, IoPlaySharp } from 'react-icons/io5';
import { feedAPI } from '@/lib/api';
import { Video } from '@/types';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface SearchModalProps {
  onClose: () => void;
}

interface SearchUser {
  id: string;
  username: string;
  full_name: string | null;
  profile_image_url: string | null;
}

const SearchModal: React.FC<SearchModalProps> = ({ onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [videos, setVideos] = useState<Video[]>([]);
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMoreVideos, setHasMoreVideos] = useState(false);
  const [totalVideos, setTotalVideos] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const router = useRouter();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isSearchingRef = useRef(false);
  const handleSearchRef = useRef<(pageNum?: number) => Promise<void>>();

  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current || isLoadingMore || !hasMoreVideos || isSearchingRef.current) return;

    const container = scrollContainerRef.current;
    const { scrollTop, scrollHeight, clientHeight } = container;

    if (scrollHeight - scrollTop - clientHeight < 200 && handleSearchRef.current) {
      handleSearchRef.current(page + 1);
    }
  }, [isLoadingMore, hasMoreVideos, page]);

  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (searchQuery.trim().length > 0) {
        setPage(1);
        setVideos([]);
        setUsers([]);
        if (handleSearchRef.current) {
          handleSearchRef.current(1);
        }
      } else {
        setVideos([]);
        setUsers([]);
        setTotalVideos(0);
        setTotalUsers(0);
        setHasMoreVideos(false);
      }
    }, 300);

    return () => clearTimeout(delaySearch);
  }, [searchQuery]);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    scrollContainer.addEventListener('scroll', handleScroll);

    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  const handleSearch = useCallback(async (pageNum = 1) => {
    try {
      if (isSearchingRef.current) return;
      isSearchingRef.current = true;

      if (pageNum === 1) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      const pageSize = 10;
      const response = await feedAPI.search(searchQuery.trim(), pageNum, pageSize);

      if (response.status === 'success' && response.data) {
        const newVideos = response.data.videos || [];

        if (pageNum === 1) {
          setVideos(newVideos);
          setUsers(response.data.users || []);
        } else {
          setVideos(prev => [...prev, ...newVideos]);
        }

        if (response.data.total_videos !== undefined) {
          setTotalVideos(response.data.total_videos);
        }

        if (response.data.total_users !== undefined) {
          setTotalUsers(response.data.total_users);
        }

        setHasMoreVideos(newVideos.length === pageSize && videos.length + newVideos.length < response.data.total_videos);
        setPage(pageNum);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      isSearchingRef.current = false;
    }
  }, [searchQuery, videos.length]);

  useEffect(() => {
    handleSearchRef.current = handleSearch;
  }, [handleSearch]);

  const handleVideoClick = (videoId: string) => {
    router.push(`/kalesh/${videoId}`);
    onClose();
  };

  const hasResults = videos.length > 0 || users.length > 0;
  const showContent = searchQuery.trim().length > 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200]"
        style={{ pointerEvents: 'auto' }}
      >
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{
            y: 0,
            opacity: 1,
            height: hasResults && showContent ? '100vh' : 'auto'
          }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className={`bg-app-gray w-full shadow-2xl flex flex-col ${hasResults && showContent ? 'h-screen' : ''}`}
          style={{ pointerEvents: 'auto' }}
        >
          {}
          <div className="flex items-center gap-2 p-3 md:p-6 border-b border-white/5 flex-shrink-0">
            <IoSearchSharp size={18} className="text-gray-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-white font-poppins text-sm md:text-lg outline-none placeholder-gray-400 min-w-0"
              autoFocus
            />
            <button
              onClick={onClose}
              className="text-white hover:text-gray-300 transition-colors flex-shrink-0 p-1"
            >
              <IoClose size={24} />
            </button>
          </div>

          {}
          <div
            ref={scrollContainerRef}
            className={`${hasResults && showContent ? 'flex-1' : ''} overflow-y-auto p-4 md:p-6`}
          >
            <div className="max-w-6xl mx-auto">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-8 h-8 border-4 border-white border-t-transparent rounded-full"
                  />
                </div>
              ) : searchQuery.trim().length === 0 ? (
                <div className="text-center py-12">
                  <IoSearchSharp size={48} className="text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 font-poppins">Start typing to search...</p>
                </div>
              ) : videos.length === 0 && users.length === 0 ? (
                <div className="text-center py-12">
                  <IoSearchSharp size={48} className="text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 font-poppins">No results found</p>
                </div>
              ) : (
                <div className="space-y-6">
                {}
                {users.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-white font-poppins font-semibold text-sm">Users</h3>
                      <span className="text-gray-400 font-poppins text-xs">{totalUsers > 0 ? `${users.length} of ${totalUsers}` : users.length} users</span>
                    </div>
                    <div className="space-y-2">
                      {users.map((user) => (
                        <Link
                          key={user.id}
                          href={`/profile/${user.username}`}
                          onClick={onClose}
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors group"
                        >
                          {user.profile_image_url ? (
                            <img
                              src={user.profile_image_url}
                              alt={user.username}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <IoPersonCircleOutline size={48} className="text-gray-400" />
                          )}
                          <div className="flex-1">
                            <p className="text-white font-poppins font-medium group-hover:text-gray-200">
                              @{user.username}
                            </p>
                            {user.full_name && (
                              <p className="text-gray-400 font-poppins text-sm">{user.full_name}</p>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {}
                {videos.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-white font-poppins font-semibold text-sm">Videos</h3>
                      <span className="text-gray-400 font-poppins text-xs">{totalVideos > 0 ? `${videos.length} of ${totalVideos}` : videos.length} videos</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
                      {videos.map((video) => (
                        <motion.div
                          key={video.id}
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleVideoClick(video.id)}
                          className="cursor-pointer group"
                        >
                          <div className="relative aspect-[9/16] bg-black overflow-hidden rounded-lg shadow-lg hover:shadow-2xl transition-shadow">
                            {video.thumbnail_url ? (
                              <img
                                src={video.thumbnail_url}
                                alt={video.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-app-gray">
                                <IoPlaySharp size={48} className="text-gray-600" />
                              </div>
                            )}
                            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/90 to-transparent">
                              <div className="flex items-center gap-2 text-gray-300 text-xs">
                                <span>{video.views.toLocaleString()} views</span>
                                <span>•</span>
                                <span>{video.likes.toLocaleString()} likes</span>
                              </div>
                            </div>
                          </div>
                          <div className="mt-2">
                            <p className="text-white font-poppins text-sm font-medium line-clamp-2 group-hover:text-gray-200">
                              {video.title}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {}
                    {isLoadingMore && (
                      <div className="mt-6 flex justify-center py-4">
                        <div className="flex items-center gap-2">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                          />
                          <span className="text-gray-300 font-poppins text-sm">Loading more videos...</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SearchModal;

