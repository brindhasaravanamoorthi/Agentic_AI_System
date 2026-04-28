import { useState, useEffect } from 'react';
import { getCart, checkout } from '../lib/api';
import { CheckCircle, Loader } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function CheckoutPage() {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState(null);
  const [email, setEmail] = useState('');
  const navigate = useNavigate();

  const CUSTOMER_ID = 'demo-customer-001';

  useEffect(() => {
    async function load() {
      try {
        const res = await getCart(CUSTOMER_ID);
        setCart(res.data?.data);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleCheckout = async (e) => {
    e.preventDefault();
    setProcessing(true);

    // Simulate API delay
    await new Promise(r => setTimeout(r, 1500));

    try {
      const res = await checkout(CUSTOMER_ID, email.trim() || undefined);
      setOrderComplete(res.data?.data);
    } catch (err) {
      alert('Checkout failed: ' + (err.response?.data?.error?.message || err.message));
      setProcessing(false);
    }
  };

  if (loading) return <div className="p-12 text-center">Loading...</div>;

  if (orderComplete) {
    return (
      <div className="container mx-auto px-4 py-20 text-center animate-fade-in max-w-lg">
        <div className="bg-green-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Order Confirmed!</h1>
        <p className="text-slate-500 mb-8">Thank you for your purchase. Your order #{orderComplete.orderNumber} has been placed.</p>

        <div className="bg-slate-50 rounded-xl p-6 mb-8 text-left">
          <div className="flex justify-between mb-2">
            <span className="text-slate-500">Amount Paid:</span>
            <span className="font-bold">₹{orderComplete.total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Estimated Delivery:</span>
            <span className="font-bold">3-5 Business Days</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 justify-center">
          <Link to="/shop" className="inline-block bg-slate-900 text-white px-8 py-3 rounded-full font-bold hover:bg-slate-800 transition-colors">
            Continue Shopping
          </Link>
          <Link to="/orders" className="inline-block bg-slate-100 text-slate-900 px-8 py-3 rounded-full font-bold hover:bg-slate-200 transition-colors">
            View Orders
          </Link>
        </div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return <div className="p-12 text-center">Your cart is empty. <Link to="/" className="text-blue-600">Go shopping</Link></div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 animate-fade-in">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div>
          <form id="checkout-form" onSubmit={handleCheckout} className="space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-4">Contact & Shipping</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="your@email.com"
                  />
                  <p className="text-xs text-slate-500 mt-1">Order confirmation and updates will be sent here.</p>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                  <input type="text" required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="John Doe" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                  <input type="text" required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="123 Main St" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                  <input type="text" required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="New York" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Zip Code</label>
                  <input type="text" required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="10001" />
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-4">Payment Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Card Number</label>
                  <input type="text" required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="4242 4242 4242 4242" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Expiry</label>
                    <input type="text" required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="MM/YY" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">CVC</label>
                    <input type="text" required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="123" />
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>

        <div>
          <div className="bg-slate-50 p-6 rounded-xl">
            <h2 className="text-xl font-bold mb-4">Your Order</h2>
            <div className="space-y-4 mb-4 max-h-60 overflow-y-auto pr-2">
              {cart.items.map(item => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>{item.quantity}x {item.variant.product.name} ({item.variant.size})</span>
                  <span className="font-medium">₹{item.subtotal.toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-200 pt-4 space-y-2 mb-6">
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>₹{cart.summary.total.toFixed(2)}</span>
              </div>
            </div>

            <button
              type="submit"
              form="checkout-form"
              disabled={processing}
              className="w-full bg-blue-600 text-white py-4 rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {processing ? <><Loader className="w-5 h-5 animate-spin" /> Processing...</> : 'Place Order'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
