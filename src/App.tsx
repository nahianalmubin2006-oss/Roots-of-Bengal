/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  CartItem,
  CraftCategory,
  LanguageCode,
  MarketCode,
  OrderRecord,
  PageView,
  Product,
} from './types/heritage';
import { ARTISANS_DATA, PRODUCTS_DATA, STORIES_DATA } from './data/catalogData';
import { tText } from './data/translations';
import {
  AppUserProfile,
  checkIsUserAdmin,
  signInWithGoogle,
  signOutUser,
  subscribeToAuthChanges,
  syncUserProfileToFirestore,
} from './lib/firebaseAuth';
import {
  mergeLiveAndCatalogProducts,
  seedAndVerifyCatalogInFirestore,
  subscribeToFirestoreCatalog,
} from './lib/firebaseProducts';
import { validateCartItemAddition } from './lib/firebaseCart';
import { subscribeToUserOrders } from './lib/firebaseOrders';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { CartDrawer } from './components/CartDrawer';
import { QuickViewModal } from './components/QuickViewModal';
import { HomePage } from './pages/HomePage';
import { ShopPage } from './pages/ShopPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { ArtisansPage } from './pages/ArtisansPage';
import { StoriesPage } from './pages/StoriesPage';
import { AboutPage } from './pages/AboutPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { SupportingPages } from './pages/SupportingPages';
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminProductsPage } from './pages/admin/AdminProductsPage';
import { AdminOrdersPage } from './pages/admin/AdminOrdersPage';

