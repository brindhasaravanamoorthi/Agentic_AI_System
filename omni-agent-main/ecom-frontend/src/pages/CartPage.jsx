import { useState, useEffect } from 'react';
import { getCart, updateCartItem, removeCartItem } from '../lib/api';
import { Link } from 'react-router-dom';
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag } from 'lucide-react';

const CUSTOMER_ID = 'demo-customer-001';

export default function CartPage() {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState({});

  const fetchCart = async () => {
    try {
      const res = await getCart(CUSTOMER_ID);
      setCart(res.data?.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  const handleUpdate = async (itemId, currentQty, delta) => {
    setUpdating({ ...updating, [itemId]: true });
    try {
      const newQty = Math.max(1, currentQty + delta);
      await updateCartItem(itemId, newQty);
      await fetchCart();
    } catch (err) {
      alert('Failed to update cart');
    } finally {
      setUpdating({ ...updating, [itemId]: false });
    }
  };

  const handleRemove = async (itemId) => {
    setUpdating({ ...updating, [itemId]: true });
    try {
      await removeCartItem(itemId);
      await fetchCart();
    } catch (err) {
      alert('Failed to remove item');
    } finally {
      setUpdating({ ...updating, [itemId]: false });
    }
  };

  if (loading) return <div className="p-12 text-center text-slate-500">Loading cart...</div>;

  if (!cart || !cart.items || cart.items.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center animate-fade-in">
        <div className="bg-neutral-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShoppingBag className="w-8 h-8 text-neutral-400" />
        </div>
        <h1 className="text-xl font-semibold text-neutral-900 mb-2">Your bag is empty</h1>
        <p className="text-neutral-500 text-sm mb-6">Looks like you haven't added anything to your cart yet.</p>
        <Link to="/shop" className="inline-flex items-center gap-1.5 bg-neutral-900 text-white px-6 py-2.5 text-sm font-medium rounded hover:bg-neutral-800 transition-colors">
          Start Shopping <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-fade-in">
      <h1 className="text-xl font-semibold text-neutral-900 mb-6">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {cart.items.map((item) => (
            <div key={item.id} className="flex gap-4 p-4 bg-white border border-neutral-100 rounded-lg">
              <div className="w-20 h-20 bg-neutral-100 rounded overflow-hidden shrink-0">
{item.variant.images?.[0] ? (
                    <img src={item.variant.images[0]} alt={item.variant.product?.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-300 text-xs">No Img</div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                  <Link to={`/product/${item.variant.product?.id}`} className="font-medium text-neutral-900 text-sm hover:text-neutral-600 transition-colors truncate">
                    {item.variant.product?.name}
                  </Link>
                  <p className="font-medium text-neutral-900 text-sm">₹{item.subtotal.toFixed(2)}</p>
                </div>
                <p className="text-neutral-500 text-xs mb-3">Size: {item.variant.size}</p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 bg-neutral-100 rounded p-1">
                    <button
                      onClick={() => handleUpdate(item.id, item.quantity, -1)}
                      disabled={updating[item.id] || item.quantity <= 1}
                      className="p-1 hover:bg-white rounded shadow-sm disabled:opacity-50 transition-colors"
                    >
                      <Minus className="w-4 h-4 text-slate-600" />
                    </button>
                    <span className="font-medium w-8 text-center">{item.quantity}</span>
                    <button
                      onClick={() => handleUpdate(item.id, item.quantity, 1)}
                      disabled={updating[item.id]}
                      className="p-1 hover:bg-white rounded shadow-sm disabled:opacity-50 transition-colors"
                    >
                      <Plus className="w-4 h-4 text-slate-600" />
                    </button>
                  </div>

                  <button
                    onClick={() => handleRemove(item.id)}
                    disabled={updating[item.id]}
                    className="text-red-500 hover:text-red-700 transition-colors p-2"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-neutral-50 p-6 rounded-lg h-fit">
          <h2 className="text-base font-semibold text-neutral-900 mb-4">Order Summary</h2>

          <div className="space-y-2 mb-4 border-b border-neutral-200 pb-4 text-xs">
            <div className="flex justify-between text-neutral-600">
              <span>Subtotal</span>
              <span>₹{cart.summary.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Shipping</span>
              <span>{cart.summary.shipping === 0 ? 'Free' : `₹${cart.summary.shipping.toFixed(2)}`}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Tax</span>
              <span>₹{cart.summary.tax.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex justify-between text-sm font-semibold text-neutral-900 mb-6">
            <span>Total</span>
            <span>₹{cart.summary.total.toFixed(2)}</span>
          </div>

          <Link
            to="/checkout"
            className="block w-full bg-neutral-900 text-white text-center py-3 rounded text-sm font-medium hover:bg-neutral-800 transition-colors"
          >
            Checkout
          </Link>
          <div className="mt-3 text-center text-[10px] text-neutral-400">
            Secure checkout powered by Stripe
          </div>
        </div>
      </div>
    </div>
  );
}
