'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import VideoPlayer from '@/components/VideoPlayer';
import { feedAPI } from '@/lib/api';
import { Video } from '@/types';
import { motion } from 'framer-motion';

type FeedType = 'trending' | 'recent' | 'discover';

export default function Home() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const [feedType, setFeedType] = useState<FeedType>('trending');
  const [showFeedSelector, setShowFeedSelector] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const pageRef = useRef(1);

  useEffect(() => {
    loadVideos(1);
  }, []);

  useEffect(() => {

    const switchFeed = async () => {
      setIsTransitioning(true);

      await new Promise(resolve => setTimeout(resolve, 200));

      setVideos([]);
      setActiveVideoIndex(0);
      setPage(1);
      pageRef.current = 1;
      setHasMore(true);

      await loadVideos(1);

      await new Promise(resolve => setTimeout(resolve, 100));
      setIsTransitioning(false);
    };

    switchFeed();
  }, [feedType]);

  useEffect(() => {

    const logo = document.getElementById('header-logo');
    if (logo) {
      logo.style.opacity = showFeedSelector ? '0' : '1';
      logo.style.pointerEvents = showFeedSelector ? 'none' : 'auto';
      logo.style.transition = 'opacity 0.2s ease';
    }
  }, [showFeedSelector]);

  useEffect(() => {
    if (videos.length > 0 && videos[activeVideoIndex]) {
      const activeVideo = videos[activeVideoIndex];
      document.title = `${activeVideo.title} | Kalesh`;
    }

    return () => {
      document.title = 'Kalesh - Watch Kaleshi Videos';
    };
  }, [activeVideoIndex, videos]);

  const loadVideos = useCallback(async (pageNum: number) => {
    if (loadingRef.current) return;

    try {
      loadingRef.current = true;
      setIsLoading(true);

      const pageSize = pageNum === 1 ? 5 : 10;
      let response;

      switch (feedType) {
        case 'recent':
          response = await feedAPI.getRecent(pageNum, pageSize);
          break;
        case 'discover':
          response = await feedAPI.getDiscover(pageNum, pageSize);
          break;
        default:
          response = await feedAPI.getTrending(pageNum, pageSize);
      }

      if (response.status === 'success' && response.data?.videos) {
        const newVideos = response.data.videos;

        if (pageNum === 1) {
          setVideos(newVideos);
        } else {
          setVideos((prev) => [...prev, ...newVideos]);
        }

        setHasMore(newVideos.length === pageSize);
        pageRef.current = pageNum;
        setPage(pageNum);
      }
    } catch (error) {
      console.error('Failed to load videos:', error);
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  }, [feedType]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const scrollTop = container.scrollTop;
    const clientHeight = container.clientHeight;

    if (scrollTop > 100 && !showFeedSelector) {
      setShowFeedSelector(true);
    } else if (scrollTop <= 100 && showFeedSelector) {
      setShowFeedSelector(false);
    }

    const newIndex = Math.round(scrollTop / clientHeight);
    if (newIndex !== activeVideoIndex && newIndex < videos.length) {
      setActiveVideoIndex(newIndex);

      if (newIndex >= videos.length - 3 && !loadingRef.current && hasMore) {
        const nextPage = pageRef.current + 1;
        loadVideos(nextPage);
      }
    }
  }, [activeVideoIndex, videos.length, hasMore, loadVideos, showFeedSelector]);

  return videos.length === 0 ? (
    <div className="h-screen flex items-center justify-center bg-black" />
  ) : (
    <>
      {}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{
          opacity: showFeedSelector ? 1 : 0,
          y: showFeedSelector ? 0 : -20,
          pointerEvents: showFeedSelector ? 'auto' : 'none'
        }}
        transition={{ duration: 0.2 }}
        className="fixed top-3 left-4 z-[150]"
      >
        <div className="flex items-center gap-1 bg-black/50 backdrop-blur-md rounded-lg p-1 border border-white/10">
          <button
            onClick={() => setFeedType('trending')}
            className={`px-3 py-1.5 font-poppins text-xs transition-all rounded-md ${
              feedType === 'trending'
                ? 'bg-white text-black font-medium'
                : 'text-white hover:bg-white/10'
            }`}
          >
            Trending
          </button>
          <button
            onClick={() => setFeedType('recent')}
            className={`px-3 py-1.5 font-poppins text-xs transition-all rounded-md ${
              feedType === 'recent'
                ? 'bg-white text-black font-medium'
                : 'text-white hover:bg-white/10'
            }`}
          >
            Recent
          </button>
          <button
            onClick={() => setFeedType('discover')}
            className={`px-3 py-1.5 font-poppins text-xs transition-all rounded-md ${
              feedType === 'discover'
                ? 'bg-white text-black font-medium'
                : 'text-white hover:bg-white/10'
            }`}
          >
            Discover
          </button>
        </div>
      </motion.div>

      <motion.div
        ref={containerRef}
        onScroll={handleScroll}
        className="snap-container bg-black"
        animate={{ opacity: isTransitioning ? 0 : 1 }}
        transition={{ duration: 0.2 }}
      >
        {videos.map((video, index) => (
          <VideoPlayer
            key={`video-${video.id}`}
            video={video}
            isActive={index === activeVideoIndex}
            shouldPreload={index === activeVideoIndex + 1 || index === activeVideoIndex + 2}
          />
        ))}
        {isLoading && videos.length > 0 && (
          <div className="h-screen flex items-center justify-center bg-black snap-start">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-12 h-12 border-4 border-white border-t-transparent rounded-full"
            />
          </div>
        )}
      </motion.div>
    </>
  );
}

