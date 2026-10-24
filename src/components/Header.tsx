import React, { useState } from 'react';
import { Search, Heart, ShoppingBag, Menu, X, Globe, MapPin, UserCheck, LogIn } from 'lucide-react';
import { LanguageCode, MarketCode, PageView } from '../types/heritage';
import { tText, UI_STRINGS } from '../data/translations';
import { AppUserProfile } from '../lib/firebaseAuth';

interface HeaderProps {
  currentView: PageView;
  onNavigate: (view: PageView) => void;
  language: LanguageCode;
  onLanguageChange: (lang: LanguageCode) => void;
  market: MarketCode;
  onMarketChange: (market: MarketCode) => void;
  cartCount: number;
  wishlistCount: number;
  onOpenCartDrawer: () => void;
  searchQuery: string;
  onSearchSubmit: (q: string) => void;
  userProfile?: AppUserProfile | null;
  onSignIn?: () => void;
  onSignOut?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  language,
  onLanguageChange,
  market,
  onMarketChange,
  cartCount,
  wishlistCount,
  onOpenCartDrawer,
  searchQuery,
  onSearchSubmit,
  userProfile,
  onSignIn,
}) => {
  const [showAnnouncement, setShowAnnouncement] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchBarOpen, setSearchBarOpen] = useState(false);
  const [localQuery, setLocalQuery] = useState(searchQuery);

  React.useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  const navItems: { id: PageView; label: string }[] = [
    { id: 'home', label: tText(UI_STRINGS.navHome, language) },
    { id: 'shop', label: tText(UI_STRINGS.navShop, language) },
    { id: 'artisans', label: tText(UI_STRINGS.navArtisans, language) },
    { id: 'stories', label: tText(UI_STRINGS.navStories, language) },
    { id: 'about', label: tText(UI_STRINGS.navAbout, language) },
  ];

  const handleSearchFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchSubmit(localQuery);
    setSearchBarOpen(false);
    setMobileMenuOpen(false);
  };

  return (
    <div className="sticky top-0 z-40 paper-grain border-b border-[#8a4b2a]/30">
      {/* Slim Announcement & Utility Bar */}
      {showAnnouncement && (
        <div className="bg-[#b5502d] text-[#fff3dc] text-xs px-3 sm:px-4 py-1.5 tracking-wide">
          <div className="max-w-[1200px] mx-auto flex items-center justify-between gap-2 sm:gap-4">
            <p className="truncate min-w-0 flex-1">
              {tText(UI_STRINGS.announcementText, language)}
            </p>

            {/* Independent Regional Market, Language & Customer Account Controls */}
            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
              {userProfile ? (
                <button
                  type="button"
                  onClick={() => onNavigate('orders')}
                  className="hidden md:inline-flex items-center gap-1 text-[#fff3dc] hover:underline cursor-pointer"
                  title="View Your Orders & Account"
                >
                  <UserCheck className="w-3.5 h-3.5 text-[#fff3dc]" />
                  <span className="max-w-[120px] truncate">{userProfile.displayName}</span>
                </button>
              ) : (
                onSignIn && (
                  <button
                    type="button"
                    onClick={onSignIn}
                    className="hidden md:inline-flex items-center gap-1 text-[#fff3dc] hover:underline cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sign In</span>
                  </button>
                )
              )}

              <div className="hidden sm:flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#fff3dc]/90" aria-hidden="true" />
                <label htmlFor="market-select" className="sr-only">
                  Shipping Market & Currency
                </label>
                <select
                  id="market-select"
                  value={market}
                  onChange={(e) => onMarketChange(e.target.value as MarketCode)}
                  className="bg-transparent text-[#fff3dc] text-xs font-medium focus:outline-none cursor-pointer border-b border-[#fff3dc]/40 pb-0.5"
                >
                  <option value="BD" className="text-[#3b2a1a] bg-[#f6ecd4]">
                    BD · ৳ BDT
                  </option>
                  <option value="IN" className="text-[#3b2a1a] bg-[#f6ecd4]">
                    IN · ₹ INR
                  </option>
                  <option value="INTL" className="text-[#3b2a1a] bg-[#f6ecd4]">
                    Global · ৳/₹
                  </option>
                </select>
              </div>

              <div className="flex items-center gap-1 sm:gap-1.5">
                <Globe className="w-3.5 h-3.5 text-[#fff3dc]/90 shrink-0" aria-hidden="true" />
                <label htmlFor="lang-select" className="sr-only">
                  Language
                </label>
                <select
                  id="lang-select"
                  value={language}
                  onChange={(e) => onLanguageChange(e.target.value as LanguageCode)}
                  className="bg-transparent text-[#fff3dc] text-xs font-medium focus:outline-none cursor-pointer border-b border-[#fff3dc]/40 pb-0.5 max-w-[88px] sm:max-w-none truncate"
                >
                  <option value="en" className="text-[#3b2a1a] bg-[#f6ecd4]">
                    English
                  </option>
                  <option value="bn" className="text-[#3b2a1a] bg-[#f6ecd4]">
                    বাংলা (Bengali)
                  </option>
                  <option value="as" className="text-[#3b2a1a] bg-[#f6ecd4]">
                    অসমীয়া (Assamese Beta)
                  </option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => setShowAnnouncement(false)}
                className="text-[#fff3dc]/80 hover:text-[#fff3dc] p-0.5 transition-colors cursor-pointer shrink-0"
                aria-label="Dismiss announcement"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main 3-Zone Top Navigation Bar */}
      <header className="max-w-[1200px] mx-auto px-3 sm:px-8 h-15 sm:h-[72px] flex items-center justify-between gap-2 sm:gap-8">
        {/* Zone 1: Brand Wordmark & Supplied Heritage Logo */}
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2 sm:gap-3 text-left group focus-visible:outline-2 focus-visible:outline-[#b5502d] min-w-0 shrink sm:shrink-0 cursor-pointer"
        >
          <img
            src="/assets/aistudio/Logo_of_Roots_of_bengal_b83453ca.jpg"
            alt="Roots of Bengal Emblem — Ektara and Alpana Mandala"
            className="h-9 w-9 sm:h-12 sm:w-12 object-contain border border-[#8a4b2a]/40 bg-[#f6ecd4] p-0.5 shrink-0"
          />
          <span className="font-editorial text-[19px] sm:text-[28px] text-[#8a4b2a] group-hover:text-[#b5502d] transition-colors truncate whitespace-nowrap">
            {tText(UI_STRINGS.brandName, language)}
          </span>
        </button>

        {/* Zone 2: 5 Clean Single-Line Text Navigation Links */}
        <nav aria-label="Main Navigation" className="hidden lg:flex items-center gap-6">
          {navItems.map((item) => {
            const isActive =
              currentView === item.id ||
              (currentView === 'product' && item.id === 'shop') ||
              (currentView === 'story-detail' && item.id === 'stories');
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`text-[15px] py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'border-[#b5502d] text-[#b5502d]'
                    : 'border-transparent text-[#3b2a1a] hover:text-[#b5502d] hover:border-[#b5502d]/50'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Search, Saved & Primary Shopping Bag Action */}
        <div className="flex items-center gap-1 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setSearchBarOpen((prev) => !prev)}
            className="p-1.5 sm:p-2 text-[#3b2a1a] hover:text-[#b5502d] transition-colors cursor-pointer"
            aria-label="Search crafts and stories"
          >
            <Search className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <button
            type="button"
            onClick={() => onNavigate('wishlist')}
            className="p-1.5 sm:p-2 text-[#3b2a1a] hover:text-[#b5502d] transition-colors relative flex items-center cursor-pointer"
            aria-label={`Saved items (${wishlistCount})`}
          >
            <Heart className="w-4 h-4 sm:w-5 sm:h-5" />
            {wishlistCount > 0 && (
              <span className="font-tabular text-[11px] sm:text-xs font-bold text-[#b5502d] ml-0.5">
                {wishlistCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onOpenCartDrawer}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1 sm:px-3.5 sm:py-1.5 bg-[#f6ecd4] border-2 border-[#8a4b2a] text-[#3b2a1a] text-xs sm:text-[13px] font-bold hover:bg-[#e4d3ad] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-[#8a4b2a] shrink-0" />
            <span>{tText(UI_STRINGS.bagLabel, language)}</span>
            <span className="font-tabular">({cartCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="lg:hidden p-1.5 sm:p-2 text-[#3b2a1a] hover:text-[#b5502d] cursor-pointer shrink-0"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5 sm:w-6 sm:h-6" /> : <Menu className="w-5 h-5 sm:w-6 sm:h-6" />}
          </button>
        </div>
      </header>

      {/* Woven Terracotta & Moss Heritage Frieze Strip */}
      <div className="craft-frieze" aria-hidden="true" />

      {/* Expandable Search Bar */}
      {searchBarOpen && (
        <div className="border-t border-[#8a4b2a]/30 bg-[#f6ecd4] px-4 sm:px-8 py-3">
          <form onSubmit={handleSearchFormSubmit} className="max-w-[1200px] mx-auto flex items-center gap-3">
            <Search className="w-4 h-4 text-[#b5502d] shrink-0" />
            <input
              type="search"
              value={localQuery}
              onChange={(e) => setLocalQuery(e.target.value)}
              placeholder={tText(UI_STRINGS.searchPlaceholder, language)}
              className="w-full bg-transparent text-sm text-[#3b2a1a] placeholder-[#3b2a1a]/60 focus:outline-none"
              autoFocus
            />
            {localQuery && (
              <button
                type="button"
                onClick={() => {
                  setLocalQuery('');
                  onSearchSubmit('');
                }}
                className="text-xs text-[#8a4b2a] hover:text-[#b5502d] px-2 py-1 cursor-pointer"
              >
                Clear
              </button>
            )}
            <button
              type="submit"
              className="craft-btn px-4 py-1.5 text-xs whitespace-nowrap shrink-0 cursor-pointer"
            >
              Search
            </button>
            <button
              type="button"
              onClick={() => setSearchBarOpen(false)}
              className="text-xs text-[#3b2a1a]/75 hover:text-[#3b2a1a] px-2 py-1 cursor-pointer"
            >
              Close
            </button>
          </form>
        </div>
      )}

      {/* Compact Mobile Drawer Navigation (100% public, no admin links) */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-[#8a4b2a]/30 bg-[#f6ecd4] px-4 py-5 space-y-4 shadow-lg">
          <nav className="flex flex-col space-y-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onNavigate(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`text-left py-2 px-3 text-base transition-colors ${
                  currentView === item.id
                    ? 'bg-[#e4d3ad] text-[#b5502d] font-bold'
                    : 'text-[#3b2a1a] hover:bg-[#e4d3ad]/50'
                }`}
              >
                {item.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                onNavigate('orders');
                setMobileMenuOpen(false);
              }}
              className="text-left py-2 px-3 text-sm font-bold text-[#8a4b2a] hover:text-[#b5502d]"
            >
              Order History & Tracking
            </button>
            <button
              type="button"
              onClick={() => {
                onNavigate('contact');
                setMobileMenuOpen(false);
              }}
              className="text-left py-2 px-3 text-sm text-[#3b2a1a]/80 hover:text-[#b5502d]"
            >
              Contact & Artisan Inquiries
            </button>
          </nav>

          {/* Mobile Customer Sign-In / Account Display */}
          <div className="pt-3 border-t border-[#8a4b2a]/25 text-xs">
            {userProfile ? (
              <div className="flex items-center justify-between w-full">
                <span className="text-[#3b2a1a] font-bold truncate">
                  {userProfile.displayName}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onNavigate('orders');
                    setMobileMenuOpen(false);
                  }}
                  className="underline text-[#b5502d] font-bold cursor-pointer ml-2"
                >
                  My Orders
                </button>
              </div>
            ) : (
              onSignIn && (
                <button
                  type="button"
                  onClick={() => {
                    onSignIn();
                    setMobileMenuOpen(false);
                  }}
                  className="craft-btn px-4 py-2 text-xs w-full text-center cursor-pointer"
                >
                  Sign In with Google
                </button>
              )
            )}
          </div>

          {/* Mobile Market & Language Switchers */}
          <div className="pt-3 border-t border-[#8a4b2a]/25 grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-[#3b2a1a]/70 mb-1">Market & Currency</label>
              <select
                value={market}
                onChange={(e) => onMarketChange(e.target.value as MarketCode)}
                className="w-full border border-[#8a4b2a]/40 bg-[#efe2c6] px-2.5 py-2 text-[#3b2a1a]"
              >
                <option value="BD">Bangladesh (৳ BDT)</option>
                <option value="IN">India (₹ INR)</option>
                <option value="INTL">Global Diaspora</option>
              </select>
            </div>
            <div>
              <label className="block text-[#3b2a1a]/70 mb-1">Language / ভাষা</label>
              <select
                value={language}
                onChange={(e) => onLanguageChange(e.target.value as LanguageCode)}
                className="w-full border border-[#8a4b2a]/40 bg-[#efe2c6] px-2.5 py-2 text-[#3b2a1a]"
              >
                <option value="en">English</option>
                <option value="bn">বাংলা</option>
                <option value="as">অসমীয়া (Beta)</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
