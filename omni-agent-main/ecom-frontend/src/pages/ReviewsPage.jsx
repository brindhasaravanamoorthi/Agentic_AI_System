import { Star, ThumbsUp } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getProducts } from '../lib/api'; // Using products to simulate fetching all reviews

export default function ReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  // Simulate fetching all reviews by aggregating product reviews
  // In a real app, you'd have an endpoint like GET /reviews
  useEffect(() => {
    async function load() {
      try {
        const res = await getProducts();
        const products = res.data?.data?.products || [];
        // Generate simulated reviews for demo purposes since we might not have a dedicated endpoint yet
        const simulatedReviews = products.flatMap(p => [
          {
            id: `r-${p.id}-1`,
            productName: p.name,
            user: "Alice M.",
            rating: 5,
            comment: "Absolutely love the quality! Fits perfectly.",
            date: "2 days ago",
            likes: 12
          },
          {
            id: `r-${p.id}-2`,
            productName: p.name,
            user: "John D.",
            rating: 4,
            comment: "Great material, but shipping was a bit slow.",
            date: "1 week ago",
            likes: 4
          }
        ]);
        setReviews(simulatedReviews);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="container mx-auto px-4 py-12 animate-fade-in">
      <div className="text-center max-w-2xl mx-auto mb-16">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">What Customers Say</h1>
        <p className="text-lg text-slate-600">Real feedback from our community of style enthusiasts.</p>
      </div>

      {loading ? (
        <div className="text-center text-slate-500">Loading reviews...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {reviews.map((review) => (
            <div key={review.id} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-1 text-yellow-500 mb-4">
                {[...Array(review.rating)].map((_, i) => <Star key={i} className="w-5 h-5 fill-current" />)}
              </div>
              <p className="text-slate-700 text-lg mb-6 leading-relaxed">"{review.comment}"</p>

              <div className="flex items-center justify-between mt-auto pt-6 border-t border-slate-100">
                <div>
                  <div className="font-bold text-slate-900">{review.user}</div>
                  <div className="text-xs text-slate-500">on <span className="font-medium text-blue-600">{review.productName}</span></div>
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-1">
                  <ThumbsUp className="w-3 h-3" /> {review.likes}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
