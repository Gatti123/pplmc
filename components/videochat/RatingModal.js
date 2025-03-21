import { useState } from 'react';
import { FaStar, FaTimes } from 'react-icons/fa';
import { db } from '../../lib/firebase';
import { doc, updateDoc, arrayUnion, increment } from 'firebase/firestore';
import { toast } from 'react-toastify';

const RatingModal = ({ isOpen, onClose, roomDetails, partnerId }) => {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    setSubmitting(true);
    try {
      // Update partner's profile with the rating
      const partnerRef = doc(db, 'users', partnerId);
      await updateDoc(partnerRef, {
        totalRating: increment(rating),
        ratingCount: increment(1),
        ratings: arrayUnion({
          rating,
          feedback,
          timestamp: new Date().toISOString(),
          roomId: roomDetails.roomId,
          topic: roomDetails.topic
        })
      });

      // Update room with the rating
      const roomRef = doc(db, 'rooms', roomDetails.id);
      await updateDoc(roomRef, {
        ratings: arrayUnion({
          from: partnerId,
          rating,
          feedback,
          timestamp: new Date().toISOString()
        })
      });

      toast.success('Thank you for your feedback!');
      onClose();
    } catch (error) {
      console.error('Error submitting rating:', error);
      toast.error('Failed to submit rating');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-primary">Rate Your Discussion Partner</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              How would you rate this discussion?
            </label>
            <div className="flex justify-center space-x-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  className="focus:outline-none"
                >
                  <FaStar
                    className={`w-8 h-8 ${
                      value <= rating
                        ? 'text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Feedback (Optional)
            </label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="input-field"
              rows="3"
              placeholder="Share your thoughts about the discussion..."
            />
          </div>

          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit Rating'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RatingModal; 