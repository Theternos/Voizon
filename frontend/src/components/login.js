import React, { useState, useEffect } from "react";
import "../styles/login.css";
import { Navigate } from "react-router-dom";
import { db, auth, provider } from "../firebase/config";
import logo from "../images/logo_bg.png";
import { getAuth, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { collection, addDoc, getDocs, query, where, updateDoc, doc } from "firebase/firestore";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";

const LoginComponent = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [userPhoto, setUserPhoto] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [value, setValue] = useState("");
  const [email, setEmail] = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [existingUser, setExistingUser] = useState(null);
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");

  // New OTP related states
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otp, setOtp] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [userDocId, setUserDocId] = useState("");
  const [isNewUser, setIsNewUser] = useState(false);

  const backend_url = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    const email = localStorage.getItem("userEmail");
    const name = localStorage.getItem("userName");
    const photo = localStorage.getItem("userPhoto");

    if (email) {
      setUserEmail(email);
      setUserName(name || "Guest");
      setUserPhoto(photo || "");
      setIsLoggedIn(true);
      handlePostLogin(email);
    }
  }, []);

  // Generate 6-digit OTP
  const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  // Send OTP via email
  const sendOtpEmail = async (email, otpCode) => {
    try {
      if (!backend_url) {
        console.log('Development mode - OTP:', otpCode);
        return true;
      }

      const response = await fetch(`${backend_url}/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          otp: otpCode
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error('Error sending OTP:', error);
      // For demo purposes, we'll just log the OTP
      console.log('Development mode - OTP:', otpCode);
      return true;
    }
  };

  // Email validation function
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError("");

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      setValue(user.email);
      localStorage.setItem("userEmail", user.email);
      localStorage.setItem("userName", user.displayName || "Guest");
      localStorage.setItem("userPhoto", user.photoURL || "");

      setIsLoggedIn(true);
      await handlePostLogin(user.email, user.displayName || "Guest");
      setUserEmail(user.email);
      setUserName(user.displayName || "Guest");
      setUserPhoto(user.photoURL || "");
    } catch (error) {
      console.error("Error during Google sign-in:", error);
      // Check if the error is due to popup being closed
      if (error.code === 'auth/cancelled-popup-request' ||
        error.code === 'auth/popup-closed-by-user') {
        setError("Sign in cancelled");
      } else {
        setError("Google sign-in failed. Please try again.");
      }
    } finally {
      setLoading(false); // Always reset loading state
    }
  };

  const handlePostLogin = async (email, fallbackName = "Guest") => {
    try {
      const q = query(collection(db, "users"), where("email", "==", email));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const userDoc = snapshot.docs[0];
        const data = userDoc.data();

        if (!data.userName || data.userName === "Guest") {
          localStorage.setItem("promptForName", "true");
        } else {
          localStorage.setItem("userName", data.userName);
        }

        localStorage.setItem("userEmail", email);
      } else {
        localStorage.setItem("userEmail", email);
        localStorage.setItem("userName", fallbackName);
        localStorage.setItem("promptForName", "true");

        await addDoc(collection(db, "users"), {
          email,
          userName: fallbackName,
          createdAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Error in handlePostLogin:", error);
      // Continue with login even if this fails
      localStorage.setItem("userEmail", email);
      localStorage.setItem("userName", fallbackName);
    }
  };

  // Fix: Remove the problematic useEffect that was causing infinite re-renders
  useEffect(() => {
    const storedEmail = localStorage.getItem("userEmail");
    if (storedEmail && !value) {
      setValue(storedEmail);
    }
  }, []); // Empty dependency array to run only once

  const handleEmailSubmit = async () => {
    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    if (!isValidEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const q = query(collection(db, "users"), where("email", "==", email.toLowerCase()));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        // User exists
        const userDoc = snapshot.docs[0];
        const userData = userDoc.data();
        setExistingUser(userData);
        setUserDocId(userDoc.id);
        setIsNewUser(false);

        // Check if user has password
        if (userData.password) {
          // User has password - show password input
          setEmailSubmitted(true);
          setShowOtpInput(false);
        } else {
          // User exists but no password - send OTP
          const otpCode = generateOtp();
          setGeneratedOtp(otpCode);

          const otpSent = await sendOtpEmail(email, otpCode);
          if (otpSent) {
            setShowOtpInput(true);
            setEmailSubmitted(true);
          } else {
            setError("Failed to send OTP. Please try again.");
          }
        }
      } else {
        // New user - send OTP
        setExistingUser(null);
        setIsNewUser(true);

        const otpCode = generateOtp();
        setGeneratedOtp(otpCode);

        const otpSent = await sendOtpEmail(email, otpCode);
        if (otpSent) {
          setShowOtpInput(true);
          setEmailSubmitted(true);
        } else {
          setError("Failed to send OTP. Please try again.");
        }
      }
    } catch (err) {
      console.error("Error checking user:", err);
      setError("Failed to verify email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerification = async () => {
    if (!otp.trim()) {
      setError("Please enter the OTP code");
      return;
    }

    if (otp.length !== 6) {
      setError("OTP must be 6 digits");
      return;
    }

    setLoading(true);
    setError("");

    if (otp !== generatedOtp) {
      setError("Invalid OTP. Please try again.");
      setLoading(false);
      return;
    }

    setOtpVerified(true);
    setShowOtpInput(false);
    setLoading(false);
  };

  const handleAuth = async () => {
    if (!password.trim()) {
      setError("Please enter your password");
      return;
    }

    setLoading(true);
    setError("");

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{6,}$/;

    try {
      if (existingUser && existingUser.password) {
        // Existing user with password - login
        if (password !== existingUser.password) {
          setError("Incorrect password");
          setLoading(false);
          return;
        }

        localStorage.setItem("userEmail", email.toLowerCase());
        setUserEmail(email.toLowerCase());
        setUserName(existingUser.userName || "Guest");
        setIsLoggedIn(true);
        await handlePostLogin(email.toLowerCase(), existingUser.userName || "Guest");
      } else {
        // Create password flow (either new user or existing user without password)
        if (password !== repeatPassword) {
          setError("Passwords do not match");
          setLoading(false);
          return;
        }

        if (!passwordRegex.test(password)) {
          setError(
            "Password must be at least 6 characters and include uppercase, lowercase, number, and special character"
          );
          setLoading(false);
          return;
        }

        if (isNewUser) {
          // Create new user
          await addDoc(collection(db, "users"), {
            email: email.toLowerCase(),
            password,
            userName: "Guest",
            createdAt: new Date().toISOString(),
          });
        } else {
          // Update existing user with password
          const userDocRef = doc(db, "users", userDocId);
          await updateDoc(userDocRef, {
            password,
            updatedAt: new Date().toISOString(),
          });
        }

        localStorage.setItem("userEmail", email.toLowerCase());
        setUserEmail(email.toLowerCase());
        setUserName("Guest");
        setIsLoggedIn(true);
        await handlePostLogin(email.toLowerCase(), "Guest");
      }
    } catch (err) {
      console.error("Error during authentication:", err);
      setError("Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setEmailSubmitted(false);
    setExistingUser(null);
    setPassword("");
    setRepeatPassword("");
    setError("");
    setShowOtpInput(false);
    setOtp("");
    setOtpVerified(false);
    setGeneratedOtp("");
    setIsNewUser(false);
  };

  const resendOtp = async () => {
    setLoading(true);
    const otpCode = generateOtp();
    setGeneratedOtp(otpCode);
    setOtp("");
    setError("");

    try {
      const otpSent = await sendOtpEmail(email, otpCode);
      if (!otpSent) {
        setError("Failed to resend OTP. Please try again.");
      }
    } catch (error) {
      setError("Failed to resend OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e, action) => {
    if (e.key === 'Enter' && !loading) {
      e.preventDefault();
      action();
    }
  };

  return (
    <div className="ln-signin-container">
      {(value || isLoggedIn) && <Navigate to="/home" replace={true} />}
      <div className="ln-signin-card">
        <div className="ln-logo-section">
          <div className="ln-logo-icon">
            <img src={logo} alt="Logo" style={{ width: 40, height: 40 }} />
          </div>
          <h1 className="ln-brand-name">Voizon</h1>
        </div>

        <div className="ln-signin-section">
          <h2 className="ln-section-titlee">Voice On. Game On.</h2>
          <p className="ln-section-subtitle">
            From Question to Confidence — Instantly
          </p>

          {error && <div className="ln-error-message">{error}</div>}

          {!emailSubmitted ? (
            <>
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="ln-google-signin-btn"
              >
                <svg className="ln-google-icon" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                {loading ? "Signing in..." : "Continue with Google"}
              </button>

              <div className="ln-divider">
                <span>OR</span>
              </div>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value.trim())}
                onKeyPress={(e) => handleKeyPress(e, handleEmailSubmit)}
                placeholder="Enter your email"
                className="ln-email-input"
                autoComplete="email"
              />
              <button
                className="ln-continue-btn"
                onClick={handleEmailSubmit}
                disabled={loading || !email.trim()}
              >
                {loading ? "Checking..." : "Continue with email"}
              </button>
            </>
          ) : (
            <>
              <div className="ln-email-display">
                <p>{email}</p>
                <button
                  onClick={handleBackToEmail}
                  className="ln-back-button"
                  type="button"
                >
                  Change
                </button>
              </div>

              {showOtpInput ? (
                <>
                  <div className="ln-otp-section">
                    <p className="ln-otp-message">
                      {isNewUser
                        ? "Creating new account. We've sent a 6-digit code to your email."
                        : "We've sent a 6-digit code to your email for verification."
                      }
                    </p>
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      onKeyPress={(e) => handleKeyPress(e, handleOtpVerification)}
                      placeholder="Enter 6-digit code"
                      className="ln-otp-input"
                      maxLength="6"
                      autoComplete="one-time-code"
                    />
                    <button
                      className="ln-continue-btn"
                      onClick={handleOtpVerification}
                      disabled={loading || otp.length !== 6}
                    >
                      {loading ? "Verifying..." : "Verify Code"}
                    </button>
                    <button
                      className="ln-resend-btn"
                      onClick={resendOtp}
                      disabled={loading}
                    >
                      {loading ? "Sending..." : "Resend Code"}
                    </button>
                  </div>
                </>
              ) : otpVerified || (existingUser && existingUser.password) ? (
                <>
                  {isNewUser && (
                    <div className="ln-account-status">
                      <p className="ln-new-account-message">Creating new account</p>
                    </div>
                  )}

                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyPress={(e) => handleKeyPress(e, handleAuth)}
                    placeholder={
                      existingUser && existingUser.password
                        ? "Enter your password"
                        : "Create a password"
                    }
                    className="ln-email-input"
                    autoComplete={existingUser && existingUser.password ? "current-password" : "new-password"}
                  />

                  {(!existingUser || !existingUser.password) && (
                    <input
                      type="password"
                      value={repeatPassword}
                      onChange={(e) => setRepeatPassword(e.target.value)}
                      onKeyPress={(e) => handleKeyPress(e, handleAuth)}
                      placeholder="Repeat password"
                      className="ln-email-input"
                      autoComplete="new-password"
                    />
                  )}

                  <button
                    className="ln-continue-btn"
                    onClick={handleAuth}
                    disabled={
                      loading ||
                      !password.trim() ||
                      ((!existingUser || !existingUser.password) && !repeatPassword.trim())
                    }
                  >
                    {loading
                      ? "Processing..."
                      : existingUser && existingUser.password
                        ? "Login"
                        : "Continue"}
                  </button>
                </>
              ) : null}
            </>
          )}

          <p className="ln-privacy-note">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginComponent;