'use client';

import React, { useRef, useState, useEffect } from 'react';
import Hls from 'hls.js';
import { Video } from '@/types';
import { motion } from 'framer-motion';
import { IoHeartSharp, IoHeartOutline, IoBookmarkSharp, IoBookmarkOutline, IoShareSocialSharp, IoPersonCircleOutline, IoVolumeMuteOutline, IoVolumeHighOutline, IoExpandOutline, IoContractOutline } from 'react-icons/io5';
import { useAuth } from '@/contexts/AuthContext';
import { interactionAPI } from '@/lib/api';
import Link from 'next/link';

interface VideoPlayerProps {
  video: Video;
  isActive: boolean;
  onInteraction?: () => void;
}

let userHasInteracted = false;

const VideoPlayer: React.FC<VideoPlayerProps> = ({ video, isActive, onInteraction }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const { isAuthenticated } = useAuth();
  const [isLiked, setIsLiked] = useState(
    video.user_interaction?.is_liked || video.is_liked || false
  );
  const [isSaved, setIsSaved] = useState(
    video.user_interaction?.is_saved || video.is_saved || false
  );
  const [likes, setLikes] = useState(video.likes || 0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showMuteHint, setShowMuteHint] = useState(false);
  const [showMutedIcon, setShowMutedIcon] = useState(false);
  const pressTimer = useRef<NodeJS.Timeout | null>(null);
  const [isLongPress, setIsLongPress] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (pressTimer.current) {
        clearTimeout(pressTimer.current);
      }
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Only initialize video when it's active - prevents all videos loading at once
    if (!isActive || hasInitialized) {
      return;
    }

    let videoUrl = video.playlist_url || video.video_url;

    if (!videoRef.current || !videoUrl) {
      setIsLoading(false);
      return;
    }
    if (typeof window !== 'undefined') {
      videoUrl = videoUrl.replace('https://cdn.tsuki.page/', '/cdn-proxy/');
    }

    const videoElement = videoRef.current;
    setHasInitialized(true);

    loadTimeoutRef.current = setTimeout(() => {
      setIsLoading(false);
    }, 5000);

    if ((video.playlist_url || videoUrl.includes('.m3u8'))) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          debug: false,
          enableWorker: true,
          startLevel: 1,
          autoStartLoad: true,
          capLevelToPlayerSize: true,
          maxBufferLength: 30,
          maxMaxBufferLength: 600,
          maxBufferSize: 60 * 1000 * 1000,
          maxBufferHole: 0.5,
          abrEwmaDefaultEstimate: 500000,
          lowLatencyMode: false,
          backBufferLength: 90,
          xhrSetup: function (xhr: any, url: string) {
            xhr.withCredentials = false;
          },
        });

        hlsRef.current = hls;

        hls.loadSource(videoUrl);
        hls.attachMedia(videoElement);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (loadTimeoutRef.current) {
            clearTimeout(loadTimeoutRef.current);
          }
          setIsLoading(false);
        });

        hls.on(Hls.Events.FRAG_BUFFERED, () => {
          if (isLoading) {
            if (loadTimeoutRef.current) {
              clearTimeout(loadTimeoutRef.current);
            }
            setIsLoading(false);
          }
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            if (loadTimeoutRef.current) {
              clearTimeout(loadTimeoutRef.current);
            }
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
                hls.destroy();
                setIsLoading(false);
                break;
            }
          }
        });
      } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
        videoElement.src = videoUrl;
        videoElement.addEventListener('loadedmetadata', () => {
          if (loadTimeoutRef.current) {
            clearTimeout(loadTimeoutRef.current);
          }
          setIsLoading(false);
        });
      }
    } else {
      videoElement.src = videoUrl;
      videoElement.addEventListener('loadedmetadata', () => {
        if (loadTimeoutRef.current) {
          clearTimeout(loadTimeoutRef.current);
        }
        setIsLoading(false);
      });
    }

    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [isActive, video.id, video.playlist_url, video.video_url, hasInitialized]);

  useEffect(() => {
    if (videoRef.current && !isLoading) {
      if (isActive) {
        const video = videoRef.current;

        if (userHasInteracted) {
          video.muted = false;
          video.play().then(() => {
            setIsPlaying(true);
            setShowMuteHint(false);
          }).catch(() => {

            video.muted = true;
            video.play().then(() => {
              setIsPlaying(true);
              setShowMuteHint(true);
            }).catch(() => {
              setIsPlaying(false);
            });
          });
        } else {

          video.muted = true;
          video.play().then(() => {
            setIsPlaying(true);
            setShowMuteHint(true);
          }).catch(() => {
            setIsPlaying(false);
          });
        }
      } else {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
        setIsPlaying(false);
      }
    }
  }, [isActive, isLoading]);

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      alert('Please login to like videos');
      return;
    }

    try {
      const newLikedState = !isLiked;
      setIsLiked(newLikedState);
      setLikes((prev) => (newLikedState ? prev + 1 : prev - 1));
      await interactionAPI.like(video.id);
      onInteraction?.();
    } catch (error) {
      setIsLiked(!isLiked);
      setLikes((prev) => (isLiked ? prev + 1 : prev - 1));
    }
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      alert('Please login to save videos');
      return;
    }

    try {
      setIsSaved(!isSaved);
      await interactionAPI.save(video.id);
      onInteraction?.();
    } catch (error) {
      setIsSaved(!isSaved);
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const shareUrl = `${window.location.origin}/?video=${video.id}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: video.title,
          text: video.description || video.title,
          url: shareUrl,
        });
      } catch (error) {
        try {
          await navigator.clipboard.writeText(shareUrl);
          alert('Link copied to clipboard!');
        } catch (clipError) {
          alert('Failed to copy link');
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        alert('Link copied to clipboard!');
      } catch (error) {
        alert('Failed to copy link. Please try again.');
      }
    }
  };

  const handlePressStart = () => {
    setIsLongPress(false);
    pressTimer.current = setTimeout(() => {
      setIsLongPress(true);

      if (videoRef.current && isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }, 500);
  };

  const handlePressEnd = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }

    if (!isLongPress && videoRef.current) {
      const video = videoRef.current;

      if (!userHasInteracted) {
        userHasInteracted = true;
      }

      if (video.muted) {
        video.muted = false;
        setShowMuteHint(false);

        setShowMutedIcon(true);
        setTimeout(() => setShowMutedIcon(false), 1500);
      }

      if (!isPlaying) {
        video.play().then(() => {
          setIsPlaying(true);
        }).catch(() => {
          setIsPlaying(false);
        });
      }
    }

    setIsLongPress(false);
  };

  const toggleFullscreen = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!containerRef.current) return;

    try {
      if (!isFullscreen) {
        if (containerRef.current.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        }
        setIsFullscreen(true);
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full snap-start snap-always bg-black overflow-hidden">
      {}
      <video
        ref={videoRef}
        className="w-full h-full object-cover md:object-contain"
        loop
        playsInline
        muted
        onMouseDown={handlePressStart}
        onMouseUp={handlePressEnd}
        onMouseLeave={() => {
          if (pressTimer.current) {
            clearTimeout(pressTimer.current);
            pressTimer.current = null;
          }
        }}
        onTouchStart={handlePressStart}
        onTouchEnd={handlePressEnd}
        preload={isActive ? "auto" : "none"}
        crossOrigin="anonymous"
      />

      {}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-20">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-12 h-12 border-4 border-white border-t-transparent rounded-full"
          />
        </div>
      )}

      {}
      <div className="md:hidden absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black via-black/50 to-transparent pointer-events-none z-10" />

      {}
      {showMuteHint && isPlaying && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          className="absolute top-20 left-1/2 transform -translate-x-1/2 z-30 pointer-events-none"
        >
          <IoVolumeMuteOutline size={24} className="text-white drop-shadow-2xl" />
        </motion.div>
      )}

      {}
      {showMutedIcon && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none"
        >
          <IoVolumeHighOutline size={60} className="text-white drop-shadow-2xl" />
        </motion.div>
      )}

      {}
      <div className="absolute bottom-24 md:bottom-8 left-4 right-24 md:right-28 md:p-6 z-20 pointer-events-none">
        <div className="max-w-md md:max-w-xl">
          <Link href={`/profile/${video.uploader_username}`} className="inline-block mb-1.5 pointer-events-auto">
            <div className="flex items-center gap-1.5">
              <IoPersonCircleOutline size={24} className="text-white md:w-7 md:h-7" />
              <span className="text-white font-poppins font-semibold text-xs md:text-sm">
                @{video.uploader_username}
              </span>
            </div>
          </Link>
          <h3 className={`text-white font-poppins text-xs md:text-base font-semibold mb-0.5 md:mb-1 ${!showFullDescription ? 'line-clamp-1' : ''}`}>
            {video.title}
          </h3>
          {video.description && (
            <div className="pointer-events-auto">
              <p className={`text-white text-[11px] md:text-sm font-poppins opacity-90 leading-tight md:leading-normal ${!showFullDescription ? 'line-clamp-2' : ''}`}>
                {video.description}
              </p>
              {(video.description.length > 100 || video.title.length > 50) && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowFullDescription(!showFullDescription);
                  }}
                  className="text-white text-[10px] md:text-xs font-poppins font-semibold mt-0.5 md:mt-1 opacity-75 hover:opacity-100 active:scale-95 transition-all"
                >
                  {showFullDescription ? 'Show less' : 'Show more'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {}
      <div className="absolute right-3 md:right-6 bottom-36 md:bottom-8 flex flex-col gap-3 md:gap-4 z-30">
        <button
          onClick={handleLike}
          className="flex flex-col items-center gap-0.5 active:scale-90 transition-transform"
        >
          {isLiked ? (
            <IoHeartSharp size={32} className="text-red-500 md:w-9 md:h-9" />
          ) : (
            <IoHeartOutline size={32} className="text-white md:w-9 md:h-9" />
          )}
          <span className="text-white text-[10px] md:text-xs font-poppins font-bold">
            {likes}
          </span>
        </button>

        <button
          onClick={handleSave}
          className="flex flex-col items-center gap-0.5 active:scale-90 transition-transform"
        >
          {isSaved ? (
            <IoBookmarkSharp size={28} className="text-yellow-400 md:w-8 md:h-8" />
          ) : (
            <IoBookmarkOutline size={28} className="text-white md:w-8 md:h-8" />
          )}
        </button>

        <button
          onClick={handleShare}
          className="flex flex-col items-center gap-0.5 active:scale-90 transition-transform"
        >
          <IoShareSocialSharp size={28} className="text-white md:w-8 md:h-8" />
        </button>

        <button
          onClick={toggleFullscreen}
          className="flex flex-col items-center gap-0.5 active:scale-90 transition-transform"
        >
          {isFullscreen ? (
            <IoContractOutline size={28} className="text-white md:w-8 md:h-8" />
          ) : (
            <IoExpandOutline size={28} className="text-white md:w-8 md:h-8" />
          )}
        </button>
      </div>
    </div>
  );
};

export default VideoPlayer;

