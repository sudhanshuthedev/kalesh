'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from './AuthModal';
import { motion } from 'framer-motion';
import { IoHomeSharp, IoBookmarkSharp, IoPersonSharp, IoAddCircle, IoLogOutOutline } from 'react-icons/io5';
import { usePathname } from 'next/navigation';

const Header = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const pathname = usePathname();

  const isVideoPage = pathname === '/' || pathname === '/saved' || pathname?.startsWith('/?video=');
  const hideLogo = isVideoPage;

  React.useEffect(() => {
    const handleClickOutside = () => {
      if (showUserMenu) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showUserMenu]);

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="fixed top-0 left-0 right-0 z-[100] h-14 flex items-center justify-between px-4 md:px-8"
        style={{ background: 'transparent' }}
      >
        {}
        <Link href="/" className="flex items-center">
          {!hideLogo && (
            <div className="h-8 md:h-9 w-auto relative">
              <Image
                src="/logo.png"
                alt="Kalesh"
                width={100}
                height={36}
                className="object-contain h-full w-auto"
                priority
                unoptimized
              />
            </div>
          )}
        </Link>

        {}
        <div className="flex items-center gap-6">
          {}
          <Link
            href="/"
            className="hidden md:flex items-center gap-2 text-white hover:text-gray-300 transition-colors"
          >
            <IoHomeSharp size={20} />
            <span className="font-poppins text-sm">Home</span>
          </Link>

          {isAuthenticated ? (
            <div className="relative">
               <button
                 onClick={(e) => {
                   e.stopPropagation();
                   setShowUserMenu(!showUserMenu);
                 }}
                 className="flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 text-white font-poppins text-xs md:text-sm transition-all"
               >
                 <IoPersonSharp size={16} className="md:hidden" />
                 <span className="max-w-[100px] md:max-w-none truncate">{user?.username}</span>
               </button>
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 mt-2 w-48 bg-app-gray py-2 shadow-xl z-50"
                >
                  <button
                    onClick={() => {
                      logout();
                      setShowUserMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-white hover:bg-white hover:bg-opacity-10 transition-colors font-poppins text-sm flex items-center gap-2"
                  >
                    <IoLogOutOutline size={18} />
                    Logout
                  </button>
                </motion.div>
              )}
            </div>
          ) : (
             <button
               onClick={() => setShowAuthModal(true)}
               className="px-3 md:px-4 py-1.5 md:py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded text-white font-poppins text-xs md:text-sm transition-all hover:bg-white/20"
             >
               Login
             </button>
          )}
        </div>
      </motion.header>

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </>
  );
};

export default Header;

