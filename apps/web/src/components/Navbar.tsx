'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useSpring } from 'framer-motion';
import { Brain, Menu, X, ArrowRight, Search } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

interface NavLink {
  id: string;
  label: string;
  isSection: boolean;
  href?: string;
}

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>('about');
  const pathname = usePathname();
  const router = useRouter();

  // Track scroll position for gradual scroll transformations
  const { scrollY } = useScroll();
  const smoothScrollY = useSpring(scrollY, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.01,
  });

  // Map scroll position (0px -> 150px) to layout styles for a gradual, organic transition
  const wrapperPaddingX = useTransform(smoothScrollY, [0, 150], ['0px', '24px']);
  const navMt = useTransform(smoothScrollY, [0, 150], ['0px', '16px']);
  const navRadius = useTransform(smoothScrollY, [0, 150], ['0px', '9999px']);

  const bgStyle = useTransform(
    smoothScrollY,
    [0, 150],
    ['rgba(10, 15, 30, 0.80)', 'rgba(7, 12, 30, 0.75)'],
  );

  const borderStyle = useTransform(
    smoothScrollY,
    [0, 150],
    ['rgba(255, 255, 255, 0.02)', 'rgba(255, 255, 255, 0.08)'],
  );

  const shadowStyle = useTransform(
    smoothScrollY,
    [0, 150],
    ['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.6)'],
  );

  const scrollProgress = useTransform(smoothScrollY, [0, 150], [0, 1]);
  const navMaxWidth = useTransform(scrollProgress, (val) => `calc(100% - (100% - 896px) * ${val})`);
  const navWidth = useTransform(smoothScrollY, [0, 150], ['100%', 'calc(100% - 2rem)']);

  // Track active section on scroll deterministically using viewport boundary tracking
  useEffect(() => {
    const handleScroll = () => {
      const sections = ['about', 'how-it-works', 'features', 'pricing'];
      const threshold = 160; // Offset for navbar height + spacing
      let currentActive = 'about';

      const passedSections = sections
        .map((id) => {
          const el = document.getElementById(id);
          return {
            id,
            rect: el ? el.getBoundingClientRect() : null,
          };
        })
        .filter((s): s is { id: string; rect: DOMRect } => s.rect !== null);

      // Find the last section whose top has crossed the threshold
      for (let i = passedSections.length - 1; i >= 0; i--) {
        const s = passedSections[i];
        if (s.rect.top <= threshold) {
          currentActive = s.id;
          break;
        }
      }

      // Fallback: If at the very bottom of the page, force highlight the last section
      const isAtBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 20;
      if (isAtBottom) {
        currentActive = 'pricing';
      }

      setActiveSection(currentActive);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial check
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);

    if (pathname !== '/') {
      router.push(`/#${id}`);
      return;
    }

    // Delay the scroll slightly to allow the mobile menu's collapse transition to begin.
    // This prevents React state re-renders and Framer Motion height changes from interrupting
    // the browser's smooth scrolling execution.
    setTimeout(() => {
      const element = document.getElementById(id);
      if (element) {
        const elementPosition = element.getBoundingClientRect().top + window.scrollY;
        const offsetPosition = elementPosition - 96; // 96px offset for fixed navbar spacing

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth',
        });
      }
    }, 100);
  };

  const getNavLinks = (): NavLink[] => {
    // 1. Legal Pages
    if (pathname === '/privacy') {
      return [
        { id: 'home', label: 'Home', isSection: false, href: '/' },
        { id: 'terms', label: 'Terms', isSection: false, href: '/terms' },
        { id: 'security', label: 'Security', isSection: false, href: '/security' },
      ];
    }
    if (pathname === '/terms') {
      return [
        { id: 'home', label: 'Home', isSection: false, href: '/' },
        { id: 'privacy', label: 'Privacy', isSection: false, href: '/privacy' },
        { id: 'security', label: 'Security', isSection: false, href: '/security' },
      ];
    }
    if (pathname === '/security') {
      return [
        { id: 'home', label: 'Home', isSection: false, href: '/' },
        { id: 'privacy', label: 'Privacy', isSection: false, href: '/privacy' },
        { id: 'terms', label: 'Terms', isSection: false, href: '/terms' },
      ];
    }

    // 2. Company Pages
    const companyPages = ['/about', '/careers', '/contact'];
    if (companyPages.includes(pathname)) {
      return [
        { id: 'home', label: 'Home', isSection: false, href: '/' },
        { id: 'about-us', label: 'About Us', isSection: false, href: '/about' },
        { id: 'careers', label: 'Careers', isSection: false, href: '/careers' },
        { id: 'contact', label: 'Contact', isSection: false, href: '/contact' },
      ];
    }

    // 3. Resource Pages (including Blog details / archives)
    const resourcePages = ['/documentation', '/status', '/help'];
    if (resourcePages.includes(pathname) || pathname.startsWith('/blog')) {
      return [
        { id: 'home', label: 'Home', isSection: false, href: '/' },
        { id: 'documentation', label: 'Documentation', isSection: false, href: '/documentation' },
        { id: 'help', label: 'Help Center', isSection: false, href: '/help' },
        { id: 'status', label: 'Status Logs', isSection: false, href: '/status' },
      ];
    }

    // 4. Fallback for sub-pages or dashboard if they render this navbar
    if (pathname !== '/') {
      return [{ id: 'home', label: 'Home', isSection: false, href: '/' }];
    }

    // 5. Homepage Navigation
    return [
      { id: 'about', label: 'About', isSection: true },
      { id: 'how-it-works', label: 'Workflow', isSection: true },
      { id: 'features', label: 'Capabilities', isSection: true },
      { id: 'pricing', label: 'Pricing', isSection: true },
    ];
  };

  const navLinks = getNavLinks();

  const isLinkActive = (link: NavLink) => {
    if (link.href) {
      if (link.href === '/') {
        return pathname === '/';
      }
      return pathname.startsWith(link.href);
    }
    return pathname === '/' && activeSection === link.id;
  };

  const menuContainerVariants = {
    hidden: { opacity: 0, height: 0 },
    show: {
      opacity: 1,
      height: 'auto',
      transition: {
        height: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
        staggerChildren: 0.08,
        delayChildren: 0.05,
      },
    },
    exit: {
      opacity: 0,
      height: 0,
      transition: {
        height: { duration: 0.25, ease: 'easeInOut' },
        staggerChildren: 0.04,
        staggerDirection: -1,
      },
    },
  } as const;

  const menuItemVariants = {
    hidden: { opacity: 0, x: -12 },
    show: {
      opacity: 1,
      x: 0,
      transition: { type: 'spring', stiffness: 300, damping: 24 },
    },
    exit: {
      opacity: 0,
      x: -8,
      transition: { duration: 0.15 },
    },
  } as const;

  return (
    <>
      {/* Mobile Backdrop Dim Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-[#0A0F1E]/75 backdrop-blur-md z-40 sm:hidden"
            transition={{ duration: 0.3 }}
          />
        )}
      </AnimatePresence>

      <motion.div
        layout
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        style={{
          paddingLeft: wrapperPaddingX,
          paddingRight: wrapperPaddingX,
        }}
        className="fixed top-0 left-0 right-0 z-50 pointer-events-none"
      >
        {/* Navbar Container */}
        <motion.nav
          layout
          style={{
            marginTop: navMt,
            borderRadius: mobileMenuOpen ? '24px' : navRadius,
            borderColor: borderStyle,
            backgroundColor: bgStyle,
            boxShadow: shadowStyle,
            width: navWidth,
            maxWidth: navMaxWidth,
          }}
          className={`mx-auto backdrop-blur-xl flex px-4 sm:px-6 py-3 border overflow-hidden relative sm:flex-row sm:items-center sm:justify-between sm:gap-4 pointer-events-auto ${
            mobileMenuOpen ? 'flex-col gap-4' : 'flex-row items-center justify-between gap-0'
          }`}
        >
          {/* Custom border glow effect */}
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-[#00D4FF]/30 to-transparent pointer-events-none"
          />

          {/* Top Row (Mobile Navigation Header) */}
          <div className="flex items-center justify-between w-full sm:w-auto relative z-10">
            {/* Logo */}
            <Link
              href="/"
              onClick={(e) => {
                if (pathname === '/') {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
                setMobileMenuOpen(false);
              }}
              className="flex items-center gap-2 cursor-pointer group"
              aria-label="RetentIQ Home"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-400 via-[#00D4FF] to-indigo-500 flex items-center justify-center shadow-lg shadow-cyan-500/10 group-hover:scale-105 transition-transform duration-200">
                <Brain className="w-4 h-4 text-[#0A0F1E]" />
              </div>
              <span className="font-bold text-xs tracking-widest text-[#F8F6F0] uppercase group-hover:text-white transition-colors">
                RetentIQ
              </span>
            </Link>

            {/* Mobile Actions Right */}
            <div className="flex items-center gap-2 sm:hidden">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  const trigger = document.getElementById('global-search-trigger');
                  if (trigger) trigger.click();
                }}
                className="w-8 h-8 rounded-lg bg-white/[0.02] border border-white/[0.08] text-slate-300 hover:text-white flex items-center justify-center cursor-pointer"
                aria-label="Search site pages"
              >
                <Search className="w-4 h-4" />
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="w-8 h-8 rounded-lg bg-white/[0.02] border border-white/[0.08] text-slate-300 hover:text-white hover:bg-white/[0.04] transition-all flex items-center justify-center relative focus:outline-none"
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              >
                <motion.div
                  animate={{ rotate: mobileMenuOpen ? 90 : 0 }}
                  transition={{ type: 'spring', stiffness: 220, damping: 18 }}
                  className="absolute flex items-center justify-center"
                >
                  {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                </motion.div>
              </motion.button>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden sm:flex items-center gap-1.5 text-[12px] font-bold tracking-wider uppercase text-[#8B95AB]">
            {navLinks.map((link) => {
              const isActive = isLinkActive(link);
              const href = link.isSection ? `/#${link.id}` : link.href || '#';
              return (
                <Link
                  key={link.id}
                  href={href}
                  onClick={(e) => {
                    if (link.isSection && pathname === '/') {
                      e.preventDefault();
                      scrollToSection(link.id);
                    }
                  }}
                  onMouseEnter={() => setHoveredLink(link.id)}
                  onMouseLeave={() => setHoveredLink(null)}
                  className="relative px-4 py-2 rounded-full hover:text-white transition-colors duration-250 cursor-pointer"
                >
                  {hoveredLink === link.id && (
                    <motion.span
                      layoutId="navHover"
                      className="absolute inset-0 bg-white/[0.04] border border-[#00D4FF]/10 rounded-full z-0"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span
                    className={`relative z-10 transition-colors ${
                      isActive
                        ? 'text-[#00D4FF]'
                        : hoveredLink === link.id
                          ? 'text-white'
                          : 'text-[#8B95AB]'
                    }`}
                  >
                    {link.label}
                  </span>
                  {isActive && (
                    <motion.span
                      layoutId="navActiveDot"
                      className="absolute bottom-[-1px] left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#00D4FF] shadow-[0_0_8px_rgba(0,212,255,0.8)]"
                      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Desktop Actions */}
          <div className="hidden sm:flex items-center gap-3">
            <button
              onClick={() => {
                const trigger = document.getElementById('global-search-trigger');
                if (trigger) trigger.click();
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.08] text-slate-400 hover:text-white transition-all text-[11px] font-bold tracking-wider uppercase cursor-pointer"
              aria-label="Open command menu"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="text-[9px] text-slate-500 font-bold">⌘K</span>
            </button>

            <Link
              href="/login"
              className="text-[12px] font-bold tracking-wider uppercase text-[#8B95AB] hover:text-white transition-colors px-3 py-1.5"
            >
              Login
            </Link>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link
                href="/dashboard"
                className="px-5 py-2 rounded-full bg-gradient-to-r from-[#00D4FF] to-cyan-500 hover:opacity-95 text-[#0A0F1E] font-bold text-[11px] tracking-wider uppercase transition-all shadow-[0_4px_15px_rgba(0,212,255,0.25)] flex items-center gap-1 group relative overflow-hidden"
              >
                Start Free{' '}
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </motion.div>
          </div>

          {/* Mobile Accordion Panel */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                variants={menuContainerVariants}
                initial="hidden"
                animate="show"
                exit="exit"
                className="sm:hidden w-full flex flex-col gap-2 pt-3 pb-2 border-t border-white/[0.06] z-10"
              >
                {navLinks.map((link) => {
                  const isActive = isLinkActive(link);
                  const href = link.isSection ? `/#${link.id}` : link.href || '#';
                  return (
                    <motion.div
                      key={link.id}
                      variants={menuItemVariants}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Link
                        href={href}
                        onClick={(e) => {
                          if (link.isSection && pathname === '/') {
                            e.preventDefault();
                            scrollToSection(link.id);
                          } else {
                            setMobileMenuOpen(false);
                          }
                        }}
                        className={`w-full py-2.5 px-3 text-left text-sm font-semibold rounded-full transition-all flex items-center justify-between group ${
                          isActive
                            ? 'text-[#00D4FF] bg-[#00D4FF]/5 border-l-2 border-[#00D4FF]'
                            : 'text-slate-300 hover:text-[#00D4FF] hover:bg-white/[0.02]'
                        }`}
                      >
                        <span>{link.label}</span>
                        <ArrowRight
                          className={`w-4 h-4 transition-all ${
                            isActive
                              ? 'opacity-100 translate-x-0 text-[#00D4FF]'
                              : 'opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 text-[#00D4FF]'
                          }`}
                        />
                      </Link>
                    </motion.div>
                  );
                })}

                <motion.div
                  variants={menuItemVariants}
                  className="flex flex-col gap-2 pt-2 border-t border-white/[0.04]"
                >
                  <motion.div whileTap={{ scale: 0.98 }} className="w-full">
                    <Link
                      href="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full py-2.5 text-center text-xs font-bold bg-white/[0.02] border border-white/[0.08] hover:border-white/[0.15] rounded-full hover:bg-white/[0.04] transition-all text-slate-200 hover:text-white block"
                    >
                      Login
                    </Link>
                  </motion.div>
                  <motion.div whileTap={{ scale: 0.98 }} className="w-full">
                    <Link
                      href="/dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full py-2.5 text-center text-xs font-bold bg-gradient-to-r from-[#00D4FF] to-cyan-500 text-[#0A0F1E] rounded-full shadow-[0_4px_15px_rgba(0,212,255,0.2)] flex items-center justify-center gap-1 hover:opacity-95 transition-all block"
                    >
                      Start Free <ArrowRight className="w-4 h-4" />
                    </Link>
                  </motion.div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.nav>
      </motion.div>
    </>
  );
}
