import React, { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  MessageSquare,
  Lightbulb,
  Send,
  Check,
  Star,
  AlertCircle,
  ThumbsUp,
  Bug,
} from "lucide-react";
import { db } from "../firebase/config";
import { collection, addDoc } from "firebase/firestore";

const FeedbackForm = ({ setActiveView, setToastMessage, setShowToast }) => {
  const [activeTab, setActiveTab] = useState("feedback");
  const [feedbackType, setFeedbackType] = useState("general");
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const containerRef = useRef(null);
  const topRef = useRef(null);

  // Scroll to top when component mounts
  useEffect(() => {
    // First try to scroll the window to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Then try to scroll the container to top
    const scrollContainer = () => {
      if (containerRef.current) {
        containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
      if (topRef.current) {
        topRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };
    
    // Try scrolling immediately
    scrollContainer();
    
    // Try again after a short delay to ensure everything is rendered
    const timer = setTimeout(scrollContainer, 100);
    
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Scroll the feedback container to the top when it mounts
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    // Also ensure the window is at the top
    window.scrollTo(0, 0);
    document.documentElement.scrollTo(0, 0);
    
    // Add a small delay and try scrolling again to ensure it works
    const timer = setTimeout(() => {
      if (containerRef.current) {
        containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 50);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Scroll to top after form submission
  useEffect(() => {
    if (isSubmitted && containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [isSubmitted]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setIsSubmitting(true);

    const userEmail =
      localStorage.getItem("userEmail") || "anonymous@unknown.com";

    const payload = {
      title: title.trim(),
      description: description.trim(),
      email: userEmail,
      createdAt: new Date().toISOString(),
    };

    if (activeTab === "feedback") {
      payload.type = feedbackType;
      payload.rating = rating;
    }

    const collectionName =
      activeTab === "feedback" ? "feedbackSubmissions" : "featureRequests";

    try {
      await addDoc(collection(db, collectionName), payload);
      setIsSubmitting(false);
      setToastMessage("Feedback submitted successfully!");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);

      // Reset after showing success
      setTimeout(() => {
        setIsSubmitted(false);
        setTitle("");
        setDescription("");
        setEmail("");
        setRating(0);
        setFeedbackType("general");
      }, 2000);
    } catch (error) {
      console.error("❌ Error submitting form:", error);
      alert("Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  };

  const feedbackTypes = [
    { id: "general", label: "General Feedback", icon: MessageSquare },
    { id: "bug", label: "Bug Report", icon: Bug },
    { id: "improvement", label: "Improvement", icon: ThumbsUp },
    { id: "complaint", label: "Complaint", icon: AlertCircle },
  ];



  return (
    <div className="feedback-container" ref={containerRef}>
      <div ref={topRef} style={{ position: 'absolute', top: 0 }} />
      <div className="feedback-contentt">
        <div className="main-content">
          <div className="sidebar">
            <button className="back-btn" onClick={() => setActiveView("home")}>
              <ArrowLeft size={20} />
              Back to Home
            </button>
            <button
              className={`tab-btn ${activeTab === "feedback" ? "active" : ""}`}
              onClick={() => setActiveTab("feedback")}
            >
              <MessageSquare size={18} />
              Feedback
            </button>
            <button
              className={`tab-btn ${activeTab === "feature" ? "active" : ""}`}
              onClick={() => setActiveTab("feature")}
            >
              <Lightbulb size={18} />
              Feature Request
            </button>
          </div>

          <div className="form-section">
            <div className="section-header">
              <h2>
                {activeTab === "feedback"
                  ? "Share Your Feedback"
                  : "Request a Feature"}
              </h2>
              <p>
                {activeTab === "feedback"
                  ? "Help us improve by sharing your thoughts and experiences."
                  : "Got an idea for a new feature? We'd love to hear about it!"}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="feedback-form">
              {activeTab === "feedback" && (
                <div className="form-group">
                  <label>Feedback Type</label>
                  <div className="feedback-types">
                    {feedbackTypes.map((type) => {
                      const IconComponent = type.icon;
                      return (
                        <button
                          key={type.id}
                          type="button"
                          className={`type-btn ${
                            feedbackType === type.id ? "active" : ""
                          }`}
                          onClick={() => setFeedbackType(type.id)}
                        >
                          <IconComponent size={16} />
                          {type.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeTab === "feedback" && (
                <div className="form-group">
                  <label>Rate Your Experience</label>
                  <div className="rating-container">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        className={`star-btn ${rating >= star ? "active" : ""}`}
                        onClick={() => setRating(star)}
                      >
                        <Star
                          size={24}
                          fill={rating >= star ? "currentColor" : "none"}
                        />
                      </button>
                    ))}
                    {rating > 0 && (
                      <span className="rating-text">
                        {rating === 1 && "Poor"}
                        {rating === 2 && "Fair"}
                        {rating === 3 && "Good"}
                        {rating === 4 && "Very Good"}
                        {rating === 5 && "Excellent"}
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>
                  {activeTab === "feedback"
                    ? "Feedback Title"
                    : "Feature Title"}{" "}
                  *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={
                    activeTab === "feedback"
                      ? "Brief summary of your feedback..."
                      : "What feature would you like to see?"
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label>
                  {activeTab === "feedback" ? "Details" : "Description"} *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={
                    activeTab === "feedback"
                      ? "Please provide more details about your feedback..."
                      : "Describe the feature and how it would be useful..."
                  }
                  rows={6}
                  required
                />
              </div>

              <button
                type="submit"
                className="submit-btn"
                disabled={isSubmitting || !title.trim() || !description.trim()}
              >
                {isSubmitting ? (
                  "Submitting..."
                ) : (
                  <>
                    <Send size={16} />
                    Submit{" "}
                    {activeTab === "feedback" ? "Feedback" : "Feature Request"}
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
      <style jsx>{`
        .feedback-container {
          min-height: 100vh;
          background: #f8fafc;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
            sans-serif;
          margin-top: 12vh;
          margin-left: 10vw;
          margin-right: 10vw;
        }

        .feedback-contentt {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
        }

        .feedback-header {
          margin-bottom: 2rem;
        }

        .back-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: none;
          border: none;
          color: #1e293b;
          cursor: pointer;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          font-size: 0.875rem;
          transition: all 0.2s;
          width: 100%;
          margin-bottom: 1.2rem;
        }

        .back-btn:hover {
          background: #f1f5f9;
          color: #0f172a;
        }

        .main-content {
          display: flex;
          gap: 2rem;
        }

        .sidebar {
          width: 240px;
          background: white;
          border-radius: 12px;
          padding: 1rem;
          height: fit-content;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .tab-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          background: none;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.875rem;
          color: #64748b;
          transition: all 0.2s;
          margin-bottom: 0.25rem;
        }

        .tab-btn:hover {
          background: #f1f5f9;
          color: #1e293b;
        }

        .tab-btn.active {
          background: #f1f5f9;
          color: #1e293b;
          font-weight: 500;
        }

        .form-section {
          flex: 1;
          background: white;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .section-header {
          padding: 2rem 2rem 1rem 2rem;
          border-bottom: 1px solid #e2e8f0;
        }

        .section-header h2 {
          margin: 0 0 0.5rem 0;
          color: #1e293b;
          font-size: 1.5rem;
          font-weight: 600;
        }

        .section-header p {
          margin: 0;
          color: #64748b;
          line-height: 1.5;
        }

        .feedback-form {
          padding: 2rem;
          max-width: 600px;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          color: #1e293b;
          font-weight: 500;
          font-size: 0.875rem;
        }

        .feedback-types {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 0.75rem;
        }

        .type-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          color: #64748b;
          cursor: pointer;
          font-size: 0.875rem;
          transition: all 0.2s;
        }

        .type-btn:hover {
          background: #f1f5f9;
          border-color: #cbd5e1;
        }

        .type-btn.active {
          background: #dbeafe;
          border-color: #3b82f6;
          color: #1e40af;
        }

        .rating-container {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .star-btn {
          background: none;
          border: none;
          color: #e2e8f0;
          cursor: pointer;
          padding: 0.25rem;
          border-radius: 4px;
          transition: color 0.2s;
        }

        .star-btn:hover {
          color: #fbbf24;
        }

        .star-btn.active {
          color: #f59e0b;
        }

        .rating-text {
          margin-left: 0.5rem;
          color: #64748b;
          font-size: 0.875rem;
          font-weight: 500;
        }

        input,
        textarea {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.875rem;
          color: #1e293b;
          transition: border-color 0.2s;
          font-family: inherit;
        }

        input:focus,
        textarea:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        input::placeholder,
        textarea::placeholder {
          color: #94a3b8;
        }

        textarea {
          resize: vertical;
          min-height: 120px;
        }

        small {
          display: block;
          margin-top: 0.25rem;
          color: #94a3b8;
          font-size: 0.75rem;
        }

        .submit-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.875rem 1.5rem;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          margin-top: 1rem;
        }

        .submit-btn:hover:not(:disabled) {
          background: #2563eb;
        }

        .submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .feedback-contentt {
            padding: 1rem;
          }

          .main-content {
            flex-direction: column;
          }

          .sidebar {
            width: 100%;
            display: flex;
            overflow-x: auto;
            padding: 0.5rem;
          }

          .tab-btn {
            white-space: nowrap;
            min-width: auto;
          }

          .feedback-types {
            grid-template-columns: 1fr;
          }

          .rating-container {
            flex-wrap: wrap;
          }

          .section-header,
          .feedback-form {
            padding: 1.5rem 1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default FeedbackForm;
