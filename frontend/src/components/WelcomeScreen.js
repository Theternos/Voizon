import React, { useState, useEffect } from "react";
import { ArrowRight, Sparkles, Gift } from "lucide-react";
import logo from "../images/logo_bg.png";

const WelcomeScreen = ({ onSaveName }) => {
  const [name, setName] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [showReferral, setShowReferral] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (name.trim()) {
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 1200));
      onSaveName(name.trim(), referralCode.trim());
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && name.trim()) {
      handleSubmit(e);
    }
  };

  return (
    <div className={`welcome-screen ${isMounted ? "mounted" : ""}`}>
      <div className="floating-elements">
        <div className="float-circle circle-1"></div>
        <div className="float-circle circle-2"></div>
        <div className="float-circle circle-3"></div>
        <div className="float-circle circle-4"></div>
      </div>

      <div className="content-wrapper">
        <div className="brand-section">
          <div className="brand-icon">
            <img src={logo} alt="Voizon Logo" className="logo-image" />
          </div>
          <h1 className="brand-title">Voizon</h1>
          <p className="brand-subtitle">Voice On. Game On.</p>
        </div>

        <div className="form-section">
          <div className="welcome-text">
            <h2 className="main-title">Welcome aboard!</h2>
            <p className="subtitle">Let's personalize your experience</p>
          </div>

          <div className="input-group">
            <div className="input-container">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter your name"
                className="name-input"
                disabled={isLoading}
                autoFocus
              />
              <div className="input-underline"></div>
            </div>

            {showReferral && (
              <div className="input-container">
                <input
                  type="text"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                  placeholder="Referral code (optional)"
                  className="name-input"
                  disabled={isLoading}
                />
                <div className="input-underline"></div>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={!name.trim() || isLoading}
              className="submit-button"
            >
              {isLoading ? (
                <div className="loading-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              ) : (
                <>
                  Get Started
                  <ArrowRight size={20} className="arrow-icon" />
                </>
              )}
            </button>

            {!showReferral && (
              <button
                type="button"
                onClick={() => setShowReferral(true)}
                className="referral-button"
              >
                <Gift size={16} />
                <span>Have a referral code?</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .welcome-screen {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(
            135deg,
            #f8fafc 0%,
            #f1f5f9 50%,
            #e2e8f0 100%
          );
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
            "Inter", sans-serif;
          overflow: hidden;
          z-index: 99999;
          opacity: 0;
          transform: scale(0.95);
          transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .welcome-screen.mounted {
          opacity: 1;
          transform: scale(1);
        }

        .floating-elements {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          overflow: hidden;
        }

        .float-circle {
          position: absolute;
          border-radius: 50%;
          background: linear-gradient(
            135deg,
            rgba(59, 130, 246, 0.1),
            rgba(16, 185, 129, 0.05)
          );
          backdrop-filter: blur(20px);
          animation: float 8s ease-in-out infinite;
        }

        .circle-1 {
          width: 200px;
          height: 200px;
          top: 10%;
          left: 10%;
          animation-delay: 0s;
        }

        .circle-2 {
          width: 150px;
          height: 150px;
          top: 20%;
          right: 15%;
          animation-delay: -2s;
        }

        .circle-3 {
          width: 100px;
          height: 100px;
          bottom: 20%;
          left: 20%;
          animation-delay: -4s;
        }

        .circle-4 {
          width: 80px;
          height: 80px;
          bottom: 15%;
          right: 10%;
          animation-delay: -6s;
        }

        .content-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4rem;
          z-index: 1;
          max-width: 600px;
          width: 100%;
          padding: 2rem;
          animation: slideUp 1s ease-out 0.3s both;
          transform: scale(0.8) !important;
        }

        .brand-section {
          text-align: center;
          animation: fadeIn 1s ease-out 0.6s both;
        }

        .brand-icon {
          width: 180px;
          height: 180px;
          display: inline-flex;
        }

        .brand-title {
          font-size: 3.5rem;
          font-weight: 800;
          background: linear-gradient(135deg, #1e293b, #475569);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin: 0 0 0.5rem 0;
          letter-spacing: -0.03em;
        }

        .brand-subtitle {
          font-size: 1.25rem;
          color: #64748b;
          margin: 0;
          font-weight: 400;
        }

        .form-section {
          width: 100%;
          max-width: 400px;
          animation: slideUp 1s ease-out 0.9s both;
        }

        .welcome-text {
          text-align: center;
          margin-bottom: 3rem;
        }

        .main-title {
          font-size: 2.5rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 0.5rem 0;
          line-height: 1.1;
        }

        .subtitle {
          font-size: 1.125rem;
          color: #64748b;
          margin: 0;
          font-weight: 400;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .input-container {
          position: relative;
        }

        .name-input {
          width: 100%;
          padding: 1.5rem 0;
          font-size: 1.5rem;
          font-weight: 500;
          color: #1e293b;
          background: transparent;
          border: none;
          border-bottom: 2px solid #e2e8f0;
          outline: none;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          box-sizing: border-box;
        }

        .name-input::placeholder {
          color: #94a3b8;
          font-weight: 400;
        }

        .name-input:focus {
          border-bottom-color: transparent;
        }

        .name-input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .input-underline {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          transform: scaleX(0);
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          transform-origin: center;
        }

        .name-input:focus + .input-underline {
          transform: scaleX(1);
        }

        .submit-button {
          width: 100%;
          padding: 1.75rem 2rem;
          font-size: 1.25rem;
          font-weight: 600;
          color: white;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          border: none;
          border-radius: 20px;
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          min-height: 70px;
          box-shadow: 0 10px 30px rgba(59, 130, 246, 0.3);
          position: relative;
          overflow: hidden;
        }

        .submit-button::before {
          content: "";
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.2),
            transparent
          );
          transition: left 0.6s;
        }

        .submit-button:hover:not(:disabled)::before {
          left: 100%;
        }

        .submit-button:hover:not(:disabled) {
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          transform: translateY(-3px);
          box-shadow: 0 20px 40px rgba(59, 130, 246, 0.4);
        }

        .submit-button:active:not(:disabled) {
          transform: translateY(-1px);
        }

        .submit-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
          box-shadow: 0 10px 30px rgba(59, 130, 246, 0.2);
        }

        .arrow-icon {
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .submit-button:hover:not(:disabled) .arrow-icon {
          transform: translateX(6px);
        }

        .loading-dots {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .loading-dots span {
          width: 8px;
          height: 8px;
          background: white;
          border-radius: 50%;
          animation: bounce 1.4s ease-in-out infinite both;
        }

        .loading-dots span:nth-child(1) {
          animation-delay: -0.32s;
        }
        .loading-dots span:nth-child(2) {
          animation-delay: -0.16s;
        }
        .loading-dots span:nth-child(3) {
          animation-delay: 0s;
        }

        .referral-button {
          background: none;
          border: none;
          color: #3b82f6;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          font-size: 1.3rem;
          cursor: pointer;
          padding: 0.5rem;
          margin-top: -1rem;
          transition: all 0.3s ease;
          opacity: 0.8;
        }

        .referral-button:hover {
          opacity: 1;
          transform: translateY(-1px);
        }

        .referral-button span {
          font-weight: 500;
        }

        @keyframes float {
          0%,
          100% {
            transform: translateY(0px) rotate(0deg);
          }
          33% {
            transform: translateY(-20px) rotate(120deg);
          }
          66% {
            transform: translateY(10px) rotate(240deg);
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(60px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes pulse {
          0%,
          100% {
            box-shadow: 0 20px 40px rgba(59, 130, 246, 0.3);
          }
          50% {
            box-shadow: 0 25px 50px rgba(59, 130, 246, 0.4);
          }
        }

        @keyframes bounce {
          0%,
          80%,
          100% {
            transform: scale(0);
          }
          40% {
            transform: scale(1);
          }
        }

        @media (max-width: 768px) {
          .content-wrapper {
            gap: 3rem;
            padding: 1.5rem;
          }

          .brand-title {
            font-size: 2.5rem;
          }

          .main-title {
            font-size: 2rem;
          }

          .brand-subtitle,
          .subtitle {
            font-size: 1rem;
          }

          .name-input {
            font-size: 1.25rem;
            padding: 1.25rem 0;
          }

          .submit-button {
            padding: 1.5rem 1.5rem;
            font-size: 1.125rem;
            min-height: 60px;
          }

          .circle-1,
          .circle-2 {
            width: 120px;
            height: 120px;
          }

          .circle-3,
          .circle-4 {
            width: 60px;
            height: 60px;
          }
        }

        @media (max-width: 480px) {
          .brand-title {
            font-size: 2rem;
          }

          .main-title {
            font-size: 1.75rem;
          }

          .content-wrapper {
            gap: 2.5rem;
          }
        }
      `}</style>
    </div>
  );
};

export default WelcomeScreen;