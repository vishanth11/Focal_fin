import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin, isStudent, isUniversity } = useApp();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'HOME', path: '/' },
    { name: 'EXPLORE', path: '/explore' },
    { name: 'REGISTER', path: '/register' },
    { name: 'HOW IT WORKS', path: '/#how-it-works' },
    { name: 'REPORT', path: '/report' },
    { name: 'CONNECTIONS', path: '/connections' },
  ];

  const handleLinkClick = (path) => {
    setMobileMenuOpen(false);
    if (path.startsWith('/#')) {
      if (location.pathname !== '/') {
        navigate(path);
      } else {
        const elem = document.getElementById(path.replace('/#', ''));
        if (elem) elem.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav
      className={`sticky top-0 z-40 transition-all duration-300 ${
        isScrolled
          ? 'bg-pitch/90 backdrop-blur-md border-b border-borderDark py-3.5 shadow-sm'
          : 'bg-pitch border-b border-borderDark/60 py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Left: Logo */}
          <Link
            to="/"
            className="flex items-center gap-2 group font-mono font-extrabold text-2xl sm:text-3xl tracking-tighter"
          >
            <span className="text-textDark group-hover:text-black transition-colors duration-200">
              FOCAL
            </span>
            <span className="text-neon-green group-hover:text-neon-yellow transition-colors duration-200 font-extrabold">
              .
            </span>
            <span className="hidden sm:inline-block ml-3 px-2 py-0.5 text-[9px] font-mono tracking-widest uppercase bg-surface border border-borderDark text-textMuted rounded shadow-sm">
              TRUST LAYER v2.0
            </span>
          </Link>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center space-x-1 lg:space-x-6">
            {navLinks.map((link) => {
              const active = isActive(link.path);
              return (
                <Link
                  key={link.name}
                  to={link.path}
                  onClick={() => handleLinkClick(link.path)}
                  className={`relative text-xs font-mono tracking-widest uppercase px-3 py-1.5 transition-all duration-200 ${
                    active
                      ? 'text-textDark font-extrabold bg-neon-yellow/40 border-b-2 border-textDark'
                      : 'text-textMuted hover:text-textDark hover:bg-surface'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}

            {isAdmin && (
              <Link
                to="/admin"
                className="text-xs font-mono tracking-widest text-textDark hover:underline px-2.5 py-1 border border-textDark/40 rounded bg-neon-green/20 font-bold"
              >
                ADMIN [ACTIVE]
              </Link>
            )}

            {isUniversity && (
              <Link
                to="/university/dashboard"
                className="text-xs font-mono tracking-widest text-textDark hover:underline px-2.5 py-1 border border-textDark/40 rounded bg-neon-green/30 font-bold"
              >
                UNIVERSITY [ACTIVE]
              </Link>
            )}

            {isStudent && (
              <Link
                to="/student"
                className="text-xs font-mono tracking-widest text-textDark hover:underline px-2.5 py-1 border border-textDark/40 rounded bg-neon-yellow/40 font-bold"
              >
                STUDENT [ACTIVE]
              </Link>
            )}
          </div>

          {/* Right: CTA Buttons */}
          <div className="hidden md:flex items-center gap-2">
            <Link
              to="/company/verify-credential"
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-pitch text-textDark text-xs font-mono font-extrabold uppercase tracking-wider border-2 border-textDark hover:bg-neon-green transition-all duration-200 shadow-sm"
              title="Verify University Academic Credential (VC / QR / SHA-256)"
            >
              <span>VERIFY VC</span>
            </Link>
            <button
              onClick={() => {
                if (location.pathname !== '/') {
                  navigate('/?focus=search');
                } else {
                  const input = document.getElementById('company-search-input');
                  if (input) input.focus();
                }
              }}
              className="relative group inline-flex items-center gap-2 px-4 py-2.5 bg-surface text-textDark text-xs font-mono font-extrabold uppercase tracking-wider border-2 border-textDark hover:bg-neon-yellow transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <span>CHECK COMPANY</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-textDark border border-borderDark rounded bg-surface"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-surface border-b border-borderDark px-4 pt-4 pb-6 space-y-3 font-mono">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              onClick={() => handleLinkClick(link.path)}
              className={`block text-sm tracking-widest py-2 border-b border-borderDark/40 ${
                isActive(link.path) ? 'text-textDark font-extrabold' : 'text-textMuted'
              }`}
            >
              {link.name}
            </Link>
          ))}

          <Link
            to="/admin/login"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-xs text-textDark font-bold py-2"
          >
            ADMIN CONSOLE →
          </Link>

          <Link
            to={isUniversity ? '/university/dashboard' : '/university/login'}
            onClick={() => setMobileMenuOpen(false)}
            className="block text-xs text-textDark font-bold py-2"
          >
            {isUniversity ? 'UNIVERSITY DASHBOARD →' : 'UNIVERSITY PORTAL →'}
          </Link>

          <Link
            to={isStudent ? '/student' : '/student/login'}
            onClick={() => setMobileMenuOpen(false)}
            className="block text-xs text-textDark font-bold py-2"
          >
            {isStudent ? 'STUDENT ACCOUNT →' : 'STUDENT LOGIN →'}
          </Link>

          <Link
            to="/company/verify-credential"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-xs text-brand-primary font-bold py-2"
          >
            VERIFY ACADEMIC VC →
          </Link>

          <button
            onClick={() => {
              setMobileMenuOpen(false);
              navigate('/?focus=search');
            }}
            className="w-full mt-4 py-3 bg-neon-yellow text-textDark font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 border border-textDark"
          >
            <span>CHECK A COMPANY</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </nav>
  );
}
