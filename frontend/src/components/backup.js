import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import WelcomeScreen from "./WelcomeScreen"; // Adjust path as needed
import ManageProfile from "./ManageProfile"; // adjust path if needed
import FeedbackForm from "./FeedbackForm"; // adjust path if needed
import {
  getStorage,
  ref,
  getDownloadURL,
  getBlob,
  listAll,
} from "firebase/storage";


// Add this new component after the existing imports and before the Home component
const BuyCreditsModal = ({ isOpen, onClose, onPurchase, currentCredits }) => {
  const [selectedPack, setSelectedPack] = useState(null);
  const [customCredits, setCustomCredits] = useState("");
  const [isCustom, setIsCustom] = useState(false);

  const creditPacks = [
    { name: "Starter Pack", credits: 30, cost: 90, savings: 0 },
    { name: "Pro Pack", credits: 100, cost: 290, savings: 3 },
    { name: "Power Pack", credits: 300, cost: 850, savings: 5.5 },
  ];

  const handlePackSelect = (pack) => {
    setSelectedPack(pack);
    setIsCustom(false);
    setCustomCredits("");
  };

  const handleCustomSelect = () => {
    setIsCustom(true);
    setSelectedPack(null);
  };

  const calculateCustomCost = (credits) => {
    return Math.ceil(credits * 3); // ₹3 per credit
  };

  const handlePurchase = () => {
    if (isCustom && customCredits) {
      const credits = parseInt(customCredits);
      if (credits >= 30) {
        onPurchase({
          name: "Custom Pack",
          credits: credits,
          cost: calculateCustomCost(credits),
        });
      } else {
        return;
      }
    } else if (selectedPack) {
      onPurchase(selectedPack);
    } else {
      alert("Please select a pack or enter custom amount");
      return;
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={`modal-overlay ${isOpen ? "open" : ""}`} onClick={onClose}>
      <div
        className="modal-content buy-credits-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Buy Credits</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="current-balance">
          <div className="balance-card">
            <CreditCard size={20} />
            <div>
              <div className="balance-amount">{currentCredits}</div>
              <div className="balance-label">Current Credits</div>
            </div>
          </div>
        </div>

        <div className="credits-packages">
          <h3>Choose Package</h3>
          <div className="packages-grid">
            {creditPacks.map((pack, index) => (
              <div
                key={index}
                className={`package-card ${selectedPack?.name === pack.name ? "selected" : ""
                  } ${pack.name === "Pro Pack" ? "popular" : ""}`}
                onClick={() => handlePackSelect(pack)}
              >
                {pack.name === "Pro Pack" && (
                  <div className="popular-badge">Most Popular</div>
                )}
                <div className="package-name">{pack.name}</div>
                <div className="package-credits">{pack.credits} Credits</div>
                <div className="package-cost">₹{pack.cost}</div>
                <div className="package-rate">
                  ₹{(pack.cost / pack.credits).toFixed(1)} per credit
                </div>
                {pack.savings > 0 && (
                  <div className="package-savings">Save {pack.savings}%</div>
                )}
              </div>
            ))}
          </div>

          <div className="custom-amount-section">
            <div
              className={`custom-option ${isCustom ? "selected" : ""}`}
              onClick={handleCustomSelect}
            >
              <div className="custom-header">
                <Plus size={20} />
                <span>Custom Amount</span>
              </div>
              {isCustom && (
                <div className="custom-input-section">
                  <div className="input-group">
                    <input
                      type="number"
                      placeholder="Enter credits (min 30)"
                      value={customCredits}
                      onChange={(e) => setCustomCredits(e.target.value)}
                      min="30"
                      className="custom-credits-input"
                    />
                    <span className="input-suffix">Credits</span>
                  </div>
                  {customCredits && parseInt(customCredits) >= 30 && (
                    <div className="custom-cost">
                      Total: ₹{calculateCustomCost(parseInt(customCredits))}
                    </div>
                  )}
                  {customCredits && parseInt(customCredits) < 30 && (
                    <div className="custom-error">
                      Minimum 30 credits required
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handlePurchase}
            disabled={
              (!selectedPack && !isCustom) ||
              (isCustom && (!customCredits || parseInt(customCredits) < 30))
            }
          >
            <CreditCard size={20} />
            Purchase Credits
          </button>
        </div>
      </div>
    </div>
  );
};

const Home = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [goLiveModalOpen, setGoLiveModalOpen] = useState(false);
  const navigate = useNavigate();
  const [userName, setUserName] = useState("");
  const [userPhoto, setUserPhoto] = useState("");
  const [credits, setCredits] = useState(0);
  const [interviewHistory, setInterviewHistory] = useState([]);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false); // Add this at the top
  const razorpay_key = process.env.REACT_APP_RAZORPAY_KEY_ID;
  const backend_url = process.env.REACT_APP_BACKEND_URL;
  const [loading, setLoading] = useState(true);
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);
  const componentRef = useRef(null);

  // Go Live Modal Form State
  const [goLiveForm, setGoLiveForm] = useState({
    companyName: "",
    role: "",
    jobDescription: "",
    resume: null,
    resumePath: "",
    resumeOriginalName: "",
    difficulty: "Company",
  });

  // Add this state in the Home component (after existing useState declarations)
  const [buyCreditsModalOpen, setBuyCreditsModalOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [toastMessage, setToastMessage] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [activeView, setActiveView] = useState("home"); // "home" or "profile"
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

  // Scroll to top when activeView changes to atsChecker
  useEffect(() => {
    if (activeView === "atsChecker") {
      // Immediate scroll to top
      window.scrollTo(0, 0);
      
      // Smooth scroll after a small delay to ensure the component is rendered
      const timer = setTimeout(() => {
        // Smooth scroll the window
        window.scrollTo({
          top: 0,
          left: 0,
          behavior: 'smooth'
        });
        
        // Also try to scroll any main container
        const mainContainer = document.querySelector('.main-content') || document.documentElement;
        if (mainContainer) {
          mainContainer.scrollTo({ top: 0, behavior: 'smooth' });
        }
        
        // Scroll the ATS component into view
        if (atsAnalyserRef.current) {
          atsAnalyserRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
          });
        }
      }, 150);
      
      return () => clearTimeout(timer);
    }
  }, [activeView]);

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

  if (process.env.REACT_APP_ENV === "production") {
    console.log = () => { };
    console.warn = () => { };
    console.error = () => { };
  }
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
    if (!window.Razorpay) {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
    }
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
    const localName = localStorage.getItem("userName");

    if (!email) {
      navigate("/", { replace: true });
      return;
    }

    const initializeUser = async () => {
      try {
        // 1. Handle profile photo
        await handleProfilePhotoSetup(email);

        // 2. Fetch user info from 'users' collection
        const q = query(collection(db, "users"), where("email", "==", email));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          setShowNamePrompt(true);
        } else {
          const user = snapshot.docs[0].data();
          const userName = user.userName || "Guest";
          setUserName(userName);
          localStorage.setItem("userName", userName);

          if (!user.userName || user.userName === "Guest") {
            setShowNamePrompt(true);
          }
        }

        // 3. Check if user has already received welcome credits
        const onceUserSnap = await getDocs(
          query(collection(db, "onceUser"), where("email", "==", email))
        );

        const isFirstTime = onceUserSnap.empty;

        if (isFirstTime) {
          // 4. Create 'onceUser' entry
          await addDoc(collection(db, "onceUser"), {
            email,
            createdAt: new Date().toISOString(),
          });

          // 5. Give 10 free credits in 'userCredits'
          await addDoc(collection(db, "userCredits"), {
            email,
            credits: 10,
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
          });

          setCredits(10);
          setTimeout(() => setShowWelcomeModal(true), 200);
        } else {
          // 6. Just fetch existing credits
          const { credits: userCredits } = await fetchUserCredits(email);
          setCredits(userCredits);
        }

        setLoading(false);
      } catch (err) {
        setUserName("Guest");
        setUserPhoto(profile_pic);
        setLoading(false);
      }
    };

    initializeUser();
  }, [navigate]);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "auto";
  }, [mobileMenuOpen]);

  useEffect(() => {
    // Auto-close mobile nav when switching views
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
            duration: info.totalTime || Math.ceil((info.keywords?.length || 7) * 1.5), // Fallback duration estimate
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
      // First, try to get photo from Firebase

      // Photo exists in Firebase, use it
      const exists = await doesFileExist(`${email}.png`);
      if (exists) {
        const firebaseUrl = await getDownloadURL(photoRef);
        setUserPhoto(firebaseUrl);
      } else {
        setUserPhoto(profile_pic); // fallback
      }
    } catch (err) {
      if (err.code === "storage/object-not-found") {
        // No photo in Firebase, check if we have social login photo to upload
        if (
          socialPhotoUrl &&
          socialPhotoUrl.startsWith("http") &&
          !socialPhotoUrl.includes("localhost") &&
          !socialPhotoUrl.includes("firebasestorage")
        ) {
          await uploadSocialPhotoToFirebase(email, socialPhotoUrl);

          // After upload, try to get the Firebase URL again
          try {
            const newFirebaseUrl = await getDownloadURL(photoRef);
            setUserPhoto(newFirebaseUrl);
          } catch (uploadErr) {
            setUserPhoto(profile_pic);
          }
        } else {
          // No social photo available, use placeholder
          setUserPhoto(profile_pic);
        }
      } else {
        setUserPhoto(profile_pic);
      }
    }
  };

  const showTooltip = (e, id) => {
    const tooltip = document.getElementById(`${id}-tooltip`);
    if (tooltip) tooltip.style.display = "block";
  };

  const hideTooltip = (id) => {
    const tooltip = document.getElementById(`${id}-tooltip`);
    if (tooltip) tooltip.style.display = "none";
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

  // Update your handleSaveName function:
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

      const {
        credits: userCredits,
        createdNew,
        needsCreate,
      } = await fetchUserCredits(email);

      if (needsCreate) {
        const onceUserSnap = await getDocs(
          query(collection(db, "onceUser"), where("email", "==", email))
        );

        const isFirstTime = onceUserSnap.empty;

        if (isFirstTime) {
          await addDoc(collection(db, "userCredits"), {
            email,
            credits: 10,
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
          });

          await addDoc(collection(db, "onceUser"), {
            email,
            createdAt: new Date().toISOString(),
          });

          setCredits(10);
          setTimeout(() => setShowWelcomeModal(true), 200);
        } else {
          setCredits(userCredits);
        }
      } else {
        setCredits(userCredits);
      }
    } catch (err) { }
  };

  // Replace the existing handleRecharge function with this:
  const handleRecharge = () => {
    setBuyCreditsModalOpen(true);
  };

  const handleCreditPurchase = async (purchaseData) => {
    if (!window.Razorpay) {
      alert("Razorpay SDK failed to load.");
      return;
    }

    const res = await fetch(`${backend_url}/api/create-order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: purchaseData.cost }),
    });

    const order = await res.json();

    const options = {
      key: razorpay_key,
      amount: order.amount,
      currency: order.currency,
      name: "Voizon",
      order_id: order.id,
      handler: async (response) => {
        const email = localStorage.getItem("userEmail");

        const verifyRes = await fetch(`${backend_url}/api/verify-payment`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature,
          }),
        });

        const data = await verifyRes.json();

        if (verifyRes.ok && data.success) {
          // ✅ Update credits in Firebase
          const email = localStorage.getItem("userEmail");

          const q = query(
            collection(db, "userCredits"),
            where("email", "==", email)
          );
          const snapshot = await getDocs(q);

          if (!snapshot.empty) {
            const userDoc = snapshot.docs[0];
            const currentCredits = userDoc.data().credits || 0;
            await updateDoc(userDoc.ref, {
              credits: currentCredits + purchaseData.credits,
              lastUpdated: new Date().toISOString(),
            });
          } else {
            await addDoc(collection(db, "userCredits"), {
              email,
              credits: purchaseData.credits,
              createdAt: new Date().toISOString(),
              lastUpdated: new Date().toISOString(),
            });
          }

          await addDoc(collection(db, "purchaseHistory"), {
            email,
            credits: purchaseData.credits,
            cost: purchaseData.cost,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            createdAt: new Date().toISOString(),
          });

          setToastMessage(
            `🎉 Purchase of ${purchaseData.credits} credits successful for ₹${purchaseData.cost}`
          );
          setShowToast(true);
          setTimeout(() => setShowToast(false), 5000);

          setCredits((prev) => prev + purchaseData.credits);
        } else {
          setToastMessage(
            `❌ Payment failed. ${data.error || "Please try again."}`
          );
          setShowToast(true);
          setTimeout(() => setShowToast(false), 5000);
        }
      },
    };

    const razorpay = new window.Razorpay(options);
    razorpay.open();
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

            // ✅ If interview is still 'ongoing' and started >24h ago, mark as completed
            if (info.status === "ongoing" && hoursPassed > 24) {
              await updateDoc(docSnap.ref, {
                status: "incomplete",
                interviewEndTime: new Date().toISOString(),
                totalInterviewTime: "-", // or estimate if available
              });
              info.status = "incomplete"; // update local state for rendering
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

        // Sort by newest interview
        data.sort(
          (a, b) =>
            new Date(b.interviewStartTime) - new Date(a.interviewStartTime)
        );

        setInterviewHistory(data);

        // Collect distinct past resumes
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

  const fetchUserCredits = async (email) => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const q = query(
        collection(db, "userCredits"),
        where("email", "==", cleanEmail)
      );
      const snapshot = await getDocs(q);

      // Handle duplicates if they exist
      if (snapshot.size > 1) {
        let totalCredits = 0;
        const docsToDelete = [];

        snapshot.docs.forEach((doc, index) => {
          if (index === 0) {
            totalCredits = Math.max(totalCredits, doc.data().credits || 0);
          } else {
            totalCredits += doc.data().credits || 0;
            docsToDelete.push(doc.ref);
          }
        });

        if (docsToDelete.length > 0) {
          await updateDoc(snapshot.docs[0].ref, {
            credits: totalCredits,
            lastUpdated: new Date().toISOString(),
          });
          for (const docRef of docsToDelete) {
            await deleteDoc(docRef);
          }
        }

        return { credits: totalCredits, createdNew: false };
      }

      if (!snapshot.empty) {
        return {
          credits: snapshot.docs[0].data().credits || 0,
          createdNew: false,
        };
      }

      return { credits: 0, createdNew: false, needsCreate: true };
    } catch (error) {
      return { credits: 0, createdNew: false, needsCreate: false };
    }
  };

  const handleLogout = () => {
    // Clear local storage and redirect to login page
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
      setStartingInterview(true); // ✅ Start loading

      // Validate form data before submitting
      if (
        !goLiveForm.companyName ||
        !goLiveForm.role ||
        (!goLiveForm.resume && !goLiveForm.resumePath)
      ) {
        alert("Please fill in all required fields");
        setStartingInterview(false); // stop loading on failure

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

      // ✅ Now safely use values (uploadData won't be used directly)

      const getISTTimeString = () => {
        const now = new Date();

        // IST offset in minutes (5 hours 30 minutes)
        const ISTOffset = 330 * 60 * 1000;
        const istDate = new Date(
          now.getTime() + ISTOffset - now.getTimezoneOffset() * 60 * 1000
        );

        return istDate.toISOString().replace("Z", "+05:30");
      };

      // Prepare interview data for Firestore
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

      // Save to Firestore
      const docRef = await addDoc(
        collection(db, "currentInterviews"),
        interviewData
      );

      // Reset form and close modal
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
      setStartingInterview(false); // stop loading on failure
      resetGoLiveForm(); // Reset form after submission
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
      a.target = "_blank"; // avoids popup blocking
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert("Failed to download the report. Try again later.");
    }
  };

  const handlePracticeSubmit = async () => {
    try {
      setStartingPractice(true); // ✅ start loading

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
      setStartingPractice(false); // ✅ stop loading
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
    "{name}, let’s crack it today!",
    "You're on fire, {name}!",
    "Welcome back {name}!",
    "Time to shine, {name}!",
    "All set, {name}?",
    "God mode activated, {name}!",
    "Let’s make it count, {name}!",
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
        {/* Header */}
        <header className="header" ref={componentRef}>
          <div className="header-content">
            <div className="logo">
              <img src={logo} alt="Logo" style={{ width: 40, height: 40 }} />
              Voizon
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
                          handleRecharge();
                        }}
                      >
                        <Plus size={16} /> Buy Credits
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
              {/* <a
              href="#history"
              className="nav-link"
              onClick={(e) => {
                setMobileMenuOpen(false);
                e.preventDefault();
                setActiveView("home");
                setTimeout(() => {
                  const section = document.querySelector("#history");
                  if (section) section.scrollIntoView({ behavior: "smooth" });
                }, 100);
              }}
            >
              History
            </a>
            <a
              href="#feedback"
              className="nav-link"
              onClick={(e) => {
                setMobileMenuOpen(false);
                e.preventDefault();
                setActiveView("home");
                setTimeout(() => {
                  const section = document.querySelector("#feedback");
                  if (section) section.scrollIntoView({ behavior: "smooth" });
                }, 100);
              }}
            >
              Feedback
            </a> */}
            </nav>

            {/* 🟢 Move header-right ABOVE nav-menu */}
            {!mobileMenuOpen && (
              <div className="header-right">
                <div
                  className={`credits-display ${credits <= 10 ? "low-credits" : ""}`}
                >
                  <CreditCard size={16} />
                  <span
                    className={`credits-number ${credits <= 10 ? "low-credits-number" : ""}`}
                  >
                    {credits.toFixed(2)}
                  </span>
                  <span>Credits</span>
                </div>


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
                        handleRecharge();
                      }}
                    >
                      <Plus size={16} /> Buy Credits
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

            {/* Mobile Menu Toggle */}
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
              {/* Header Section */}
              <header className="vz-home-header">
                <div className="vz-credits-badge">
                  <div className="vz-credits-inner">
                    <CreditCard size={18} className="vz-credits-icon" />
                    <span className={`vz-credits-value ${credits <= 10 ? "vz-low-credits" : ""}`}>
                      {credits}
                    </span>
                    <span className="vz-credits-label">credits</span>
                  </div>
                  {credits <= 10 && (
                    <div className="vz-credits-warning">
                      <AlertCircle size={14} />
                      <span>Low credits</span>
                    </div>
                  )}
                </div>
              </header>

              {/* Hero Section */}
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

                    <button
                      className="vz-secondary-cta"
                      onClick={handleGoLive}
                    >
                      <Video size={20} className="vz-cta-icon" />
                      <span>Live Interview</span>
                    </button>
                  </div>
                </div>

                <div className="vz-hero-graphic">
                  <div className="vz-graphic-element vz-graphic-1"></div>
                  <div className="vz-graphic-element vz-graphic-2"></div>
                  <div className="vz-graphic-element vz-graphic-3"></div>
                </div>
              </section>

              {/* Activity Dashboard */}
              <div className="vz-activity-dashboard">
                {/* Stats Overview */}
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
                    <div className="vz-stat-icon" style={{ backgroundColor: '#ede9fe' }}>
                      <Clock size={20} color="#7c3aed" />
                    </div>
                    <div className="vz-stat-content">
                      <span className="vz-stat-value">{interviewHistory.length}</span>
                      <span className="vz-stat-label">Live Interviews</span>
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

                {/* Resume ATS Checker */}
                <div className="vz-stat-card vz-resume-checker-card" onClick={() => {
                  setActiveView('atsChecker');
                  window.scrollTo({ top: -100, behavior: 'smooth' });
                }}
                >
                  {/* New Ribbon */}
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
                  {/* Animated Arrow Indicator */}
                  <div className="arrow-indicator">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M5 12h14M12 5l7 7-7 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>


                {/* Recent Activity Tabs */}
                <div className="vz-activity-tabs">
                  <div className="vz-tab-header">
                    <button
                      className={`vz-tab-btn ${activeTab === 'practice' ? 'vz-tab-active' : ''}`}
                      onClick={() => setActiveTab('practice')}
                    >
                      <Activity size={18} className="vz-tab-icon" />
                      Practice History
                    </button>
                    <button
                      className={`vz-tab-btn ${activeTab === 'interviews' ? 'vz-tab-active' : ''}`}
                      onClick={() => setActiveTab('interviews')}
                    >
                      <Clock size={18} className="vz-tab-icon" />
                      Live Interviews
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
            setUserName={setUserName} // ✅ Add this
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
                <strong>Cost Notice:</strong> Each minute of live interview
                recording costs 3 credits per minute. Make sure you have
                sufficient credits before starting.
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

        <BuyCreditsModal
          isOpen={buyCreditsModalOpen}
          onClose={() => setBuyCreditsModalOpen(false)}
          onPurchase={handleCreditPurchase}
          currentCredits={credits}
        />

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
          <div className="toast-overlay" onClick={() => setShowToast(false)}>
            <div
              className={`toast-card ${toastMessage.startsWith("❌") ? "error" : "success"
                }`}
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={toastMessage.startsWith("❌") ? error : success}
                alt="status animation"
                className="toast-animation"
                style={{ width: "60px", height: "60px" }}
              />

              <p className="toast-text">{toastMessage}</p>
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
                <strong>Cost Notice:</strong> Each minute of practics interview
                costs 1 credits per minute. Make sure you have sufficient credits
                before starting.
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
      </>
    </div>
  );
};

export default Home;
