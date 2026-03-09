import React, { useState, useEffect, useRef } from "react";
import { useLocation, useSearchParams, useNavigate } from "react-router-dom";
import "../styles/home.css";
import logo from "../images/logo_bg.png";
import profile_pic from "../images/user_placeholder.png";
import success from "../images/success.gif";
import error from "../images/error.gif";
import { db } from "../firebase/config";
import MockInterviewAnalysis from "./mockInterviewAnalysis";
import ATSAnalyser from "./resume-ats";

import {
  collection,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
} from "firebase/firestore";

import {
  Play,
  Target,
  Video,
  Brain,
  BookOpen,
  Rocket,
  Users,
  TrendingUp,
  Award,
  CheckCircle,
  ArrowRight,
  Menu,
  X,
  Star,
  ChevronDown,
  User,
  Settings,
  LogOut,
  CreditCard,
  Plus,
  Calendar,
  BarChart3,
  MessageSquare,
  Lightbulb,
  Clock,
  Mic,
  Building,
  FileText,
  Upload,
  AlertCircle,
  Check,
  Shield,
  Activity,
  ChevronLeft,
  ChevronRight,
  Download,
  RefreshCw,
  Info,
} from "lucide-react";
import WelcomeScreen from "./WelcomeScreen";
import ManageProfile from "./ManageProfile";
import FeedbackForm from "./FeedbackForm";
import {
  getStorage,
  ref,
  getDownloadURL,
  getBlob,
  listAll,
} from "firebase/storage";




const plansINR = {
  monthly: {
    free: {
      name: "Starter",
      price: 49,
      features: ["4 Mock Interviews", "6 Resume Scans", "1 AI Assist", "Job Portal", "Question Bank"],
      isPopular: false
    },
    pro: {
      name: "Pro",
      price: 99,
      features: ["7 Mock Interviews", "11 Resume Scans", "3 AI Assists", "Job Portal", "Question Bank"],
      isPopular: true
    },
    elite: {
      name: "Elite",
      price: 199,
      features: ["Unlimited Mocks", "Unlimited Scans", "Unlimited AI Assists", "Job Portal", "Question Bank"],
      isPopular: false
    }
  },
  quarterly: {
    free: {
      name: "Starter",
      price: 132,
      features: ["12 Mock Interviews", "18 Resume Scans", "3 AI Assists", "Job Portal", "Question Bank"],
      isPopular: false
    },
    pro: {
      name: "Pro",
      price: 267, // 99 * 3 * 0.9 (10% discount)
      features: ["21 Mock Interviews", "33 Resume Scans", "9 AI Assists", "Job Portal", "Question Bank"],
      isPopular: true
    },
    elite: {
      name: "Elite",
      price: 537, // 199 * 3 * 0.9 (10% discount)
      features: ["Unlimited Mocks", "Unlimited Scans", "Unlimited AI Assists", "Job Portal", "Question Bank"],
      isPopular: false
    }
  },
  topup: {
    mocks: { price: 19, unit: "Mock Interview" },
    scans: { price: 25, unit: "3 Resume Scans" },
    aiAssists: { price: 39, unit: "AI Assist" }
  }
};

const plansUSD = {
  monthly: {
    free: {
      name: "Starter",
      price: 1,
      features: ["4 Mock Interviews", "6 Resume Scans", "1 AI Assist", "Job Portal", "Question Bank"],
      isPopular: false
    },
    pro: {
      name: "Professional",
      price: 1.9,
      features: ["7 Mock Interviews", "11 Resume Scans", "3 AI Assists", "Job Portal", "Question Bank"],
      isPopular: true
    },
    elite: {
      name: "Unlimited",
      price: 2.9,
      features: ["Unlimited Mocks", "Unlimited Scans", "Unlimited AI Assists", "Job Portal", "Question Bank"],
      isPopular: false
    }
  },
  quarterly: {
    free: {
      name: "Starter",
      price: 2.7, // ₹132 ~ $2.7
      features: ["12 Mock Interviews", "18 Resume Scans", "3 AI Assists", "Job Portal", "Question Bank"],
      isPopular: false
    },
    pro: {
      name: "Professional",
      price: 5.1, // ₹267 ~ $5.1
      features: ["21 Mock Interviews", "33 Resume Scans", "9 AI Assists", "Job Portal", "Question Bank"],
      isPopular: true
    },
    elite: {
      name: "Unlimited",
      price: 7.8, // ₹537 ~ $7.8
      features: ["Unlimited Mocks", "Unlimited Scans", "Unlimited AI Assists", "Job Portal", "Question Bank"],
      isPopular: false
    }
  },
  topup: {
    mocks: { price: 0.39, unit: "Mock Interview" },       // ₹19 ~ $0.39
    scans: { price: 0.52, unit: "3 Resume Scans" },        // ₹25 ~ $0.52
    aiAssists: { price: 0.79, unit: "AI Assist" }          // ₹39 ~ $0.79
  }
};