export default function App() {
  const [currentView, setCurrentView] = useState<PageView>('home');
  const [selectedProductId, setSelectedProductId] = useState<number>(1);
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const [shopCategoryFilter, setShopCategoryFilter] = useState<CraftCategory>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Independent Language & Regional Market Preferences
  const [language, setLanguage] = useState<LanguageCode>(() => {
    const saved = localStorage.getItem('rob_lang');
    return (saved === 'bn' || saved === 'as' ? saved : 'en') as LanguageCode;
  });

  const [market, setMarket] = useState<MarketCode>(() => {
    const saved = localStorage.getItem('rob_market');
    return (saved === 'IN' || saved === 'INTL' ? saved : 'BD') as MarketCode;
  });

  // Firebase Auth & Live Catalog State
  const [userProfile, setUserProfile] = useState<AppUserProfile | null>(null);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>(() =>
    mergeLiveAndCatalogProducts(PRODUCTS_DATA, new Map())
  );
  const [verifiedLiveCount, setVerifiedLiveCount] = useState<number>(0);
  const [liveOrders, setLiveOrders] = useState<OrderRecord[]>([]);

  // Persistent Cart, Wishlist & Local Demo Orders
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('rob_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [wishlist, setWishlist] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem('rob_wishlist');
      return saved ? JSON.parse(saved) : [1, 2];
    } catch {
      return [1, 2];
    }
  });

  const [demoOrders, setDemoOrders] = useState<OrderRecord[]>(() => {
    try {
      const saved = localStorage.getItem('rob_orders');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2600);
  };

  // Admin routing state based on URL path
  const getAdminSubpath = (pathname: string): 'dashboard' | 'products' | 'orders' | 'login' => {
    if (pathname.includes('/admin/products')) return 'products';
    if (pathname.includes('/admin/orders')) return 'orders';
    if (pathname.includes('/admin/login')) return 'login';
    return 'dashboard';
  };

  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(() => {
    return typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
  });

  const [adminSubpath, setAdminSubpath] = useState<'dashboard' | 'products' | 'orders' | 'login'>(() => {
    return typeof window !== 'undefined' ? getAdminSubpath(window.location.pathname) : 'dashboard';
  });

  // Track auth loading & raw user object for token refreshes
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // Subscribe to Firebase Authentication state with zero email trust
  useEffect(() => {
    const unsub = subscribeToAuthChanges(async (firebaseUser) => {
      setCurrentUser(firebaseUser);
      if (!firebaseUser) {
        setUserProfile(null);
        setLiveOrders([]);
        setAuthLoading(false);
        return;
      }
      try {
        const profile = await syncUserProfileToFirestore(firebaseUser, language);
        setUserProfile(profile);
      } catch {
        // Safe closed fallback: verify admin strictly through server claims/records, never bare email string
        const adminCheck = await checkIsUserAdmin(firebaseUser);
        setUserProfile({
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName || 'Patron',
          email: firebaseUser.email || '',
          role: adminCheck.isAdmin ? (adminCheck.role || 'admin') : 'customer',
          preferredLanguage: language === 'bn' ? 'bn' : 'en',
          isAdmin: adminCheck.isAdmin,
          adminRole: adminCheck.role,
        });
      } finally {
        setAuthLoading(false);
      }
    });
    return () => unsub();
  }, [language]);

  // Listen to popstate for URL-driven admin routing
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path.startsWith('/admin')) {
        setIsAdminRoute(true);
        setAdminSubpath(getAdminSubpath(path));
      } else {
        setIsAdminRoute(false);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Subscribe to live Firestore Catalog (products + variants)
  useEffect(() => {
    const unsub = subscribeToFirestoreCatalog(
      Boolean(userProfile?.isAdmin),
      (mergedProducts, liveCount) => {
        setCatalogProducts(mergedProducts);
        setVerifiedLiveCount(liveCount);
      }
    );
    return () => unsub();
  }, [userProfile?.isAdmin]);

  // Subscribe to live Firestore COD orders when signed in
  useEffect(() => {
    if (!userProfile) {
      setLiveOrders([]);
      return;
    }
    const unsub = subscribeToUserOrders(
      userProfile.uid,
      userProfile.isAdmin,
      (records) => {
        setLiveOrders(records);
      }
    );
    return () => unsub();
  }, [userProfile]);

  // Sync HTML lang attribute for Bengali/Assamese glyph rendering
  useEffect(() => {
    document.documentElement.lang = language;
    localStorage.setItem('rob_lang', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('rob_market', market);
  }, [market]);

  useEffect(() => {
    localStorage.setItem('rob_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('rob_wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  useEffect(() => {
    localStorage.setItem('rob_orders', JSON.stringify(demoOrders));
  }, [demoOrders]);

  const handleSignIn = async () => {
    try {
      const user = await signInWithGoogle();
      triggerToast(`Signed in as ${user.displayName || user.email}`);
    } catch (err) {
      triggerToast(err instanceof Error ? err.message : 'Sign-in cancelled');
    }
  };

  const handleSignOut = async () => {
    await signOutUser();
    triggerToast('Signed out of your account');
  };

  const handleRefreshAdminStatus = async () => {
    if (!currentUser) return;
    setAuthLoading(true);
    try {
      await currentUser.getIdToken(true);
      const profile = await syncUserProfileToFirestore(currentUser, language);
      setUserProfile(profile);
      triggerToast('Administrative credentials refreshed');
    } catch (err) {
      triggerToast(err instanceof Error ? err.message : 'Credential refresh failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleNavigateAdmin = (subpath: 'dashboard' | 'products' | 'orders') => {
    setAdminSubpath(subpath);
    const nextPath = subpath === 'dashboard' ? '/admin' : `/admin/${subpath}`;
    window.history.pushState(null, '', nextPath);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExitAdmin = () => {
    setIsAdminRoute(false);
    window.history.pushState(null, '', '/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAdminSeedCatalog = async () => {
    try {
      const stats = await seedAndVerifyCatalogInFirestore();
      triggerToast(
        `Verified & published ${stats.seededProducts} crafts (${stats.seededVariants} variants) to live Firestore!`
      );
    } catch (err) {
      triggerToast(err instanceof Error ? err.message : 'Admin Firestore seed failed');
    }
  };

  const handleNavigate = (view: PageView, filterCategory?: string) => {
    if (filterCategory) {
      setShopCategoryFilter(filterCategory as CraftCategory);
    } else if (view === 'shop') {
      setShopCategoryFilter('All');
    }
    if (view === 'stories') {
      setSelectedStoryId(null);
    }
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectProduct = (productId: number) => {
    setSelectedProductId(productId);
    setCurrentView('product');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectStory = (storyId: string | null) => {
    setSelectedStoryId(storyId);
    setCurrentView(storyId ? 'story-detail' : 'stories');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddToCart = (
    productId: number,
    variantId: string,
    quantity: number,
    e?: React.MouseEvent
  ) => {
    if (e) e.stopPropagation();
    const product = catalogProducts.find((p) => p.id === productId);
    if (!product) return;

    const existingItem = cart.find(
      (item) => item.productId === productId && item.variantId === variantId
    );
    const desiredTotalQty = (existingItem?.quantity || 0) + quantity;
    const check = validateCartItemAddition(product, variantId, desiredTotalQty);

    if (!check.allowed) {
      triggerToast(language === 'bn' ? check.reasonBn || 'স্টকে নেই' : check.reasonEn || 'Out of stock');
      return;
    }

    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.productId === productId && item.variantId === variantId
      );
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: check.clampedQuantity,
        };
        return updated;
      }
      return [...prev, { productId, variantId, quantity: check.clampedQuantity }];
    });

    if (check.reasonEn) {
      triggerToast(language === 'bn' ? check.reasonBn! : check.reasonEn);
    } else {
      triggerToast(`Added "${tText(product.name, language)}" to your bag`);
    }
  };

  const handleUpdateCartQuantity = (productId: number, variantId: string, delta: number) => {
    const product = catalogProducts.find((p) => p.id === productId);
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.productId !== productId || item.variantId !== variantId) return item;
          const nextQty = item.quantity + delta;
          if (nextQty <= 0) return { ...item, quantity: 0 };
          if (product) {
            const check = validateCartItemAddition(product, variantId, nextQty);
            return { ...item, quantity: check.clampedQuantity };
          }
          return { ...item, quantity: nextQty };
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const handleRemoveCartItem = (productId: number, variantId: string) => {
    setCart((prev) =>
      prev.filter((item) => !(item.productId === productId && item.variantId === variantId))
    );
  };

  const handleToggleWishlist = (productId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const product = catalogProducts.find((p) => p.id === productId);
    setWishlist((prev) => {
      const exists = prev.includes(productId);
      if (product) {
        triggerToast(
          exists
            ? `Removed "${tText(product.name, language)}" from saved items`
            : `Saved "${tText(product.name, language)}" to your wishlist`
        );
      }
      return exists ? prev.filter((id) => id !== productId) : [...prev, productId];
    });
  };

  const handleQuickView = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    setQuickViewProduct(product);
  };

  const handleSearchSubmit = (query: string) => {
    setSearchQuery(query);
    setShopCategoryFilter('All');
    setCurrentView('shop');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePlaceOrderSuccess = (order: OrderRecord) => {
    if (order.isDemoOrder) {
      setDemoOrders((prev) => [order, ...prev]);
      triggerToast(`Demonstration Receipt #${order.orderId} recorded`);
    } else {
      triggerToast(
        `Verified Live COD Order #${order.orderReference || order.orderId} created!`
      );
    }
    setCart([]);
  };

  const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const activeProduct =
    catalogProducts.find((p) => p.id === selectedProductId) || catalogProducts[0];

  if (isAdminRoute) {
    return (
      <>
        <AdminLayout
          authLoading={authLoading}
          user={currentUser}
          userProfile={userProfile}
          onSignIn={handleSignIn}
          onSignOut={handleSignOut}
          onRefreshAdminStatus={handleRefreshAdminStatus}
          currentSubpath={adminSubpath}
          onNavigateSubpath={handleNavigateAdmin}
          onExitAdmin={handleExitAdmin}
        >
          {adminSubpath === 'products' && (
            <AdminProductsPage
              products={catalogProducts}
              verifiedLiveCount={verifiedLiveCount}
              onAdminSeedCatalog={handleAdminSeedCatalog}
              onTriggerToast={triggerToast}
            />
          )}
          {adminSubpath === 'orders' && (
            <AdminOrdersPage
              orders={liveOrders}
              onTriggerToast={triggerToast}
            />
          )}
          {(adminSubpath === 'dashboard' || adminSubpath === 'login') && userProfile && (
            <AdminDashboard
              products={catalogProducts}
              orders={liveOrders}
              verifiedLiveCount={verifiedLiveCount}
              userProfile={userProfile}
              onNavigateSubpath={handleNavigateAdmin}
              onAdminSeedCatalog={handleAdminSeedCatalog}
            />
          )}
        </AdminLayout>

        {/* Accessible Toast Notification */}
        {toastMessage && (
          <div
            role="status"
            aria-live="polite"
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#2B1D19] text-[#F8F5ED] border border-[#C6A15B] px-5 py-2.5 text-xs font-medium shadow-xl"
          >
            {toastMessage}
          </div>
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col paper-grain text-[#3b2a1a]">
      <Header
        currentView={currentView}
        onNavigate={handleNavigate}
        language={language}
        onLanguageChange={setLanguage}
        market={market}
        onMarketChange={setMarket}
        cartCount={totalCartItems}
        wishlistCount={wishlist.length}
        onOpenCartDrawer={() => setCartDrawerOpen(true)}
        searchQuery={searchQuery}
        onSearchSubmit={handleSearchSubmit}
        userProfile={userProfile}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
      />

      <main className="flex-1">
        {currentView === 'home' && (
          <HomePage
            language={language}
            market={market}
            products={catalogProducts}
            artisans={ARTISANS_DATA}
            stories={STORIES_DATA}
            wishlist={wishlist}
            onNavigate={handleNavigate}
            onSelectProduct={handleSelectProduct}
            onSelectStory={handleSelectStory}
            onToggleWishlist={handleToggleWishlist}
            onQuickView={handleQuickView}
            onAddToCart={handleAddToCart}
          />
        )}

        {currentView === 'shop' && (
          <ShopPage
            language={language}
            market={market}
            products={catalogProducts}
            initialCategory={shopCategoryFilter}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            wishlist={wishlist}
            onSelectProduct={handleSelectProduct}
            onToggleWishlist={handleToggleWishlist}
            onQuickView={handleQuickView}
            onAddToCart={handleAddToCart}
            verifiedLiveCount={verifiedLiveCount}
          />
        )}

        {currentView === 'product' && (
          <ProductDetailPage
            product={activeProduct}
            artisans={ARTISANS_DATA}
            allProducts={catalogProducts}
            language={language}
            market={market}
            wishlist={wishlist}
            onNavigate={handleNavigate}
            onSelectProduct={handleSelectProduct}
            onToggleWishlist={handleToggleWishlist}
            onQuickView={handleQuickView}
            onAddToCart={handleAddToCart}
          />
        )}

        {currentView === 'artisans' && (
          <ArtisansPage
            language={language}
            market={market}
            artisans={ARTISANS_DATA}
            products={catalogProducts}
            wishlist={wishlist}
            onSelectProduct={handleSelectProduct}
            onToggleWishlist={handleToggleWishlist}
            onQuickView={handleQuickView}
            onAddToCart={handleAddToCart}
          />
        )}

        {(currentView === 'stories' || currentView === 'story-detail') && (
          <StoriesPage
            language={language}
            market={market}
            stories={STORIES_DATA}
            products={catalogProducts}
            activeStoryId={currentView === 'story-detail' ? selectedStoryId : null}
            wishlist={wishlist}
            onSelectStory={handleSelectStory}
            onSelectProduct={handleSelectProduct}
            onToggleWishlist={handleToggleWishlist}
            onQuickView={handleQuickView}
            onAddToCart={handleAddToCart}
          />
        )}

        {currentView === 'about' && (
          <AboutPage language={language} onNavigate={handleNavigate} />
        )}

        {currentView === 'cart' && (
          <CheckoutPage
            cart={cart}
            products={catalogProducts}
            language={language}
            market={market}
            onMarketChange={setMarket}
            onUpdateQuantity={handleUpdateCartQuantity}
            onRemoveItem={handleRemoveCartItem}
            onPlaceOrderSuccess={handlePlaceOrderSuccess}
            onNavigate={handleNavigate}
            userProfile={userProfile}
            onSignIn={handleSignIn}
          />
        )}

        {(currentView === 'wishlist' ||
          currentView === 'orders' ||
          currentView === 'contact' ||
          currentView === 'policies') && (
          <SupportingPages
            activePage={currentView}
            language={language}
            market={market}
            products={catalogProducts}
            wishlist={wishlist}
            liveOrders={liveOrders}
            demoOrders={demoOrders}
            onNavigate={handleNavigate}
            onSelectProduct={handleSelectProduct}
            onToggleWishlist={handleToggleWishlist}
            onQuickView={handleQuickView}
            onAddToCart={handleAddToCart}
            userProfile={userProfile}
            onSignIn={handleSignIn}
            onSignOut={handleSignOut}
            onTriggerToast={triggerToast}
          />
        )}
      </main>

      <Footer
        language={language}
        market={market}
        onNavigate={handleNavigate}
        onLanguageChange={setLanguage}
        onMarketChange={setMarket}
      />

      {/* Slide-Over Shopping Bag Drawer */}
      <CartDrawer
        isOpen={cartDrawerOpen}
        onClose={() => setCartDrawerOpen(false)}
        cart={cart}
        products={catalogProducts}
        language={language}
        market={market}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onProceedToCheckout={() => setCurrentView('cart')}
        onBrowseShop={() => setCurrentView('shop')}
      />

      {/* Quick Product Preview Modal */}
      <QuickViewModal
        product={quickViewProduct}
        language={language}
        market={market}
        onClose={() => setQuickViewProduct(null)}
        onAddToCart={(productId, variantId, qty) => handleAddToCart(productId, variantId, qty)}
        onOpenFullProduct={(productId) => handleSelectProduct(productId)}
      />

      {/* Accessible Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#2B1D19] text-[#F8F5ED] border border-[#C6A15B] px-5 py-2.5 text-xs font-medium shadow-xl"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
