/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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

  // Persistent Cart, Wishlist & Demonstration Orders
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

  const [orders, setOrders] = useState<OrderRecord[]>(() => {
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
    localStorage.setItem('rob_orders', JSON.stringify(orders));
  }, [orders]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2200);
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
    const product = PRODUCTS_DATA.find((p) => p.id === productId);
    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.productId === productId && item.variantId === variantId
      );
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity,
        };
        return updated;
      }
      return [...prev, { productId, variantId, quantity }];
    });

    if (product) {
      triggerToast(`Added "${tText(product.name, language)}" to your bag`);
    }
  };

  const handleUpdateCartQuantity = (productId: number, variantId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.productId === productId && item.variantId === variantId
            ? { ...item, quantity: item.quantity + delta }
            : item
        )
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
    const product = PRODUCTS_DATA.find((p) => p.id === productId);
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

  const handlePlaceDemoOrder = (order: OrderRecord) => {
    setOrders((prev) => [order, ...prev]);
    setCart([]);
    triggerToast(`Demonstration Order #${order.orderId} recorded`);
  };

  const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const activeProduct =
    PRODUCTS_DATA.find((p) => p.id === selectedProductId) || PRODUCTS_DATA[0];

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
      />

      <main className="flex-1">
        {currentView === 'home' && (
          <HomePage
            language={language}
            market={market}
            products={PRODUCTS_DATA}
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
            products={PRODUCTS_DATA}
            initialCategory={shopCategoryFilter}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            wishlist={wishlist}
            onSelectProduct={handleSelectProduct}
            onToggleWishlist={handleToggleWishlist}
            onQuickView={handleQuickView}
            onAddToCart={handleAddToCart}
          />
        )}

        {currentView === 'product' && (
          <ProductDetailPage
            product={activeProduct}
            artisans={ARTISANS_DATA}
            allProducts={PRODUCTS_DATA}
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
            products={PRODUCTS_DATA}
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
            products={PRODUCTS_DATA}
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
            products={PRODUCTS_DATA}
            language={language}
            market={market}
            onMarketChange={setMarket}
            onUpdateQuantity={handleUpdateCartQuantity}
            onRemoveItem={handleRemoveCartItem}
            onPlaceDemoOrder={handlePlaceDemoOrder}
            onNavigate={handleNavigate}
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
            products={PRODUCTS_DATA}
            wishlist={wishlist}
            orders={orders}
            onNavigate={handleNavigate}
            onSelectProduct={handleSelectProduct}
            onToggleWishlist={handleToggleWishlist}
            onQuickView={handleQuickView}
            onAddToCart={handleAddToCart}
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
        products={PRODUCTS_DATA}
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