const PlansModal = ({
  showPlansModal,
  setShowPlansModal,
  userPlan,
  handlePlanSelect,
  currency,
  calculateTotal,
  addOns,
  setAddOns,
  handleTopUpPurchase,
  loading
}) => {


  const plans = currency === 'INR' ? plansINR : plansUSD;
  const currencySymbol = currency === 'INR' ? '₹' : '$';


  const [activeTab, setActiveTab] = useState('monthly');

  const incrementAddOn = (type) => {
    setAddOns(prev => ({
      ...prev,
      [type]: prev[type] + (type === 'scans' ? 3 : 1)
    }));
  };

  const decrementAddOn = (type) => {
    setAddOns(prev => ({
      ...prev,
      [type]: Math.max(0, prev[type] - (type === 'scans' ? 3 : 1))
    }));
  };

  const handleCheckoutClick = async () => {
    setShowPlansModal(false); // Hide the modal first
    await handleTopUpPurchase(); // Then proceed with payment
  };


  return (
    <div className={`modal-overlay ${showPlansModal ? "open" : ""}`} onClick={() => setShowPlansModal(false)}>
      <div className="vz-plans-modal" onClick={(e) => e.stopPropagation()}>
        <div className="vz-plans-header">
          <h2>Upgrade Your Plan</h2>
          <p>Choose the perfect plan for your interview preparation needs</p>
          <button className="vz-close-btn" onClick={() => setShowPlansModal(false)}>
            <X size={20} />
          </button>
        </div>

        <div className="vz-plans-tabs">
          <button
            className={`vz-tab-btn ${activeTab === 'monthly' ? 'active' : ''}`}
            onClick={() => setActiveTab('monthly')}
          >
            Monthly
          </button>
          <button
            className={`vz-tab-btn ${activeTab === 'quarterly' ? 'active' : ''}`}
            onClick={() => setActiveTab('quarterly')}
          >
            Quarterly <span className="vz-save-badge">Save 10%</span>
          </button>

          {/* Show Top-Up only if NOT on free plan */}
          {userPlan?.planId !== 'free' && (
            <button
              className={`vz-tab-btn ${activeTab === 'topup' ? 'active' : ''}`}
              onClick={() => setActiveTab('topup')}
            >
              Top-Up
            </button>
          )}
        </div>


        {activeTab !== 'topup' ? (
          <div className="vz-plans-grid">
            {Object.entries(plans[activeTab]).map(([key, plan]) => (
              <div
                key={key}
                className={`vz-plan-card ${plan.isPopular ? 'popular' : ''} ${userPlan?.planId === key ? 'current' : ''}`}
              >
                {plan.isPopular && <div className="vz-popular-badge">Most Popular</div>}
                <div className="vz-plan-header">
                  <h3>{plan.name}</h3>
                  <div className="vz-plan-price">
                    <span>{currencySymbol}{plan.price}</span>
                    {plan.price > 0 && (
                      <small>/{activeTab === 'monthly' ? 'month' : 'quarter'}</small>
                    )}
                  </div>

                  {plan.price === 0 && <p className="vz-free-forever">Free Forever</p>}
                </div>
                <ul className="vz-plan-features">
                  {plan.features.map((feature, i) => (
                    <li key={i}>
                      <CheckCircle size={16} className="vz-feature-icon" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <button
                  className={`vz-plan-select ${userPlan?.planId === key ? 'current' : ''}`}
                  onClick={() => handlePlanSelect(key)}
                >
                  {userPlan?.planId === key ? (
                    <>
                      <Check size={16} /> Current Plan
                    </>
                  ) : plan.price === 0 ? (
                    "Select Free Plan"
                  ) : (
                    "Choose Plan"
                  )}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="vz-topup-container">
            <div className="vz-topup-cards">
              {/* Mock Interviews Top-Up */}
              <div className="vz-topup-card">
                <div className="vz-topup-header">
                  <div className="vz-topup-icon">
                    <Video size={20} />
                  </div>
                  <h3>Mock Interviews</h3>
                  <p>
                    {currencySymbol}
                    {plans.topup.mocks.price} per {plans.topup.mocks.unit}
                  </p>
                </div>
                <div className="vz-topup-controls">
                  <button
                    className="vz-qty-btn"
                    onClick={() => decrementAddOn('mocks')}
                    disabled={addOns.mocks === 0}
                  >
                    -
                  </button>
                  <span className="vz-qty">{addOns.mocks}</span>
                  <button
                    className="vz-qty-btn"
                    onClick={() => incrementAddOn('mocks')}
                  >
                    +
                  </button>
                </div>
                <div className="vz-topup-total">
                  {currencySymbol}{addOns.mocks * plans.topup.mocks.price}
                </div>
              </div>

              {/* Resume Scans Top-Up */}
              <div className="vz-topup-card">
                <div className="vz-topup-header">
                  <div className="vz-topup-icon">
                    <FileText size={20} />
                  </div>
                  <h3>Resume Scans</h3>
                  <p>
                    {currencySymbol}
                    {plans.topup.scans.price} per {plans.topup.scans.unit}
                  </p>
                </div>
                <div className="vz-topup-controls">
                  <button
                    className="vz-qty-btn"
                    onClick={() => decrementAddOn('scans')}
                    disabled={addOns.scans === 0}
                  >
                    -
                  </button>
                  <span className="vz-qty">{addOns.scans}</span>
                  <button
                    className="vz-qty-btn"
                    onClick={() => incrementAddOn('scans')}
                  >
                    +
                  </button>
                </div>
                <div className="vz-topup-total">
                  {currencySymbol}{addOns.scans * plans.topup.scans.price}
                </div>
              </div>

              {/* AI Assists Top-Up */}
              <div className="vz-topup-card">
                <div className="vz-topup-header">
                  <div className="vz-topup-icon">
                    <Brain size={20} />
                  </div>
                  <h3>AI Assists</h3>
                  <p>
                    {currencySymbol}
                    {plans.topup.aiAssists.price} per {plans.topup.aiAssists.unit}
                  </p>
                </div>
                <div className="vz-topup-controls">
                  <button
                    className="vz-qty-btn"
                    onClick={() => decrementAddOn('aiAssists')}
                    disabled={addOns.aiAssists === 0}
                  >
                    -
                  </button>
                  <span className="vz-qty">{addOns.aiAssists}</span>
                  <button
                    className="vz-qty-btn"
                    onClick={() => incrementAddOn('aiAssists')}
                  >
                    +
                  </button>
                </div>
                <div className="vz-topup-total">
                  {currencySymbol}{addOns.aiAssists * plans.topup.aiAssists.price}
                </div>
              </div>
            </div>

            <div className="vz-topup-summary">
              <div className="vz-summary-header">
                <h3>Order Summary</h3>
                <button
                  className="vz-reset-btn"
                  onClick={() => setAddOns({ mocks: 0, scans: 0, aiAssists: 0 })}
                >
                  Reset All
                </button>
              </div>

              {addOns.mocks > 0 && (
                <div className="vz-summary-item">
                  <span>{addOns.mocks} Mock Interview{addOns.mocks !== 1 ? 's' : ''}</span>
                  <span>{currencySymbol}{addOns.mocks * plans.topup.mocks.price}</span>
                </div>
              )}

              {addOns.scans > 0 && (
                <div className="vz-summary-item">
                  <span>{addOns.scans} Resume Scan{addOns.scans !== 1 ? 's' : ''}</span>
                  <span>{currencySymbol}{addOns.scans * plans.topup.scans.price}</span>
                </div>
              )}

              {addOns.aiAssists > 0 && (
                <div className="vz-summary-item">
                  <span>{addOns.aiAssists} AI Assist{addOns.aiAssists !== 1 ? 's' : ''}</span>
                  <span>{currencySymbol}{addOns.aiAssists * plans.topup.aiAssists.price}</span>
                </div>
              )}

              {(addOns.mocks === 0 && addOns.scans === 0 && addOns.aiAssists === 0) && (
                <div className="vz-empty-summary">
                  <Info size={18} />
                  <p>No items selected</p>
                </div>
              )}

              <div className="vz-total-row">
                <span>Total</span>
                <span className="vz-grand-total">{currencySymbol}{calculateTotal().toFixed(2)}</span>
              </div>

              <button
                className="vz-checkout-btn"
                disabled={calculateTotal() === 0 || loading}
                onClick={handleCheckoutClick} // Use the new handler
              >
                {loading ? "Processing..." : "Proceed to Checkout"}
              </button>
            </div>
          </div>
        )}

        <div className="vz-plans-footer">
          <div className="vz-secure-checkout">
            <Shield size={16} />
            <span>Secure checkout</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const Home = () => {
  const location = useLocation();
  const { pathname, search: searchQuery, state } = location;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Reset view to home when component mounts
  useEffect(() => {
    setActiveView("home");
  }, []);

  // State declarations
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [goLiveModalOpen, setGoLiveModalOpen] = useState(false);
  const [userName, setUserName] = useState("");
  const [userPhoto, setUserPhoto] = useState("");
  const [interviewHistory, setInterviewHistory] = useState([]);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const backend_url = process.env.REACT_APP_BACKEND_URL;
  const [loading, setLoading] = useState(true);
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);
  const componentRef = useRef(null);
  const dropdownRef = useRef(null);
  const [toastMessage, setToastMessage] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [activeView, setActiveView] = useState("home");
  const [pastResumes, setPastResumes] = useState([]);
  const goLiveModalRef = useRef(null);
  const photoWasUploaded = sessionStorage.getItem("photoUploaded");
  const [startingInterview, setStartingInterview] = useState(false);
  const [practiceModalOpen, setPracticeModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const interviewsPerPage = 3;
  const offset = currentPage * interviewsPerPage;
  const [startingPractice, setStartingPractice] = useState(false);
  const [activeTab, setActiveTab] = useState("practice");
  const [activeAnalysisId, setActiveAnalysisId] = useState(null);
  const atsAnalyserRef = useRef(null);
  const [userPlan, setUserPlan] = useState(null);
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [processingNavigation, setProcessingNavigation] = useState(false);
  const { search } = useLocation();
  const queryParams = new URLSearchParams(search);
  const [userCountry, setUserCountry] = useState('IN'); // Default to India
  const [currency, setCurrency] = useState('INR'); // Default to INR
  const [goLiveForm, setGoLiveForm] = useState({
    companyName: "",
    role: "",
    jobDescription: "",
    resume: null,
    resumePath: "",
    resumeOriginalName: "",
    difficulty: "Company",
  });

  const plans = {
    "free": {
      name: "Free",
      priceINR: 0,
      billingCycle: "monthly",
      mockInterviews: 1,
      resumeScans: { initial: 1, extra: 0 },
      aiAssist: false,
      saveJob: { canSave: false, alertEnabled: false },
      jobListingAccess: true,
      isUnlimited: false
    },
    "starter": {
      name: "Starter",
      priceINR: 49,
      billingCycle: "monthly",
      mockInterviews: 3,
      resumeScans: { initial: 1, extra: 5 },
      aiAssist: 1,
      saveJob: { canSave: true, alertEnabled: false },
      jobListingAccess: true,
      isUnlimited: false
    },
    "pro": {
      name: "Pro",
      priceINR: 99,
      billingCycle: "monthly",
      mockInterviews: 10,
      resumeScans: { initial: 1, extra: 10 },
      aiAssist: 3,
      saveJob: { canSave: true, alertEnabled: true },
      jobListingAccess: true,
      isUnlimited: false
    },
    "elite": {
      name: "Elite",
      priceINR: 199,
      billingCycle: "monthly",
      mockInterviews: 0, // 0 here means Unlimited
      resumeScans: { initial: 0, extra: 0 }, // Also Unlimited
      aiAssist: true,
      saveJob: { canSave: true, alertEnabled: true },
      jobListingAccess: true,
      isUnlimited: true
    }
  };

  const [practiceHistory, setPracticeHistory] = useState([]);
  const [currentPracticePage, setCurrentPracticePage] = useState(0);
  const [currentInterviewPage, setCurrentInterviewPage] = useState(0);

  const offsetPractice = currentPracticePage * interviewsPerPage;

  const paginatedInterviews = interviewHistory.slice(
    currentInterviewPage * interviewsPerPage,
    (currentInterviewPage + 1) * interviewsPerPage
  );

  const paginatedPractice = practiceHistory.slice(
    currentPracticePage * interviewsPerPage,
    (currentPracticePage + 1) * interviewsPerPage
  );

  const totalPracticePages = Math.ceil(practiceHistory.length / interviewsPerPage);
  const totalPages = Math.ceil(interviewHistory.length / interviewsPerPage);

  const [addOns, setAddOns] = useState({
    mocks: 0,
    scans: 0,
    aiAssists: 0
  });

  if (process.env.REACT_APP_ENV === "production") {
    console.log = () => { };
    console.warn = () => { };
    console.error = () => { };
  }


  useEffect(() => {
    const detectUserCountry = async () => {
      // Check if we already have the country in localStorage
      const storedCountry = localStorage.getItem('userCountry');
      const storedCurrency = localStorage.getItem('userCurrency');

      if (storedCountry && storedCurrency) {
        setUserCountry(storedCountry);
        setCurrency(storedCurrency);
        return;
      }

      try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();

        const countryCode = data.country || 'IN';
        const userCurrency = countryCode === 'IN' ? 'INR' : 'USD';

        // Store in localStorage for future visits
        localStorage.setItem('userCountry', countryCode);
        localStorage.setItem('userCurrency', userCurrency);

        setUserCountry(countryCode);
        setCurrency(userCurrency);
      } catch (error) {
        console.error('Error detecting country:', error);
        // Fallback to INR if detection fails
        localStorage.setItem('userCountry', 'IN');
        localStorage.setItem('userCurrency', 'INR');
        setUserCountry('IN');
        setCurrency('INR');
      }
    };

    detectUserCountry();
  }, []);


  useEffect(() => {
    const tab = queryParams.get('tab');

    if (tab === 'plans') {
      setShowPlansModal(true);
      setActiveView('home');
      // Remove the query param after processing
      navigate(pathname, { replace: true });
    } else if (tab === 'profile') {
      setActiveView('profile');
      // Remove the query param after processing
      navigate(pathname, { replace: true });
    }
  }, [search, pathname, navigate]);


  useEffect(() => {
    if (state?.activeTab) {
      if (state.activeTab === 'subscription') {
        setShowPlansModal(true);
        setActiveView('home');
      } else if (state.activeTab === 'account') {
        setActiveView('profile');
      }
      // Don't clear the state immediately - let the navigation happen first
      setTimeout(() => {
        navigate(pathname, { replace: true, state: {} });
      }, 100);
    }
  }, [pathname, state, navigate]);


  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);


  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobile =
      /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet|ios/i.test(
        userAgent
      );
    setIsMobileOrTablet(isMobile);
  }, []);

  useEffect(() => {
    if (localStorage.getItem("promptForName") === "true") {
      setShowNamePrompt(true);
    }
  }, []);

  useEffect(() => {
    const fetchUserPlan = async () => {
      const email = localStorage.getItem("userEmail");
      if (!email) return;

      try {
        const userPlanRef = doc(db, "userPlans", email);
        const docSnap = await getDoc(userPlanRef);

        if (docSnap.exists()) {
          setUserPlan(docSnap.data());
        } else {
          // Initialize with free plan if no plan exists
          const currentDate = new Date();
          const freePlan = {
            email: email,
            planId: "free",
            name: "Free",
            priceINR: 0,
            billingCycle: "monthly",
            mockInterviews: 1,
            resumeScans: { initial: 1, extra: 0 },
            aiAssist: 0,
            saveJob: { canSave: false, alertEnabled: false },
            jobListingAccess: true,
            isUnlimited: false,
            startDate: currentDate.toLocaleDateString('en-GB'), // DD/MM/YYYY format
            endDate: new Date(currentDate.setFullYear(currentDate.getFullYear() + 80)).toLocaleDateString('en-GB'), // 80 years in future
            isActive: true,
            createdAt: new Date().toISOString()
          };

          await setDoc(userPlanRef, freePlan);
          setUserPlan(freePlan);
        }
      } catch (err) {
        console.error("Error fetching user plan:", err);
      } finally {
        setLoadingPlan(false);
      }
    };

    fetchUserPlan();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const handleStorageChange = () => {
      const newPhoto = localStorage.getItem("userPhoto");
      if (newPhoto && newPhoto !== userPhoto) {
        setUserPhoto(newPhoto);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [userPhoto]);

  useEffect(() => {
    if (goLiveModalOpen && goLiveModalRef.current) {
      goLiveModalRef.current.scrollTop = 0;
    }
  }, [goLiveModalOpen]);

  useEffect(() => {
    const email = localStorage.getItem("userEmail");
    if (!email) {
      navigate("/", { replace: true });
      return;
    }

    const initializeUser = async () => {
      try {
        const storedName = localStorage.getItem("userName");
        if (storedName) {
          setUserName(storedName);
        }

        await handleProfilePhotoSetup(email);
        setLoading(false);
      } catch (error) {
        console.error("Error initializing user:", error);
        setLoading(false);
      }
    };

    initializeUser();
  }, [navigate]);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "auto";
  }, [mobileMenuOpen]);

  useEffect(() => {
    setMobileMenuOpen(false);
    setProfileDropdownOpen(false);
  }, [activeView]);

  useEffect(() => {
    const header = document.querySelector(".nav-menu");
    if (!header) return;

    if (activeView === "profile") {
      header.classList.add("hide-header");
    } else {
      header.classList.remove("hide-header");
    }
  }, [activeView]);

  useEffect(() => {
    const navMenu = document.querySelector(".nav-menu");
    if (!navMenu) return;

    if (activeView === "profile") {
      navMenu.classList.add("hide-nav-links");
    } else {
      navMenu.classList.remove("hide-nav-links");
    }
  }, [activeView]);

  useEffect(() => {
    const fetchPracticeHistory = async () => {
      const email = localStorage.getItem("userEmail");
      if (!email) return;

      try {
        const q = query(
          collection(db, "practiceMockInterviews"),
          where("email", "==", email)
        );
        const snapshot = await getDocs(q);
        const now = new Date();

        const data = snapshot.docs.map((docSnap) => {
          const info = docSnap.data();
          const start = new Date(info.mockInterviewStartTime);

          return {
            mockInterviewId: docSnap.id,
            ...info,
            date: start.toLocaleDateString(),
            duration: info.totalTime || Math.ceil((info.keywords?.length || 7) * 1.5),
          };
        });

        data.sort(
          (a, b) =>
            new Date(b.mockInterviewStartTime) -
            new Date(a.mockInterviewStartTime)
        );

        setPracticeHistory(data);
      } catch (err) {
        console.error("Error fetching practice history:", err);
      }
    };

    fetchPracticeHistory();
  }, []);

  const calculateTotal = () => {
    let total = 0;
    const plans = currency === 'INR' ? plansINR : plansUSD;

    total += addOns.mocks * plans.topup.mocks.price;
    total += addOns.scans * plans.topup.scans.price;
    total += addOns.aiAssists * plans.topup.aiAssists.price;

    return total;
  };

  const handleTopUpPurchase = async () => {
    const email = localStorage.getItem("userEmail");
    if (!email) return;

    const total = calculateTotal();
    if (total <= 0) return;

    try {
      setLoading(true);
      const response = await fetch(`${backend_url}/api/create-topup-order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: total * 100, // in paise/cents
          currency: currency,
          mocks: addOns.mocks,
          scans: addOns.scans,
          aiAssists: addOns.aiAssists
        }),
      });

      const order = await response.json();
      await loadRazorpayScript();

      const options = {
        key: process.env.REACT_APP_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: "Voizon",
        order_id: order.id,
        handler: async function (response) {
          try {
            const verificationResponse = await fetch(`${backend_url}/api/verify-topup-payment`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                mocks: addOns.mocks,
                scans: addOns.scans,
                aiAssists: addOns.aiAssists,
                email: email
              }),
            });

            const result = await verificationResponse.json();

            if (result.success) {
              setToastMessage("Top-up purchased successfully!");
              setShowToast(true);
              setAddOns({ mocks: 0, scans: 0, aiAssists: 0 });

              // Update local user plan state
              setUserPlan(prev => ({
                ...prev,
                mockInterviews: (prev.mockInterviews || 0) + addOns.mocks,
                resumeScans: {
                  initial: prev.resumeScans.initial,
                  extra: (prev.resumeScans.extra || 0) + addOns.scans
                },
                aiAssist: (prev.aiAssist || 0) + addOns.aiAssists
              }));
            } else {
              setToastMessage("Top-up payment verification failed");
              setShowToast(true);
            }
          } catch (error) {
            console.error("Error processing top-up verification:", error);
            setToastMessage("Error processing top-up verification");
            setShowToast(true);
          }
        },
        prefill: {
          name: userName,
          email: email,
        },
        theme: {
          color: "#3B82F6",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error("Error processing top-up payment:", err);
      setToastMessage("Error processing top-up payment");
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  };

  const checkAndUpdateMockInterviews = async () => {
    const email = localStorage.getItem("userEmail");
    if (!email) return false;

    try {
      // First check the user's plan
      const userPlanRef = doc(db, "userPlans", email);
      const docSnap = await getDoc(userPlanRef);

      if (!docSnap.exists()) return false;
      const userPlan = docSnap.data();

      // If plan is unlimited, no need to check
      if (userPlan.isUnlimited || userPlan.mockInterviews === 0) return true;

      if (userPlan.mockInterviews > 0) {
        await updateDoc(userPlanRef, {
          mockInterviews: userPlan.mockInterviews - 1,
          updatedAt: new Date().toISOString()
        });
        return true;
      }

      return false;
    } catch (err) {
      console.error("Error checking mock interviews:", err);
      return false;
    }
  };

  const checkAndUpdateAiAssists = async () => {
    const email = localStorage.getItem("userEmail");
    if (!email) return false;

    try {
      // First check the user's plan
      const userPlanRef = doc(db, "userPlans", email);
      const docSnap = await getDoc(userPlanRef);

      if (!docSnap.exists()) return false;
      const userPlan = docSnap.data();

      // If plan is unlimited or has true value, no need to check
      if (userPlan.isUnlimited || userPlan.aiAssist === true) return true;

      if (userPlan.aiAssist > 0) {
        await updateDoc(userPlanRef, {
          aiAssist: userPlan.aiAssist - 1,
          updatedAt: new Date().toISOString()
        });
        return true;
      }

      return false;
    } catch (err) {
      console.error("Error checking AI assists:", err);
      return false;
    }
  };

  const checkAndUpdateResumeScans = async () => {
    const email = localStorage.getItem("userEmail");
    if (!email) return false;

    try {
      const userPlanRef = doc(db, "userPlans", email);
      const docSnap = await getDoc(userPlanRef);

      if (!docSnap.exists()) return false;
      const userPlan = docSnap.data();

      // If plan is unlimited, no need to check
      if (userPlan.isUnlimited) return true;

      // Check initial scans first
      if (userPlan.resumeScans?.initial > 0) {
        await updateDoc(userPlanRef, {
          "resumeScans.initial": userPlan.resumeScans.initial - 1,
          updatedAt: new Date().toISOString()
        });
        return true;
      }

      // Then check extra scans
      if (userPlan.resumeScans?.extra > 0) {
        await updateDoc(userPlanRef, {
          "resumeScans.extra": userPlan.resumeScans.extra - 1,
          updatedAt: new Date().toISOString()
        });
        return true;
      }

      return false;
    } catch (err) {
      console.error("Error checking resume scans:", err);
      return false;
    }
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => {
        resolve(true);
      };
      script.onerror = () => {
        resolve(false);
      };
      document.body.appendChild(script);
    });
  };


  const handlePlanSelect = async (planId) => {
    setShowPlansModal(false);

    if (userPlan?.planId === planId) {
      return;
    }

    const selectedPlan = plans[planId];

    try {
      const response = await fetch(`${backend_url}/api/create-order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: selectedPlan.price * 100, // in paise/cents
          currency: currency,
          planId: planId
        }),
      });

      const order = await response.json();
      await loadRazorpayScript();

      const options = {
        key: process.env.REACT_APP_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: "Voizon",
        order_id: order.id,
        handler: async function (response) {
          try {
            const verificationResponse = await fetch(`${backend_url}/api/verify-payment`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                planId: planId,
                email: localStorage.getItem("userEmail")
              }),
            });

            const result = await verificationResponse.json();

            if (result.success) {
              const startDate = new Date();
              const endDate = new Date();
              endDate.setMonth(endDate.getMonth() + 1);

              const formatDate = (date) => {
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = date.getFullYear();
                return `${day}/${month}/${year}`;
              };

              const updatedPlan = {
                planId: planId,
                ...selectedPlan,
                isActive: true,
                startDate: formatDate(startDate),
                endDate: formatDate(endDate),
                aiAssist: selectedPlan.aiAssist || 0,
                mockInterviews: selectedPlan.mockInterviews || 0,
                updatedAt: new Date().toISOString()
              };

              // Refresh the user plan in state
              setUserPlan(updatedPlan);

              const email = localStorage.getItem("userEmail");
              if (email) {
                await updateDoc(doc(db, "userPlans", email), updatedPlan);
              }

              setToastMessage("Plan upgraded successfully!");
              setShowToast(true);
            } else {
              setToastMessage("Payment verification failed");
              setShowToast(true);
            }
          } catch (error) {
            console.error("Error processing payment verification:", error);
            setToastMessage("Error processing payment verification");
            setShowToast(true);
          }
        },
        prefill: {
          name: userName,
          email: localStorage.getItem("userEmail"),
        },
        theme: {
          color: "#3B82F6",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (err) {
      console.error("Error processing payment:", err);
      setToastMessage("Error processing payment");
      setShowToast(true);
    }
  };

  const doesFileExist = async (path) => {
    const storage = getStorage();
    const folderRef = ref(storage, "profile_pics");
    try {
      const list = await listAll(folderRef);
      return list.items.some(
        (item) => item.fullPath === `profile_pics/${path}`
      );
    } catch (e) {
      return false;
    }
  };

  const handleProfilePhotoSetup = async (email) => {
    const storage = getStorage();
    const socialPhotoUrl = localStorage.getItem("userPhoto");
    const photoRef = ref(storage, `profile_pics/${email}.png`);

    try {
      const exists = await doesFileExist(`${email}.png`);
      if (exists) {
        const firebaseUrl = await getDownloadURL(photoRef);
        setUserPhoto(firebaseUrl);
      } else {
        setUserPhoto(profile_pic);
      }
    } catch (err) {
      if (err.code === "storage/object-not-found") {
        if (
          socialPhotoUrl &&
          socialPhotoUrl.startsWith("http") &&
          !socialPhotoUrl.includes("localhost") &&
          !socialPhotoUrl.includes("firebasestorage")
        ) {
          await uploadSocialPhotoToFirebase(email, socialPhotoUrl);

          try {
            const newFirebaseUrl = await getDownloadURL(photoRef);
            setUserPhoto(newFirebaseUrl);
          } catch (uploadErr) {
            setUserPhoto(profile_pic);
          }
        } else {
          setUserPhoto(profile_pic);
        }
      } else {
        setUserPhoto(profile_pic);
      }
    }
  };

  const resetGoLiveForm = () => {
    setGoLiveForm({
      companyName: "",
      role: "",
      jobDescription: "",
      resume: null,
      resumePath: "",
      resumeOriginalName: "",
      difficulty: "Company",
    });
  };

  const handleSaveName = async (name) => {
    const email = localStorage.getItem("userEmail");
    if (!email || !name.trim()) return;

    const cleanName = name.trim();
    try {
      const q = query(collection(db, "users"), where("email", "==", email));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const userDoc = snapshot.docs[0];
        await updateDoc(userDoc.ref, {
          userName: cleanName,
          updatedAt: new Date().toISOString(),
        });
      } else {
        await addDoc(collection(db, "users"), {
          email,
          userName: cleanName,
          createdAt: new Date().toISOString(),
        });
      }

      localStorage.setItem("userName", cleanName);
      localStorage.removeItem("promptForName");
      setUserName(cleanName);
      setShowNamePrompt(false);
    } catch (err) { }
  };

  useEffect(() => {
    const fetchInterviewHistory = async () => {
      const email = localStorage.getItem("userEmail");
      if (!email) return;

      try {
        const q = query(
          collection(db, "currentInterviews"),
          where("email", "==", email)
        );
        const snapshot = await getDocs(q);
        const storage = getStorage();

        const now = new Date();

        const data = await Promise.all(
          snapshot.docs.map(async (docSnap) => {
            const info = docSnap.data();
            const interviewStart = new Date(info.interviewStartTime);
            const hoursPassed =
              (now.getTime() - interviewStart.getTime()) / (1000 * 60 * 60);

            if (info.status === "ongoing" && hoursPassed > 24) {
              await updateDoc(docSnap.ref, {
                status: "incomplete",
                interviewEndTime: new Date().toISOString(),
                totalInterviewTime: "-",
              });
              info.status = "incomplete";
              info.interviewEndTime = new Date().toISOString();
              info.totalInterviewTime = "-";
            }

            let pdfUrl = null;
            if (info.status === "completed" && info.interviewId) {
              try {
                const pdfRef = ref(
                  storage,
                  `interview_responses/${info.interviewId}.pdf`
                );
                pdfUrl = await getDownloadURL(pdfRef);
              } catch (err) {
                // PDF might not exist yet
              }
            }

            return {
              id: docSnap.id,
              ...info,
              date: interviewStart.toLocaleDateString(),
              responsePdfUrl: pdfUrl,
            };
          })
        );

        data.sort(
          (a, b) =>
            new Date(b.interviewStartTime) - new Date(a.interviewStartTime)
        );

        setInterviewHistory(data);

        const uniqueResumes = Array.from(
          new Map(
            data
              .filter((d) => d.resumePathName && d.resumeOriginalName)
              .map((d) => [
                d.resumePathName,
                {
                  resumeOriginalName: d.resumeOriginalName,
                  resumePathName: d.resumePathName,
                },
              ])
          ).values()
        );
        setPastResumes(uniqueResumes);
      } catch (err) {
        console.error("Error fetching interview history:", err);
      }
    };

    fetchInterviewHistory();
  }, []);

  const uploadSocialPhotoToFirebase = async (email, photoUrl) => {
    try {
      const response = await fetch(photoUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch photo: ${response.status}`);
      }

      const blob = await response.blob();
      if (!blob.type.startsWith("image/")) {
        throw new Error("Not a valid image type");
      }

      const formData = new FormData();
      formData.append("photo", blob, "profile.png");
      formData.append("email", email);

      const res = await fetch(`${backend_url}/api/upload-profile-pic`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Upload failed: ${res.status}`);
      }

      const data = await res.json();
      return data.path;
    } catch (error) {
      throw error;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userName");
    localStorage.removeItem("userPhoto");
    localStorage.clear();
    window.location.reload();
  };

  const handleGoLive = () => {
    setGoLiveModalOpen(true);
  };

  const handleGoLiveSubmit = async () => {
    try {
      setStartingInterview(true);

      const hasAiAssistsLeft = await checkAndUpdateAiAssists();
      if (!hasAiAssistsLeft) {
        setToastMessage("No AI assists left in your plan. Please upgrade.");
        setShowToast(true);
        setStartingInterview(false);
        return;
      }

      if (
        !goLiveForm.companyName ||
        !goLiveForm.role ||
        (!goLiveForm.resume && !goLiveForm.resumePath)
      ) {
        alert("Please fill in all required fields");
        setStartingInterview(false);
        return;
      }

      let resumePathName = goLiveForm.resumePath;
      let resumeOriginalName = goLiveForm.resumeOriginalName;
      let finalCompany = goLiveForm.companyName;
      let finalRole = goLiveForm.role;
      let finalJD = goLiveForm.jobDescription;

      if (!resumePathName && goLiveForm.resume) {
        const formData = new FormData();
        formData.append("resume", goLiveForm.resume);
        formData.append("email", localStorage.getItem("userEmail"));
        formData.append("companyName", goLiveForm.companyName);
        formData.append("role", goLiveForm.role);
        formData.append("jobDescription", goLiveForm.jobDescription || "");

        const uploadResponse = await fetch(`${backend_url}/api/upload-resume`, {
          method: "POST",
          body: formData,
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(
            errorData.error || `HTTP error! status: ${uploadResponse.status}`
          );
        }

        const uploadData = await uploadResponse.json();
        resumePathName = uploadData.fileName;
        resumeOriginalName = uploadData.originalName;
        finalCompany = uploadData.companyName;
        finalRole = uploadData.role;
        finalJD = uploadData.jobDescription;
      }

      const interviewData = {
        email: localStorage.getItem("userEmail"),
        companyName: finalCompany,
        role: finalRole,
        jobDescription: finalJD,
        resumeOriginalName: resumeOriginalName,
        resumePathName: resumePathName,
        interviewStartTime: new Date().toISOString(),
        status: "ongoing",
      };

      const docRef = await addDoc(
        collection(db, "currentInterviews"),
        interviewData
      );

      setGoLiveForm({
        companyName: "",
        role: "",
        jobDescription: "",
        resume: null,
        resumePath: "",
        resumeOriginalName: "",
        difficulty: "Company",
      });
      setGoLiveModalOpen(false);

      await updateDoc(docRef, {
        interviewId: docRef.id,
      });
      navigate(`/voizon?yjGb=${docRef.id}`);
    } catch (error) {
      alert(`Failed to start interview: ${error.message}`);
    } finally {
      setStartingInterview(false);
      resetGoLiveForm();
    }
  };

  const handleFormChange = (field, value) => {
    setGoLiveForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    setGoLiveForm((prev) => ({ ...prev, resume: file }));
  };

  const downloadInterviewPdf = async (interviewId, company, role) => {
    try {
      const safeName = `${company}-${role}`.replace(/\s+/g, "_") + ".pdf";
      const url = `${backend_url}/api/download-response/${interviewId}.pdf?name=${encodeURIComponent(
        safeName
      )}`;

      const a = document.createElement("a");
      a.href = url;
      a.download = safeName;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert("Failed to download the report. Try again later.");
    }
  };

  const handlePracticeSubmit = async () => {
    try {
      setStartingPractice(true);

      const hasMockInterviewsLeft = await checkAndUpdateMockInterviews();
      if (!hasMockInterviewsLeft) {
        setToastMessage("No mock interviews left in your plan. Please upgrade.");
        setShowToast(true);
        setStartingPractice(false);
        return;
      }

      if (
        !goLiveForm.companyName ||
        !goLiveForm.role ||
        goLiveForm.jobDescription.trim().length < 3 ||
        (!goLiveForm.resume && !goLiveForm.resumePath)
      ) {
        alert("Please fill all required fields");
        setStartingPractice(false);
        return;
      }

      let resumePathName = goLiveForm.resumePath;
      let resumeOriginalName = goLiveForm.resumeOriginalName;

      if (!resumePathName && goLiveForm.resume) {
        const formData = new FormData();
        formData.append("resume", goLiveForm.resume);
        formData.append("email", localStorage.getItem("userEmail"));
        formData.append("companyName", goLiveForm.companyName);
        formData.append("role", goLiveForm.role);
        formData.append("jobDescription", goLiveForm.jobDescription || "");

        const uploadResponse = await fetch(`${backend_url}/api/upload-resume`, {
          method: "POST",
          body: formData,
        });

        const uploadData = await uploadResponse.json();
        resumePathName = uploadData.fileName;
        resumeOriginalName = uploadData.originalName;
      }

      const keywords = await extractKeywordsFromLLM(goLiveForm.jobDescription);

      const docRef = await addDoc(collection(db, "practiceMockInterviews"), {
        email: localStorage.getItem("userEmail"),
        companyName: goLiveForm.companyName,
        role: goLiveForm.role,
        jobDescription: goLiveForm.jobDescription,
        resumeOriginalName,
        resumePathName,
        difficulty: "As per Company Standard",
        mockInterviewStartTime: new Date().toISOString(),
        keywords,
        status: "ongoing",
      });

      await updateDoc(docRef, { mockInterviewId: docRef.id });

      resetGoLiveForm();
      setPracticeModalOpen(false);
      navigate(`/practice?uyhn=${docRef.id}`);
    } catch (err) {
      console.error("Practice session error:", err);
      alert("Failed to start practice session. Please check the console.");
    } finally {
      setStartingPractice(false);
    }
  };

  const extractKeywordsFromLLM = async (jd) => {
    const res = await fetch(`${backend_url}/api/extract-keywords`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobDescription: jd }),
    });
    const data = await res.json();
    return data.keywords || [];
  };

  const greetings = [
    "Hey {name}, are you ready?",
    "{name}, let's crack it today!",
    "You're on fire, {name}!",
    "Welcome back {name}!",
    "Time to shine, {name}!",
    "All set, {name}?",
    "God mode activated, {name}!",
    "Let's make it count, {name}!",
    "{name} ready to conquer?",
  ];

  const [greeting, setGreeting] = useState(() => {
    const random = greetings[Math.floor(Math.random() * greetings.length)];
    return random;
  });

  if (loading) return null;

  return (
    <div className="app">
      <>
        <header className="header" ref={componentRef}>
          <div className="header-content">
            <div className="logo-wrapper">
              <div className="logo">
                <img src={logo} alt="Logo" style={{ width: 40, height: 40 }} />
                <span className="logo-text">Voizon</span>
                {!loadingPlan && userPlan && userPlan.planId !== 'free' && (
                  <div
                    className={`plan-tag ${userPlan.planId}`}
                    tabIndex={0}
                    aria-label={`Current plan: ${userPlan.name}`}
                  >
                    {userPlan.name}
                  </div>
                )}
              </div>
            </div>
            <nav className={`nav-menu ${mobileMenuOpen ? "mobile-open" : ""}`}>
              {mobileMenuOpen && (
                <div className="mobile-stack">
                  <div className="profile-dropdown" ref={dropdownRef}>
                    <div
                      className="profile-trigger"
                      onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                    >
                      <img
                        src={userPhoto || profile_pic}
                        alt="Profile"
                        className="profile-pic"
                      />
                      <span className="profile-name">{userName}</span>
                      <ChevronDown size={16} />
                    </div>
                    <div
                      className={`dropdown-menu ${profileDropdownOpen ? "open" : ""
                        }`}
                    >
                      <button
                        className="dropdown-item"
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          setActiveView("profile");
                        }}
                      >
                        <User size={16} /> Manage Account
                      </button>
                      <button
                        className="dropdown-item"
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          setShowPlansModal(true);
                        }}
                      >
                        <CreditCard size={16} /> Manage Subscription
                      </button>
                      <div className="dropdown-divider"></div>
                      <button
                        className="dropdown-item danger"
                        onClick={handleLogout}
                      >
                        <LogOut size={16} /> Logout
                      </button>
                    </div>
                  </div>
                </div>
              )}
              <a
                className="nav-link activee"
                onClick={(e) => {
                  setMobileMenuOpen(false);
                  e.preventDefault();
                  setActiveView("home");
                }}
              >
                Home
              </a>
              <a
                className="nav-link"
                onClick={(e) => {
                  setMobileMenuOpen(false);
                  e.preventDefault();
                  navigate("/vault-voices");
                }}
              >
                Question Vault
              </a>
            </nav>

            {!mobileMenuOpen && (
              <div className="header-right">
                <div className="profile-dropdown" ref={dropdownRef}>
                  <div
                    className="profile-trigger"
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  >
                    <img
                      src={userPhoto || profile_pic}
                      alt="Profile"
                      className="profile-pic"
                    />
                    <span className="profile-name">{userName}</span>
                    <ChevronDown size={16} />
                  </div>
                  <div
                    className={`dropdown-menu ${profileDropdownOpen ? "open" : ""
                      }`}
                  >
                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setProfileDropdownOpen(false);
                        setActiveView("profile");
                      }}
                    >
                      <User size={16} /> Manage Account
                    </button>
                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        setShowPlansModal(true);
                      }}
                    >
                      <CreditCard size={16} /> Manage Subscription
                    </button>
                    <div className="dropdown-divider"></div>
                    <button
                      className="dropdown-item danger"
                      onClick={handleLogout}
                    >
                      <LogOut size={16} /> Logout
                    </button>
                  </div>
                </div>
              </div>
            )}

            <button
              className="mobile-menu-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </header>

        {activeAnalysisId ? (
          <div className="vz-analysis-container">
            <MockInterviewAnalysis
              mockInterviewId={activeAnalysisId}
              onBack={() => setActiveAnalysisId(null)}
            />
          </div>
        ) : activeView === "atsChecker" ? (
          <div
            ref={atsAnalyserRef}
            style={{
              width: '100%',
              minHeight: '100vh',
              overflow: 'auto',
              position: 'relative'
            }}
          >
            <ATSAnalyser
              onBack={() => setActiveView("home")}
              setShowPlansModal={setShowPlansModal}
            />
          </div>
        ) : (
          activeView === "home" && (
            <div className="vz-home-container">
              <section className="vz-hero-panel">
                <div className="vz-hero-content">
                  <h1 className="vz-hero-title">
                    {greeting.replace("{name}", userName)}
                  </h1>
                  <p className="vz-hero-subtitle">
                    Transform your interview skills with AI-powered practice sessions
                  </p>

                  <div className="vz-hero-cta">
                    <button
                      className="vz-primary-cta vz-pulse-animation"
                      onClick={() => setPracticeModalOpen(true)}
                    >
                      <Rocket size={20} className="vz-cta-icon" />
                      <span>Start Practice</span>
                      <div className="vz-cta-highlight"></div>
                    </button>

                  </div>
                </div>

                <div className="vz-hero-graphic">
                  <div className="vz-graphic-element vz-graphic-1"></div>
                  <div className="vz-graphic-element vz-graphic-2"></div>
                  <div className="vz-graphic-element vz-graphic-3"></div>
                </div>
              </section>

              <div className="vz-activity-dashboard">
                <div className="vz-stats-grid-mobile">

                  <div className="vz-stats-overview">
                    <div className="vz-stat-card">
                      <div className="vz-stat-icon" style={{ backgroundColor: '#e0f2fe' }}>
                        <Activity size={20} color="#0369a1" />
                      </div>
                      <div className="vz-stat-content">
                        <span className="vz-stat-value">{practiceHistory.length}</span>
                        <span className="vz-stat-label">Practice Sessions</span>
                      </div>
                    </div>

                    <div className="vz-stat-card">
                      <div className="vz-stat-icon" style={{ backgroundColor: '#fce7f3' }}>
                        <TrendingUp size={20} color="#db2777" />
                      </div>
                      <div className="vz-stat-content">
                        <span className="vz-stat-value">
                          {practiceHistory.length > 0 ? Math.round(
                            practiceHistory.reduce((acc, session) => acc + (session.score || 0), 0) / practiceHistory.length
                          ) : 0}%
                        </span>
                        <span className="vz-stat-label">Avg. Score</span>
                      </div>
                    </div>
                  </div>

                  {userPlan && (
                    <>
                      <div className="vz-stats-overview">

                        <div className="vz-stat-card">
                          <div className="vz-stat-icon" style={{ backgroundColor: '#fefce8' }}>
                            <FileText size={20} color="#ca8a04" />
                          </div>
                          <div className="vz-stat-content">
                            <span className="vz-stat-value">
                              {userPlan.isUnlimited
                                ? '∞'
                                : userPlan.resumeScans.initial + userPlan.resumeScans.extra}
                            </span>
                            <span className="vz-stat-label">
                              {isMobileOrTablet ? "Scans Left" : "Resume Scans Left"}
                            </span>
                          </div>
                        </div>

                        <div className="vz-stat-card">
                          <div className="vz-stat-icon" style={{ backgroundColor: '#e0f2fe' }}>
                            <Video size={20} color="#0284c7" />
                          </div>
                          <div className="vz-stat-content">
                            <span className="vz-stat-value">
                              {userPlan.isUnlimited
                                ? '∞'
                                : userPlan.mockInterviews}
                            </span>
                            <span className="vz-stat-label">
                              {isMobileOrTablet ? "Mocks Left" : "Mock Interviews Left"}
                            </span>

                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <section className="vz-feature-hub">
                  <div className="vz-feature-container">
                    <div className="vz-feature-intro">
                      <div className="vz-feature-badge">
                        <Lightbulb size={18} />
                        <span>Elevate Your Prep</span>
                      </div>
                      <h2 className="vz-feature-title">Essential Tools for Your Success</h2>
                      <p className="vz-feature-subtitle">
                        Premium resources designed to complement your interview preparation journey
                      </p>
                    </div>

                    <div className="vz-feature-grid">
                      {/* Question Bank Card */}
                      <div className="vz-feature-card" onClick={() => navigate('/vault-voices')}>
                        <div className="vz-feature-icon-container">
                          <div className="vz-feature-icon-bg vz-primary-bg">
                            <BookOpen size={20} className="vz-feature-icon" />
                          </div>
                          <div className="vz-feature-ornament"></div>
                        </div>
                        <div className="vz-feature-content">
                          <h3>Question Vault</h3>
                          <p>
                            Get 10,000+ curated questions with model answers.
                          </p>
                          <div className="vz-feature-cta">
                            <span>Explore Resources</span>
                            <ArrowRight size={16} className="vz-cta-icon" />
                          </div>
                        </div>
                      </div>


                    </div>
                  </div>
                </section>

                <div className="vz-stat-card vz-resume-checker-card" onClick={() => {
                  setActiveView('atsChecker');
                  window.scrollTo({ top: -100, behavior: 'smooth' });
                }}
                >
                  <div className="ribbon">
                    <span className="ribbon-text">TRY NOW</span>
                  </div>
                  <div className="vz-stat-icon-container">
                    <div className="vz-stat-icon">
                      <FileText size={20} color="var(--color-primary-dark)" />
                    </div>

                    <div className="vz-stat-content">
                      <span className="vz-stat-value">Optimize Resume</span>
                      <span className="vz-stat-label">Run ATS Compatibility Check</span>
                    </div>
                  </div>
                  <div className="arrow-indicator">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M5 12h14M12 5l7 7-7 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>


                <div className="vz-activity-tabs">
                  <div className="vz-tab-header">
                    <button
                      className={`vz-tab-btn ${activeTab === 'practice' ? 'vz-tab-active' : ''}`}
                      onClick={() => setActiveTab('practice')}
                    >
                      <Activity size={18} className="vz-tab-icon" />
                      Practice History
                    </button>
                  </div>

                  <div className="vz-tab-content">
                    {activeTab === 'practice' ? (
                      practiceHistory.length === 0 ? (
                        <div className="vz-empty-state">
                          <div className="vz-empty-icon-container">
                            <Activity size={40} className="vz-empty-icon" />
                          </div>
                          <h3 className="vz-empty-title">No Practice Sessions Yet</h3>
                          <p className="vz-empty-description">
                            Start your first practice session to see your progress here.
                          </p>
                          <button
                            className="vz-empty-cta"
                            onClick={() => setPracticeModalOpen(true)}
                          >
                            Start Practicing
                          </button>
                        </div>
                      ) : (
                        <div className="vz-session-grid">
                          {paginatedPractice.map((session) => (
                            <div key={session.mockInterviewId} className="vz-session-card">
                              <div className="vz-session-header">
                                <div className="vz-session-company">
                                  <Building size={18} className="vz-session-icon" />
                                  <span>{session.companyName || 'General Practice'}</span>
                                </div>
                                <div className={`vz-session-difficulty vz-difficulty-${session.difficulty.toLowerCase()}`}>
                                  {session.difficulty === 'Company' ? 'Company Level' : 'General'}
                                </div>
                              </div>

                              <div className="vz-session-body">
                                <div className="vz-session-meta">
                                  <div className="vz-meta-item">
                                    <span className="vz-meta-label">Role</span>
                                    <span className="vz-meta-value">{session.role || 'Not specified'}</span>
                                  </div>
                                  <div className="vz-meta-item">
                                    <span className="vz-meta-label">Duration</span>
                                    <span className="vz-meta-value">{session.duration} mins</span>
                                  </div>
                                  <div className="vz-meta-item vz-meta-fullwidth">
                                    <FileText size={16} className="vz-meta-icon" />
                                    <span className="vz-meta-value vz-text-ellipsis">
                                      {session.resumeOriginalName || 'No resume used'}
                                    </span>
                                  </div>
                                </div>

                                {session.keywords && session.keywords.length > 0 && (
                                  <div className="vz-session-topics">
                                    <div className="vz-topics-label">Topics Covered:</div>
                                    <div className="vz-topics-container">
                                      {session.keywords.slice(0, 4).map((keyword, i) => (
                                        <span key={i} className="vz-topic-tag">{keyword}</span>
                                      ))}
                                      {session.keywords.length > 4 && (
                                        <span className="vz-topic-more">+{session.keywords.length - 4}</span>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="vz-session-footer">
                                <button
                                  className="vz-session-action"
                                  onClick={() => setActiveAnalysisId(session.mockInterviewId)}
                                >
                                  View Detailed Analysis
                                  <ArrowRight size={18} className="vz-action-icon" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    ) : (
                      interviewHistory.length === 0 ? (
                        <div className="vz-empty-state">
                          <div className="vz-empty-icon-container">
                            <Clock size={40} className="vz-empty-icon" />
                          </div>
                          <h3 className="vz-empty-title">No Interview History</h3>
                          <p className="vz-empty-description">
                            Complete a live interview to see your session details here.
                          </p>
                          <button
                            className="vz-empty-cta"
                            onClick={handleGoLive}
                          >
                            Start Live Interview
                          </button>
                        </div>
                      ) : (
                        <div className="vz-interview-grid">
                          {paginatedInterviews.map((interview) => (
                            <div key={interview.id} className="vz-interview-card">
                              <div className="vz-interview-header">
                                <div className="vz-interview-company">
                                  <Building size={18} className="vz-interview-icon" />
                                  <div>
                                    <div className="vz-interview-name">{interview.companyName}</div>
                                    <div className="vz-interview-date">{interview.date}</div>
                                  </div>
                                </div>
                                <div className={`vz-interview-status vz-status-${interview.status}`}>
                                  {interview.status === "completed" ? "Completed" : "Incomplete"}
                                </div>
                              </div>

                              <div className="vz-interview-body">
                                <div className="vz-interview-meta">
                                  <div className="vz-meta-item">
                                    <span className="vz-meta-label">Position</span>
                                    <span className="vz-meta-value">{interview.role}</span>
                                  </div>
                                  <div className="vz-meta-item">
                                    <span className="vz-meta-label">Duration</span>
                                    <span className="vz-meta-value">
                                      {interview.totalInterviewTime || 'Not recorded'}
                                    </span>
                                  </div>
                                  <div className="vz-meta-item vz-meta-fullwidth">
                                    <FileText size={16} className="vz-meta-icon" />
                                    <span className="vz-meta-value vz-text-ellipsis">
                                      {interview.resumeOriginalName || 'No resume used'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="vz-interview-footer">
                                {interview.interviewId && interview.status !== "incomplete" ? (
                                  interview.status === "completed" ? (
                                    <button
                                      className="vz-interview-action vz-download-report"
                                      onClick={() => downloadInterviewPdf(
                                        interview.interviewId,
                                        interview.companyName,
                                        interview.role
                                      )}
                                    >
                                      <Download size={18} className="vz-action-icon" />
                                      Download Report
                                    </button>
                                  ) : (
                                    <button
                                      className="vz-interview-action vz-rejoin-session"
                                      onClick={() => navigate(`/voizon?yjGb=${interview.interviewId}`)}
                                    >
                                      <RefreshCw size={18} className="vz-action-icon" />
                                      Rejoin Session
                                    </button>
                                  )
                                ) : (
                                  <div className="vz-interview-unavailable">
                                    <Info size={18} className="vz-unavailable-icon" />
                                    <span>Analysis not available</span>
                                    <div className="vz-unavailable-tooltip">
                                      This session wasn't properly completed or exceeded the 24-hour window
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    )}
                  </div>

                  {(activeTab === 'practice' && practiceHistory.length > interviewsPerPage) ||
                    (activeTab === 'interviews' && interviewHistory.length > interviewsPerPage) ? (
                    <div className="vz-pagination-controls">
                      <button
                        className={`vz-pagination-btn vz-prev-btn ${(activeTab === 'practice' ? currentPracticePage : currentInterviewPage) === 0 ? 'vz-disabled' : ''
                          }`}
                        onClick={() => {
                          if (activeTab === 'practice') {
                            setCurrentPracticePage(Math.max(0, currentPracticePage - 1));
                          } else {
                            setCurrentInterviewPage(Math.max(0, currentInterviewPage - 1));
                          }
                        }}
                        disabled={
                          (activeTab === 'practice' ? currentPracticePage : currentInterviewPage) === 0
                        }
                      >
                        <ChevronLeft size={18} />
                      </button>

                      <div className="vz-page-indicator">
                        Page{' '}
                        {(activeTab === 'practice' ? currentPracticePage : currentInterviewPage) + 1}{' '}
                        of{' '}
                        {activeTab === 'practice'
                          ? Math.ceil(practiceHistory.length / interviewsPerPage)
                          : Math.ceil(interviewHistory.length / interviewsPerPage)}
                      </div>

                      <button
                        className={`vz-pagination-btn vz-next-btn ${(activeTab === 'practice'
                          ? currentPracticePage >= Math.ceil(practiceHistory.length / interviewsPerPage) - 1
                          : currentInterviewPage >= Math.ceil(interviewHistory.length / interviewsPerPage) - 1)
                          ? 'vz-disabled'
                          : ''
                          }`}
                        onClick={() => {
                          if (activeTab === 'practice') {
                            setCurrentPracticePage(Math.min(
                              Math.ceil(practiceHistory.length / interviewsPerPage) - 1,
                              currentPracticePage + 1
                            ));
                          } else {
                            setCurrentInterviewPage(Math.min(
                              Math.ceil(interviewHistory.length / interviewsPerPage) - 1,
                              currentInterviewPage + 1
                            ));
                          }
                        }}
                        disabled={
                          activeTab === 'practice'
                            ? currentPracticePage >= Math.ceil(practiceHistory.length / interviewsPerPage) - 1
                            : currentInterviewPage >= Math.ceil(interviewHistory.length / interviewsPerPage) - 1
                        }
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Feedback CTA */}
              <div className="vz-feedback-cta">
                <div className="vz-feedback-content">
                  <MessageSquare size={24} className="vz-feedback-icon" />
                  <div className="vz-feedback-text">
                    <h3 className="vz-feedback-title">Help Shape Voizon's Future</h3>
                    <p className="vz-feedback-message">
                      We value your input! Share your experience and suggestions to help us improve.
                    </p>
                  </div>
                </div>
                <button
                  className="vz-feedback-button"
                  onClick={() => setActiveView("feedback")}
                >
                  Provide Feedback
                </button>
              </div>
            </div>
          )
        )}

        {activeView === "profile" && (
          <ManageProfile
            setActiveView={setActiveView}
            setUserPhoto={setUserPhoto}
            setUserName={setUserName}
            setShowPlansModal={setShowPlansModal}
          />
        )}

        {/* Go Live Modal */}
        <div className={`modal-overlay ${goLiveModalOpen ? "open" : ""}`}>
          <div className="modal live-modal" ref={goLiveModalRef}>
            <div className="modal-header">
              <h3 className="modal-title">Start Live Interview</h3>
              <button
                className="modal-close"
                onClick={() => {
                  resetGoLiveForm();
                  setGoLiveModalOpen(false);
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="cost-warning">
              <AlertCircle size={20} className="cost-warning-icon" />
              <div className="cost-warning-text">
                <strong>Usage Notice:</strong> Live interviews are included in your subscription plan.
                {userPlan?.isUnlimited ? (
                  " You have unlimited access."
                ) : (
                  <>
                    {" "}You have {userPlan?.aiAssist === 0 ? "no" : userPlan?.aiAssist} AI-assisted interview{userPlan?.aiAssist === 1 ? "" : "s"} remaining this month.
                  </>
                )}
              </div>
            </div>
            {isMobileOrTablet ? (
              <div
                style={{
                  padding: "2rem",
                  textAlign: "center",
                  color: "#b91c1c",
                  background: "#fef2f2",
                  border: "1px solid #fca5a5",
                  borderRadius: "12px",
                  fontWeight: "600",
                  fontSize: "1rem",
                }}
              >
                🚫 Interview is only available on laptops and desktops.
                <br />
                Please switch to a compatible device (Windows, MacOS, or Linux).
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleGoLiveSubmit();
                }}
              >
                <div className="form-group">
                  <label className="form-label">Company Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g., Google, Microsoft, Amazon"
                    value={goLiveForm.companyName}
                    onChange={(e) =>
                      handleFormChange("companyName", e.target.value)
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Role *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g., Software Engineer, Product Manager"
                    value={goLiveForm.role}
                    onChange={(e) => handleFormChange("role", e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Job Description</label>
                  <textarea
                    className="form-input form-textarea"
                    placeholder="Paste the job description here (optional but recommended for better answers)"
                    value={goLiveForm.jobDescription}
                    onChange={(e) =>
                      handleFormChange("jobDescription", e.target.value)
                    }
                  />
                </div>

                {/* RESUME SECTION */}
                <div className="form-group">
                  <label className="form-label">Resume *</label>

                  {pastResumes.length > 0 && !goLiveForm.resume && (
                    <select
                      className="form-input"
                      onChange={(e) => {
                        const selected = pastResumes.find(
                          (r) => r.resumePathName === e.target.value
                        );
                        if (selected) {
                          setGoLiveForm((prev) => ({
                            ...prev,
                            resume: null,
                            resumePath: selected.resumePathName,
                            resumeOriginalName: selected.resumeOriginalName,
                          }));
                        } else {
                          setGoLiveForm((prev) => ({
                            ...prev,
                            resumePath: "",
                            resumeOriginalName: "",
                          }));
                        }
                      }}
                      value={goLiveForm.resumePath}
                    >
                      <option value="">Select Previously Used Resume</option>
                      {pastResumes.map((resume) => (
                        <option
                          key={resume.resumePathName}
                          value={resume.resumePathName}
                        >
                          {resume.resumeOriginalName}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Show OR only if both options are present and none selected yet */}
                  {pastResumes.length > 0 &&
                    !goLiveForm.resumePath &&
                    !goLiveForm.resume && (
                      <label
                        className="form-label"
                        style={{
                          marginTop: "1rem",
                          textAlign: "center",
                          marginBottom: "1rem",
                        }}
                      >
                        Or
                      </label>
                    )}

                  {/* File Upload - show only if NO past resume selected */}
                  {!goLiveForm.resumePath && (
                    <>
                      {/* Hidden file input */}
                      <input
                        id="resume-upload"
                        type="file"
                        className="file-input"
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            setGoLiveForm((prev) => ({
                              ...prev,
                              resume: file,
                              resumePath: "",
                              resumeOriginalName: "",
                            }));
                          }
                        }}
                        style={{ display: "none" }}
                      />

                      {/* Styled visible upload box */}
                      <div
                        className={`file-upload ${goLiveForm.resume ? "has-file" : ""}`}
                        onClick={() => document.getElementById("resume-upload").click()}
                        style={{
                          cursor: "pointer",
                          padding: "1.25rem",
                          borderRadius: "10px",
                          border: `3px dashed ${goLiveForm.resume ? "#10b981" : "#cbd5e1"}`, // 👈 border color changes + 3px
                          textAlign: "center",
                          backgroundColor: goLiveForm.resume ? "#ecfdf5" : "#f8fafc", // 👈 bg color changes
                          transition: "all 0.3s ease", // 👈 smooth transition
                        }}
                      >
                        <Upload
                          size={28}
                          color={goLiveForm.resume ? "#10b981" : "#64748b"}
                          style={{ marginBottom: "0.5rem" }}
                        />
                        <div
                          style={{
                            fontWeight: "600",
                            color: goLiveForm.resume ? "#10b981" : "#64748b",
                            fontSize: "1rem",
                          }}
                        >
                          {goLiveForm.resume ? goLiveForm.resume.name : "Click to upload resume"}
                        </div>
                        <div style={{ fontSize: "0.875rem", color: "#64748b" }}>
                          PDF, DOC, DOCX (Max 5MB)
                        </div>
                      </div>
                    </>
                  )}


                </div>
                {userPlan && !userPlan.isUnlimited && userPlan.aiAssist === 0 && (
                  <div className="limit-error">
                    <AlertCircle size={18} />
                    <span>You've used all your AI assists. <button
                      type="button"
                      className="upgrade-link"
                      onClick={() => {
                        setGoLiveModalOpen(false);
                        setShowPlansModal(true);
                      }}
                    >Top-up now</button> to keep going!</span>
                  </div>
                )}
                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn"
                    style={{
                      background: "#f1f5f9",
                      color: "#64748b",
                      border: "1px solid #e2e8f0",
                    }}
                    onClick={() => {
                      resetGoLiveForm();
                      setGoLiveModalOpen(false);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={
                      startingInterview ||
                      !goLiveForm.companyName ||
                      !goLiveForm.role ||
                      (!goLiveForm.resume && !goLiveForm.resumePath)
                    }
                  >
                    {startingInterview ? (
                      <>
                        <span className="spinner"></span> Starting Interview...
                      </>
                    ) : (
                      <>
                        <Video size={20} /> Start Interview
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>


        {showWelcomeModal && (
          <div
            className="modal-overlay open"
            onClick={() => setShowWelcomeModal(false)}
          >
            <div
              className="modal-content welcome-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="welcome-icon">🎁</div>
              <h2 className="welcome-title">
                Your Free 10 Minutes Are Activated!
              </h2>
              <p className="welcome-subtitle">
                We've credited 10 free interview minutes to your account. Dive in
                and start practicing!
              </p>
              <button
                className="btn btn-primary"
                onClick={() => setShowWelcomeModal(false)}
              >
                Let's Go
              </button>
            </div>
          </div>
        )}

        {showToast && (
          <div className="vz-toast-overlay">
            <div className={`vz-toast ${toastMessage.includes("failed") ? "error" : "success"}`}>
              <div className="vz-toast-icon">
                <img
                  src={toastMessage.includes("failed") ? error : success}
                  alt={toastMessage.includes("failed") ? "Error" : "Success"}
                />
              </div>
              <div className="vz-toast-content">
                <p className="vz-toast-message">{toastMessage}</p>
              </div>
            </div>
          </div>
        )}

        {showNamePrompt && <WelcomeScreen onSaveName={handleSaveName} />}

        {activeView === "feedback" && (
          <FeedbackForm
            setActiveView={setActiveView}
            setToastMessage={setToastMessage}
            setShowToast={setShowToast}
          />
        )}

        {/* Practice Modal */}
        <div className={`modal-overlay ${practiceModalOpen ? "open" : ""}`}>
          <div className="modal practice-modal" ref={goLiveModalRef}>
            <div className="modal-header">
              <h3 className="modal-title">Start Practice Session</h3>
              <button
                className="modal-close"
                onClick={() => {
                  resetGoLiveForm();
                  setPracticeModalOpen(false);
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="cost-warning">
              <AlertCircle size={20} className="cost-warning-icon" />
              <div className="cost-warning-text">
                <strong>Usage Notice:</strong> Practice interviews are included in your subscription plan.
                {userPlan?.isUnlimited ? (
                  " You have unlimited access."
                ) : (
                  <>
                    {" "}You have {userPlan?.mockInterviews === 0 ? "no" : userPlan?.mockInterviews} practice session{userPlan?.mockInterviews === 1 ? "" : "s"} remaining this month.
                  </>
                )}
              </div>
            </div>
            {isMobileOrTablet ? (
              <div
                style={{
                  padding: "2rem",
                  textAlign: "center",
                  color: "#b91c1c",
                  background: "#fef2f2",
                  border: "1px solid #fca5a5",
                  borderRadius: "12px",
                  fontWeight: "600",
                  fontSize: "1rem",
                }}
              >
                🚫 Practice Interview is only available on laptops and desktops.
                <br />
                Please switch to a compatible device (Windows, MacOS, or Linux).
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handlePracticeSubmit();
                }}
              >
                <div className="form-group">
                  <label className="form-label">Company Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g., Google, Microsoft, Amazon"
                    value={goLiveForm.companyName}
                    onChange={(e) =>
                      handleFormChange("companyName", e.target.value)
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Role *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g., Software Engineer, Product Manager"
                    value={goLiveForm.role}
                    onChange={(e) => handleFormChange("role", e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Job Description *</label>
                  <textarea
                    className="form-input form-textarea"
                    placeholder="Paste the job description here"
                    value={goLiveForm.jobDescription}
                    onChange={(e) =>
                      handleFormChange("jobDescription", e.target.value)
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Resume *</label>

                  {pastResumes.length > 0 && !goLiveForm.resume && (
                    <select
                      className="form-input"
                      onChange={(e) => {
                        const selected = pastResumes.find(
                          (r) => r.resumePathName === e.target.value
                        );
                        if (selected) {
                          setGoLiveForm((prev) => ({
                            ...prev,
                            resume: null,
                            resumePath: selected.resumePathName,
                            resumeOriginalName: selected.resumeOriginalName,
                          }));
                        } else {
                          setGoLiveForm((prev) => ({
                            ...prev,
                            resumePath: "",
                            resumeOriginalName: "",
                          }));
                        }
                      }}
                      value={goLiveForm.resumePath}
                    >
                      <option value="">Select Previously Used Resume</option>
                      {pastResumes.map((resume) => (
                        <option
                          key={resume.resumePathName}
                          value={resume.resumePathName}
                        >
                          {resume.resumeOriginalName}
                        </option>
                      ))}
                    </select>
                  )}

                  {pastResumes.length > 0 &&
                    !goLiveForm.resumePath &&
                    !goLiveForm.resume && (
                      <label
                        className="form-label"
                        style={{
                          marginTop: "1rem",
                          textAlign: "center",
                          marginBottom: "1rem",
                        }}
                      >
                        Or
                      </label>
                    )}

                  {!goLiveForm.resumePath && (
                    <>
                      {/* Hidden file input */}
                      <input
                        id="resume-upload"
                        type="file"
                        className="file-input"
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            setGoLiveForm((prev) => ({
                              ...prev,
                              resume: file,
                              resumePath: "",
                              resumeOriginalName: "",
                            }));
                          }
                        }}
                        style={{ display: "none" }}
                      />

                      {/* Styled visible upload box */}
                      <div
                        className={`file-upload ${goLiveForm.resume ? "has-file" : ""}`}
                        onClick={() => document.getElementById("resume-upload").click()}
                        style={{
                          cursor: "pointer",
                          padding: "1.25rem",
                          borderRadius: "10px",
                          border: `3px dashed ${goLiveForm.resume ? "#10b981" : "#cbd5e1"}`, // 👈 border color changes + 3px
                          textAlign: "center",
                          backgroundColor: goLiveForm.resume ? "#ecfdf5" : "#f8fafc", // 👈 bg color changes
                          transition: "all 0.3s ease", // 👈 smooth transition
                        }}
                      >
                        <Upload
                          size={28}
                          color={goLiveForm.resume ? "#10b981" : "#64748b"}
                          style={{ marginBottom: "0.5rem" }}
                        />
                        <div
                          style={{
                            fontWeight: "600",
                            color: goLiveForm.resume ? "#10b981" : "#64748b",
                            fontSize: "1rem",
                          }}
                        >
                          {goLiveForm.resume ? goLiveForm.resume.name : "Click to upload resume"}
                        </div>
                        <div style={{ fontSize: "0.875rem", color: "#64748b" }}>
                          PDF, DOC, DOCX (Max 5MB)
                        </div>
                      </div>
                    </>
                  )}



                </div>
                {userPlan && !userPlan.isUnlimited && userPlan.mockInterviews === 0 && (
                  <div className="limit-error">
                    <AlertCircle size={18} />
                    <span>You've used all your mock interviews. <button
                      type="button"
                      className="upgrade-link"
                      onClick={() => {
                        setPracticeModalOpen(false);
                        setShowPlansModal(true);
                      }}
                    >Top-up now</button> to unlock more practice sessions!</span>
                  </div>
                )}
                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setPracticeModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={
                      startingPractice ||
                      !goLiveForm.companyName ||
                      !goLiveForm.role ||
                      goLiveForm.jobDescription.trim().length < 3 ||
                      (!goLiveForm.resume && !goLiveForm.resumePath)
                    }
                  >
                    {startingPractice ? (
                      <>
                        <span
                          className="spinner"
                          style={{ marginRight: "8px" }}
                        ></span>
                        Starting...
                      </>
                    ) : (
                      <>
                        <Rocket size={20} />
                        Start Practice
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        <PlansModal
          showPlansModal={showPlansModal}
          setShowPlansModal={setShowPlansModal}
          userPlan={userPlan}
          handlePlanSelect={handlePlanSelect}
          currency={currency}
          calculateTotal={calculateTotal}
          addOns={addOns}
          setAddOns={setAddOns}
          handleTopUpPurchase={handleTopUpPurchase}
          loading={loading}
        />

      </>
    </div>
  );
};

export default Home;