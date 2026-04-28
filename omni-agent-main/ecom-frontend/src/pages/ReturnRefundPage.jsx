import { useState, useEffect } from 'react';
import { getOrders, createReturnRequest } from '../lib/api';
import { Link } from 'react-router-dom';
import { ArrowLeft, Package, CheckCircle, AlertCircle } from 'lucide-react';

const RETURN_REASONS = [
  { value: 'wrong_size', label: 'Wrong size' },
  { value: 'defective', label: 'Defective or damaged' },
  { value: 'not_as_described', label: 'Not as described' },
  { value: 'changed_mind', label: 'Changed my mind' },
  { value: 'other', label: 'Other' },
];

export default function ReturnRefundPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    orderId: '',
    email: '',
    type: 'return',
    reason: '',
    reasonDetail: '',
    notes: '',
  });

  const CUSTOMER_ID = 'demo-customer-001';

  useEffect(() => {
    async function load() {
      try {
        const res = await getOrders(CUSTOMER_ID);
        if (res.data?.data) setOrders(res.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await createReturnRequest({
        orderId: form.orderId,
        customerId: CUSTOMER_ID,
        email: form.email,
        type: form.type,
        reason: form.reason,
        reasonDetail: form.reasonDetail || undefined,
        notes: form.notes || undefined,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="container mx-auto px-4 py-20 text-center animate-fade-in max-w-lg">
        <div className="bg-green-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Request Submitted</h1>
        <p className="text-slate-600 mb-8">
          Thank you. Your {form.type} request has been received. Our team will review it and contact you within 2-3 business days.
        </p>
        <div className="flex gap-4 justify-center">
          <Link to="/support" className="text-blue-600 hover:underline">Back to Support</Link>
          <Link to="/orders" className="text-blue-600 hover:underline">View Orders</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 animate-fade-in max-w-2xl">
      <Link to="/support" className="flex items-center gap-2 text-slate-500 hover:text-slate-900 mb-8 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Support
      </Link>

      <h1 className="text-4xl font-bold text-slate-900 mb-2">Returns & Refunds</h1>
      <p className="text-slate-600 mb-10">
        We offer a 30-day return policy. Request a return or refund for your order below.
      </p>

      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading your orders...</div>
      ) : orders.length === 0 ? (
        <div className="bg-slate-50 rounded-xl p-8 text-center">
          <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">No orders found</h2>
          <p className="text-slate-600 mb-6">You need to have placed an order before requesting a return or refund.</p>
          <Link to="/shop" className="text-blue-600 hover:underline font-medium">Start Shopping</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 text-red-700 p-4 rounded-lg">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
            <input
              type="email"
              required
              placeholder="your@email.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <p className="text-xs text-slate-500 mt-1">We'll use this to send updates about your request.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Select Order</label>
            <select
              required
              value={form.orderId}
              onChange={(e) => setForm({ ...form, orderId: e.target.value })}
              className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="">Choose an order...</option>
              {orders.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.orderNumber} - ₹{order.total.toFixed(2)} ({new Date(order.createdAt).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Request Type</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value="return"
                  checked={form.type === 'return'}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="rounded-full"
                />
                <span>Return (exchange or store credit)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value="refund"
                  checked={form.type === 'refund'}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="rounded-full"
                />
                <span>Refund (money back)</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Reason</label>
            <select
              required
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="">Select a reason...</option>
              {RETURN_REASONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Additional Details (optional)</label>
            <textarea
              rows="4"
              placeholder="Provide any additional information..."
              value={form.reasonDetail}
              onChange={(e) => setForm({ ...form, reasonDetail: e.target.value })}
              className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes (optional)</label>
            <textarea
              rows="2"
              placeholder="Any other notes..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-slate-900 text-white py-4 rounded-lg font-bold hover:bg-slate-800 transition-colors disabled:opacity-70"
          >
            {submitting ? 'Submitting...' : 'Submit Request'}
          </button>
        </form>
      )}
    </div>
  );
}
