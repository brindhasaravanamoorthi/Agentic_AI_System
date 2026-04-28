import { Mail, Phone, MapPin, Send, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { submitSupportTicket } from '../lib/api';

export default function SupportPage() {
  const [formData, setFormData] = useState({ name: '', email: '', subject: 'General Inquiry', message: '' });
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await submitSupportTicket({
        name: formData.name,
        email: formData.email,
        subject: formData.subject,
        message: formData.message,
      });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to send message. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 animate-fade-in">
      <div className="flex flex-col items-center mb-10">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-6 h-px bg-neutral-300" />
          <span className="text-xs uppercase tracking-wider text-neutral-500">Contact Us</span>
          <span className="w-6 h-px bg-neutral-300" />
        </div>
        <h1 className="text-2xl font-semibold text-neutral-900">We're Here to Help</h1>
        <p className="text-sm text-neutral-500 mt-1 max-w-md text-center">
          Have questions? Our support team is ready to assist you.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="space-y-6">
          <div className="p-5 bg-neutral-50 rounded-lg border border-neutral-100">
            <h3 className="font-semibold text-neutral-900 text-sm mb-2 flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-neutral-700" strokeWidth={1.5} /> Returns & Refunds
            </h3>
            <p className="text-neutral-600 text-sm mb-3">Need to return an item or request a refund? We offer a 30-day return policy.</p>
            <Link to="/returns" className="inline-flex items-center gap-1.5 text-neutral-900 text-sm font-medium hover:underline">
              Request Return or Refund <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.5} />
            </Link>
          </div>

          <div className="space-y-5">
            <div className="flex items-start gap-3">
              <div className="bg-neutral-100 p-2.5 rounded-full shrink-0">
                <Phone className="w-4 h-4 text-neutral-700" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900 text-sm">Call Us</h3>
                <p className="text-neutral-600 text-sm">+91 98765 43210</p>
                <p className="text-xs text-neutral-400">Mon–Sat, 10am – 7pm IST</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-neutral-100 p-2.5 rounded-full shrink-0">
                <Mail className="w-4 h-4 text-neutral-700" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900 text-sm">Email Us</h3>
                <p className="text-neutral-600 text-sm">support@lumiere.com</p>
                <p className="text-xs text-neutral-400">We reply within 24 hours</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-neutral-100 p-2.5 rounded-full shrink-0">
                <MapPin className="w-4 h-4 text-neutral-700" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900 text-sm">Visit Us</h3>
                <p className="text-neutral-600 text-sm">123 MG Road, Koramangala</p>
                <p className="text-neutral-600 text-sm">Bengaluru 560034</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-neutral-50 p-6 rounded-lg border border-neutral-100">
          <h2 className="text-lg font-semibold text-neutral-900 mb-5">Send a Message</h2>
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-xs">{error}</div>
          )}
          {sent ? (
            <div className="bg-green-50 text-green-800 p-5 rounded-lg text-center border border-green-100">
              <p className="font-semibold text-sm mb-1">Message Sent!</p>
              <p className="text-sm">Thank you for reaching out. We'll get back to you shortly.</p>
              <button onClick={() => setSent(false)} className="mt-3 text-green-700 text-xs font-medium hover:underline">Send another</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Subject</label>
                <select
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-neutral-200 focus:ring-2 focus:ring-neutral-400 focus:border-neutral-400 outline-none"
                >
                  <option value="General Inquiry">General Inquiry</option>
                  <option value="Order Question">Order Question</option>
                  <option value="Shipping">Shipping</option>
                  <option value="Sizing">Sizing</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Your Name</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-neutral-200 focus:ring-2 focus:ring-neutral-400 focus:border-neutral-400 outline-none"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-neutral-200 focus:ring-2 focus:ring-neutral-400 focus:border-neutral-400 outline-none"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="your@email.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Message</label>
                <textarea
                  required
                  rows="4"
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-neutral-200 focus:ring-2 focus:ring-neutral-400 focus:border-neutral-400 outline-none resize-none"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="How can we help?"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-neutral-900 text-white text-sm font-semibold py-3 rounded-lg hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {submitting ? 'Sending...' : <>Send Message <Send className="w-4 h-4" strokeWidth={1.5} /></>}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
