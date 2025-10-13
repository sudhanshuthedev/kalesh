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
  shouldPreload?: boolean;
  onInteraction?: () => void;
}

let userHasInteracted = false;

const VideoPlayer: React.FC<VideoPlayerProps> = ({ video, isActive, shouldPreload = false, onInteraction }) => {
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
  const [isLoading, setIsLoading] = useState(isActive);
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showMuteHint, setShowMuteHint] = useState(false);
  const [showMutedIcon, setShowMutedIcon] = useState(false);
  const pressTimer = useRef<NodeJS.Timeout | null>(null);
  const [isLongPress, setIsLongPress] = useState(false);
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
    // Initialize video when it's active or should be preloaded (next video)
    if (!isActive && !shouldPreload) {
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

    // If HLS is already loaded for this video, just update loading state
    if (hlsRef.current && hlsRef.current.media === videoElement) {
      if (isActive) {
        if (videoElement.readyState >= 3) {
          setIsLoading(false);
        } else {
          loadTimeoutRef.current = setTimeout(() => {
            setIsLoading(false);
          }, 5000);
        }
      } else {
        setIsLoading(false);
      }
      return;
    }

    // Only show loading indicator for active video, and only if not already loaded
    if (isActive) {
      // If video is already ready (was preloaded), don't show loading
      if (videoElement.readyState >= 3) {
        setIsLoading(false);
      } else {
        loadTimeoutRef.current = setTimeout(() => {
          setIsLoading(false);
        }, 5000);
      }
    } else {
      setIsLoading(false);
    }

    if ((video.playlist_url || videoUrl.includes('.m3u8'))) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          debug: false,
          enableWorker: true,
          startLevel: 1,
          autoStartLoad: true,
          capLevelToPlayerSize: true,
          maxBufferLength: shouldPreload ? 20 : (isActive ? 30 : 5),
          maxMaxBufferLength: 600,
          maxBufferSize: 60 * 1000 * 1000,
          maxBufferHole: 0.5,
          abrEwmaDefaultEstimate: 1500000,
          lowLatencyMode: false,
          backBufferLength: 90,
          progressive: true,
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
          if (isActive) {
            setIsLoading(false);
          }
        });

        hls.on(Hls.Events.FRAG_BUFFERED, () => {
          if (isLoading && isActive) {
            if (loadTimeoutRef.current) {
              clearTimeout(loadTimeoutRef.current);
            }
            setIsLoading(false);
          }
        });

        // Also track when buffering is happening for preloaded videos
        hls.on(Hls.Events.BUFFER_APPENDING, () => {
          // Video is actively buffering
          if (shouldPreload && videoElement.readyState >= 3) {
            // Preloaded video has enough data
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
      // Don't destroy HLS here - it's already checked above if it should be reused
    };
  }, [isActive, shouldPreload, video.id, video.playlist_url, video.video_url]);

  // Cleanup HLS when video ID changes or component unmounts
  useEffect(() => {
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [video.id]);

  useEffect(() => {
    let checkReadyInterval: NodeJS.Timeout | null = null;
    let playTimeout: NodeJS.Timeout | null = null;

    if (videoRef.current) {
      if (isActive) {
        const video = videoRef.current;

        // Give HLS a moment to initialize if needed
        const tryPlay = () => {
          if (userHasInteracted) {
            video.muted = false;
            video.play().then(() => {
              setIsPlaying(true);
              setShowMuteHint(false);
              setIsLoading(false);
            }).catch(() => {
              video.muted = true;
              video.play().then(() => {
                setIsPlaying(true);
                setShowMuteHint(true);
                setIsLoading(false);
              }).catch(() => {
                setIsPlaying(false);
              });
            });
          } else {
            video.muted = true;
            video.play().then(() => {
              setIsPlaying(true);
              setShowMuteHint(true);
              setIsLoading(false);
            }).catch(() => {
              setIsPlaying(false);
            });
          }
        };

        // Wait for video to have enough data buffered (readyState 3 or 4)
        if (video.readyState >= 3) {
          tryPlay();
        } else {
          checkReadyInterval = setInterval(() => {
            // Check if we have enough data to play smoothly
            if (video.readyState >= 3) {
              if (checkReadyInterval) clearInterval(checkReadyInterval);
              tryPlay();
            }
          }, 50);
          
          // Timeout after 5 seconds max
          playTimeout = setTimeout(() => {
            if (checkReadyInterval) clearInterval(checkReadyInterval);
            // Even if not fully ready, try to play if we have any data
            if (!isPlaying && video.readyState >= 2) {
              tryPlay();
            }
          }, 5000);
        }
      } else {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
        setIsPlaying(false);
      }
    }

    return () => {
      if (checkReadyInterval) clearInterval(checkReadyInterval);
      if (playTimeout) clearTimeout(playTimeout);
    };
  }, [isActive]);

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

    try {
      if (!isFullscreen) {
        // Request fullscreen on the document element to make entire screen fullscreen
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
          await elem.requestFullscreen();
        } else if ((elem as any).webkitRequestFullscreen) {
          await (elem as any).webkitRequestFullscreen();
        } else if ((elem as any).mozRequestFullScreen) {
          await (elem as any).mozRequestFullScreen();
        } else if ((elem as any).msRequestFullscreen) {
          await (elem as any).msRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
          await (document as any).mozCancelFullScreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        }
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!(document.fullscreenElement || (document as any).webkitFullscreenElement || (document as any).mozFullScreenElement || (document as any).msFullscreenElement));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full snap-start snap-always bg-black overflow-hidden">
      {}
      {video.thumbnail_url && isLoading && isActive && (
        <div 
          className="absolute inset-0 z-10"
          style={{
            backgroundImage: `url(${video.thumbnail_url})`,
            backgroundSize: 'contain',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        />
      )}

      {}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        loop
        playsInline
        muted
        onLoadedData={() => {
          if (isLoading) {
            setIsLoading(false);
          }
        }}
        onCanPlay={() => {
          if (isLoading) {
            setIsLoading(false);
          }
        }}
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
        preload={isActive || shouldPreload ? "auto" : "none"}
        crossOrigin="anonymous"
      />

      {}
      {isLoading && isActive && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-20">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-12 h-12 border-4 border-white border-t-transparent rounded-full"
          />
        </div>
      )}

      {}

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
      {isActive && (
        <div className="fixed md:absolute bottom-20 md:bottom-8 left-0 right-0 md:left-4 md:right-28 px-4 md:px-0 md:p-6 z-20 pointer-events-none">
          <div className="max-w-md md:max-w-xl">
            <Link href={`/profile/${video.uploader_username}`} className="inline-block mb-1.5 md:mb-1.5 pointer-events-auto">
              <div className="flex items-center gap-1.5">
                <IoPersonCircleOutline size={26} className="text-white md:w-7 md:h-7" />
                <span className="text-white font-poppins font-semibold text-sm md:text-sm">
                  @{video.uploader_username}
                </span>
              </div>
            </Link>
            <h3 className={`text-white font-poppins text-sm md:text-base font-semibold mb-1 md:mb-1 ${!showFullDescription ? 'line-clamp-1' : ''}`}>
              {video.title}
            </h3>
            {video.description && (
              <div className="pointer-events-auto">
                <p className={`text-white text-[13px] md:text-sm font-poppins opacity-90 leading-snug md:leading-normal ${!showFullDescription ? 'line-clamp-2' : ''}`}>
                  {video.description}
                </p>
                {(video.description.length > 100 || video.title.length > 50) && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowFullDescription(!showFullDescription);
                    }}
                    className="text-white text-xs md:text-xs font-poppins font-semibold mt-1 md:mt-1 opacity-75 hover:opacity-100 active:scale-95 transition-all"
                  >
                    {showFullDescription ? 'Show less' : 'Show more'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {}
      {isActive && (
        <div className="fixed md:absolute right-3 md:right-6 bottom-28 md:bottom-8 flex flex-col gap-3 md:gap-4 z-30">
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
      )}
    </div>
  );
};

export default VideoPlayer;

