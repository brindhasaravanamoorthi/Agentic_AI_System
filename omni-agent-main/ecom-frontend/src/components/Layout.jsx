import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, Menu, X, Search, User, Heart } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getCart } from '../lib/api';

export default function Layout({ children }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const location = useLocation();
  const CUSTOMER_ID = 'demo-customer-001';

  useEffect(() => {
    const fetchCart = async () => {
      try {
        const res = await getCart(CUSTOMER_ID);
        setCartCount(res.data?.data?.items?.length || 0);
      } catch (e) {
        console.error("Failed to fetch cart count", e);
      }
    };
    fetchCart();
    const interval = setInterval(fetchCart, 5000);
    return () => clearInterval(interval);
  }, []);

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen flex flex-col bg-white text-neutral-800">
      {/* Top Bar - Flone style */}
      <div className="bg-neutral-100 text-neutral-600 text-xs py-2">
        <div className="max-w-6xl mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <span className="cursor-pointer">English ▾</span>
            <span className="cursor-pointer">INR ▾</span>
            <span>Call Us +91 98765 43210</span>
          </div>
          <span>Free delivery on order over ₹2,000</span>
        </div>
      </div>

      {/* Main Nav - White, compact */}
      <header className="sticky top-0 z-50 bg-white border-b border-neutral-200">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button className="md:hidden p-1" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <Link to="/" className="text-xl font-semibold text-neutral-900 tracking-tight">
              LUMIÈRE
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-neutral-600">
            <Link to="/" className={`hover:text-neutral-900 ${isActive('/') ? 'text-neutral-900' : ''}`}>Home</Link>
            <Link to="/shop" className={`hover:text-neutral-900 ${isActive('/shop') ? 'text-neutral-900' : ''}`}>Shop ▾</Link>
            <Link to="/shop?category=clothing" className="hover:text-neutral-900">Collection</Link>
            <Link to="/orders" className={`hover:text-neutral-900 ${isActive('/orders') ? 'text-neutral-900' : ''}`}>Orders</Link>
            <Link to="/support" className={`hover:text-neutral-900 ${isActive('/support') ? 'text-neutral-900' : ''}`}>Contact</Link>
            <a href="http://localhost:5173" target="_blank" rel="noopener noreferrer" className="hover:text-neutral-900 text-blue-600">AI Assistant</a>
          </nav>

          <div className="flex items-center gap-1">
            <button className="p-2 hover:bg-neutral-100 rounded transition-colors text-neutral-600">
              <Search className="w-4 h-4" />
            </button>
            <button className="p-2 hover:bg-neutral-100 rounded transition-colors text-neutral-600">
              <Heart className="w-4 h-4" />
            </button>
            <button className="p-2 hover:bg-neutral-100 rounded transition-colors text-neutral-600">
              <User className="w-4 h-4" />
            </button>
            <Link to="/cart" className="relative p-2 hover:bg-neutral-100 rounded transition-colors text-neutral-600">
              <ShoppingCart className="w-4 h-4" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-neutral-900 text-white text-[10px] font-medium flex items-center justify-center rounded-full">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {isMenuOpen && (
          <div className="md:hidden border-t border-neutral-100 bg-white">
            <nav className="flex flex-col p-4 space-y-3 text-sm">
              <Link to="/" onClick={() => setIsMenuOpen(false)}>Home</Link>
              <Link to="/shop" onClick={() => setIsMenuOpen(false)}>Shop</Link>
              <Link to="/orders" onClick={() => setIsMenuOpen(false)}>Orders</Link>
              <Link to="/support" onClick={() => setIsMenuOpen(false)}>Support</Link>
              <Link to="/returns" onClick={() => setIsMenuOpen(false)}>Returns</Link>
              <a href="http://localhost:5173" target="_blank" rel="noopener noreferrer" onClick={() => setIsMenuOpen(false)}>AI Assistant</a>
              <Link to="/cart" onClick={() => setIsMenuOpen(false)}>Cart ({cartCount})</Link>
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1">
        {children}
      </main>

      {/* Footer - Flone style */}
      <footer className="bg-neutral-100 text-neutral-600 mt-auto">
        <div className="max-w-6xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-neutral-900 font-semibold text-base mb-3">LUMIÈRE</h3>
            <p className="text-xs">© 2026 Lumière. All Rights Reserved</p>
          </div>
          <div>
            <h4 className="text-neutral-900 font-semibold text-xs uppercase mb-3">About Us</h4>
            <ul className="space-y-2 text-xs">
              <li><Link to="/support" className="hover:text-neutral-900">About us</Link></li>
              <li><Link to="/support" className="hover:text-neutral-900">Store location</Link></li>
              <li><Link to="/support" className="hover:text-neutral-900">Contact</Link></li>
              <li><Link to="/orders" className="hover:text-neutral-900">Orders tracking</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-neutral-900 font-semibold text-xs uppercase mb-3">Useful Links</h4>
            <ul className="space-y-2 text-xs">
              <li><Link to="/returns" className="hover:text-neutral-900">Returns</Link></li>
              <li><Link to="/support" className="hover:text-neutral-900">Support Policy</Link></li>
              <li><Link to="/support" className="hover:text-neutral-900">Size guide</Link></li>
              <li><Link to="/support" className="hover:text-neutral-900">FAQs</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-neutral-900 font-semibold text-xs uppercase mb-3">Follow Us</h4>
            <p className="text-xs mb-2">Facebook · Twitter · Instagram · Youtube</p>
            <div className="text-xs mb-2">Get E-mail updates about our latest shop and special offers.</div>
            <div className="flex gap-1">
              <input type="email" placeholder="Enter your email" className="flex-1 px-3 py-2 text-xs border border-neutral-200 rounded focus:outline-none focus:ring-1 focus:ring-neutral-400" />
              <button className="px-4 py-2 bg-neutral-900 text-white text-xs font-medium rounded hover:bg-neutral-800">Subscribe</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
