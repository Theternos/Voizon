import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/home.css";
import logo from "../images/logo_bg.png";
import profile_pic from "../images/user_placeholder.png";
import success from "../images/success.gif";
import error from "../images/error.gif";
import { db } from "../firebase/config";
import MockInterviewModal from "./test";

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
    { name: "Enterprise Pack", credits: 1000, cost: 2750, savings: 8 },
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

const DummyHome = () => {
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

  const paginatedInterviews = interviewHistory.slice(
    offset,
    offset + interviewsPerPage
  );

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

  const pricingPlans = [
    {
      name: "Free Trial",
      price: "Free",
      credits: "10 minutes",
      description: "Perfect for getting started",
      features: [
        "10 minutes of interview practice",
        "Basic AI responses",
        "Resume upload",
        "Session recording",
      ],
      isPopular: false,
      buttonText: "Start Free Trial",
      buttonClass: "pricing-btn-primary",
    },
    {
      name: "Starter Pack",
      price: "₹90",
      credits: "30 credits",
      description: "Great for occasional practice",
      features: [
        "30 minutes of interview practice",
        "Advanced AI responses",
        "PDF report download",
        "Email support",
        "Resume context awareness",
      ],
      isPopular: false,
      buttonText: "Choose Starter",
      buttonClass: "pricing-btn-secondary",
    },
    {
      name: "Pro Pack",
      price: "₹290",
      credits: "100 credits",
      description: "Most popular choice",
      features: [
        "100 minutes of interview practice",
        "Premium AI responses",
        "Follow-up question support",
        "Multiple resume storage",
      ],
      isPopular: true,
      buttonText: "Choose Pro",
      buttonClass: "pricing-btn-primary",
    },
    {
      name: "Power Pack",
      price: "₹850",
      credits: "300 credits",
      description: "For serious job seekers",
      features: [
        "300 minutes of interview practice",
        "Detailed performance insights",
        "Industry-specific questions",
        "Career advancement tracking",
      ],
      isPopular: false,
      buttonText: "Choose Power",
      buttonClass: "pricing-btn-secondary",
    },
    {
      name: "Expertise Pack",
      price: "₹2750",
      credits: "1000 credits",
      description: "Ultimate interview mastery",
      features: [
        "1000 minutes of interview practice",
        "Custom question sets",
        "Unlimited resume storage",
        "Priority feature access",
      ],
      isPopular: false,
      buttonText: "Choose Expertise",
      buttonClass: "pricing-btn-secondary",
    },
  ];

  if (loading) return null;

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
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
            <a
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
              href="#pricing"
              className="nav-link"
              onClick={(e) => {
                setMobileMenuOpen(false);
                e.preventDefault();
                setActiveView("home");
                setTimeout(() => {
                  const section = document.querySelector("#pricing");
                  if (section) section.scrollIntoView({ behavior: "smooth" });
                }, 100);
              }}
            >
              Pricing
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
            </a>
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

      {activeView === "home" && (
        <>
          {/* Main Content */}
          <div
            className={`credits-display mobile-credits-display ${credits <= 10 ? "low-credits" : ""
              }`}
          >
            <CreditCard size={16} />
            <span
              className={`credits-number ${credits <= 10 ? "low-credits-number" : ""
                }`}
            >
              {credits}
            </span>
            <span>Credits Available</span>
          </div>
          <main className="main-content">
            {/* Welcome Section */}
            <section className="welcome-section">
              <h1 className="welcome-title">
                {greeting.replace("{name}", userName)}
              </h1>
              <p className="welcome-subtitle">
                Ready to ace your next interview? Let's get started.
              </p>

              <div className="cta-buttons the-hero-buttons">
                <button
                  className="btn btn-primary the-hero-button"
                  onClick={() => setPracticeModalOpen(true)}
                >
                  <Rocket size={20} />
                  Start Practice
                </button>
                <button
                  className="btn btn-secondary the-hero-button"
                  onClick={handleGoLive}
                >
                  <Video size={20} />
                  Go Live
                </button>
              </div>
            </section>

            {/* Interview History Full Width */}
            <section className="interview-history-section" id="history">
              <div className="history-header">
                <div className="card-icon" style={{ background: "#3b82f6" }}>
                  <Clock size={24} />
                </div>
                <h2 className="card-title">Interview History</h2>
              </div>
              <div className="history-grid">
                {interviewHistory.length === 0 ? (
                  <div
                    style={{
                      padding: "3rem",
                      textAlign: "center",
                      color: "#94a3b8",
                      background: "#f8fafc",
                      borderRadius: "12px",
                      border: "1px dashed #cbd5e1",
                      width: "100%",
                    }}
                  >
                    <Clock size={40} style={{ marginBottom: "1rem" }} />
                    <h3
                      style={{
                        fontWeight: "600",
                        fontSize: "1.25rem",
                        color: "#64748b",
                      }}
                    >
                      No Interview History Yet
                    </h3>
                    <p style={{ fontSize: "0.9rem", marginTop: "0.5rem" }}>
                      Your past interviews will appear here once completed.
                    </p>
                  </div>
                ) : (
                  paginatedInterviews.map((interview) => (
                    <div key={interview.id} className="history-item">
                      <div className="company-info">
                        <div className="company-icon">
                          <Building size={20} />
                        </div>
                        <div>
                          <div style={{ fontWeight: "600", color: "#1e293b" }}>
                            {interview.companyName}
                          </div>
                          <div
                            style={{ fontSize: "0.875rem", color: "#64748b" }}
                          >
                            {interview.date}
                          </div>
                        </div>
                      </div>
                      <div>
                        <div style={{ fontWeight: "600", color: "#1e293b" }}>
                          {interview.role}
                        </div>
                        <div style={{ fontSize: "0.875rem", color: "#64748b" }}>
                          Role Applied
                        </div>
                      </div>
                      <div>
                        <div
                          style={{
                            fontWeight: "600",
                            color: "#1e293b",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                          }}
                        >
                          <FileText size={16} />
                          {interview.resumeOriginalName || "N/A"}
                        </div>
                        <div style={{ fontSize: "0.875rem", color: "#64748b" }}>
                          Resume Used
                        </div>
                      </div>
                      {interview.status === "completed" ? (
                        <div>
                          <div style={{ color: "#64748b" }}>
                            {interview.totalInterviewTime || "-"}
                          </div>
                          <div style={{ fontSize: "0.875rem", color: "#64748b" }}>
                            Duration
                          </div>
                        </div>
                      ) : (
                        <div style={{ color: "#64748b" }}>-</div>
                      )}
                      <div>
                        {interview.interviewId && interview.status !== "incomplete" ? (
                          interview.status === "completed" ? (
                            <button
                              className="btn btn-sm btn-primary"
                              style={{ minWidth: "110px" }}
                              onClick={() =>
                                downloadInterviewPdf(
                                  interview.interviewId,
                                  interview.companyName,
                                  interview.role
                                )
                              }
                            >
                              Download
                            </button>
                          ) : (
                            <button
                              className="btn btn-sm btn-secondary"
                              style={{
                                minWidth: "110px",
                                textAlign: "center",
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                              }}
                              onClick={() => navigate(`/voizon?yjGb=${interview.interviewId}`)}
                            >
                              Rejoin
                            </button>
                          )
                        ) : (
                          <div style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                            <div style={{ position: "relative" }}>
                              <span
                                style={{
                                  color: "#64748b",
                                  cursor: "pointer",
                                  fontSize: "12px",
                                  border: "1px solid #cbd5e1",
                                  borderRadius: "50%",
                                  width: "30px",
                                  height: "30px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontWeight: "bold",
                                  backgroundColor: "#f1f5f9",
                                  lineHeight: "1",
                                }}
                                onMouseEnter={(e) => {
                                  const tooltip = e.currentTarget.nextSibling;
                                  tooltip.style.display = "block";
                                }}
                                onMouseLeave={(e) => {
                                  const tooltip = e.currentTarget.nextSibling;
                                  tooltip.style.display = "none";
                                }}
                              >
                                i
                              </span>

                              <div
                                style={{
                                  display: "none",
                                  position: "absolute",
                                  top: "-240px",
                                  left: "50%",
                                  transform: "translateX(-50%)",
                                  background: "#f8fafc",
                                  color: "#1e293b",
                                  fontSize: "12px",
                                  padding: "10px",
                                  borderRadius: "8px",
                                  border: "1px solid #e2e8f0",
                                  boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                                  width: "220px",
                                  zIndex: 10,
                                  textAlign: "left",
                                  whiteSpace: "normal",
                                }}
                              >
                                <strong>Why Not Available?</strong><br />
                                • The interview wasn't ended manually.<br />
                                • It exceeded the 24-hour window.<br />
                                • It was auto-marked as incomplete.<br />
                                • No questions or answers were saved.<br />
                                <br />
                                Please ensure to end interviews next time so the report is generated properly.
                              </div>
                            </div>
                            <span style={{ color: "#9ca3af", fontSize: "12px" }}>Not Available</span>
                          </div>
                        )}

                      </div>
                    </div>
                  ))
                )}
              </div>
              {interviewHistory.length > 4 && (
                <div className="pagination-controls">
                  <span style={{ margin: "0 10px", fontWeight: "500" }}>
                    Page {currentPage + 1} of {totalPages}
                  </span>
                  {currentPage > 0 && (
                    <button onClick={() => setCurrentPage(currentPage - 1)}>
                      ← Previous
                    </button>
                  )}
                  {currentPage < totalPages - 1 && (
                    <button onClick={() => setCurrentPage(currentPage + 1)}>
                      Next →
                    </button>
                  )}
                </div>
              )}
            </section>

            {/* Pricing Section */}
            <section className="pricing-section" id="pricing">
              <h2 className="pricing-title">Buy Credits</h2>
              <p className="pricing-subtitle">
                1 credit = ₹3. Each minute of interview costs 1 credit.
              </p>

              <div className="pricing-grid">
                {pricingPlans.map((plan, index) => (
                  <div
                    key={index}
                    className={`pricing-card ${plan.isPopular ? "popular" : ""
                      }`}
                  >
                    {plan.isPopular && (
                      <div className="popular-badge">Most Popular</div>
                    )}
                    <div className="pricing-header">
                      <h3 className="plan-name">{plan.name}</h3>
                      <div className="plan-price">{plan.price}</div>
                      <div className="plan-credits">{plan.credits}</div>
                      <p className="plan-description">{plan.description}</p>
                    </div>
                    <ul className="plan-features">
                      {plan.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="plan-feature">
                          <Check className="check-icon" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <button
                      className={`pricing-btn ${plan.buttonClass}`}
                      onClick={() => handleRecharge()}
                    >
                      {plan.buttonText}
                    </button>
                  </div>
                ))}
              </div>
              <div className="payment-security">
                <div className="security-badge">
                  <Shield className="security-icon" />
                  <span>Secured by Razorpay</span>
                </div>
                <p className="security-text">
                  All payments are processed securely through Razorpay with
                  bank-level encryption
                </p>
              </div>
            </section>

            {/* Feedback Section */}
            <div
              className="dashboard-card"
              style={{ textAlign: "center" }}
              id="feedback"
            >
              <h3 className="card-title" style={{ marginBottom: "1rem" }}>
                Help Us Improve
              </h3>
              <p style={{ color: "#64748b", marginBottom: "1.5rem" }}>
                Your feedback helps us make Voizon better for everyone.
              </p>
              <button
                className="btn"
                style={{
                  background: "#f1f5f9",
                  color: "#3b82f6",
                  border: "1px solid #e2e8f0",
                }}
                onClick={() => {
                  setActiveView("feedback");
                }}
              >
                <MessageSquare size={20} />
                Give Feedback / Request Feature
              </button>
            </div>
          </main>
        </>
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
                  <div
                    className={`file-upload ${goLiveForm.resume ? "has-file" : ""
                      }`}
                    onClick={() =>
                      document.getElementById("resume-upload").click()
                    }
                  >
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
                      required={!goLiveForm.resumePath}
                    />
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <Upload
                        size={24}
                        color={goLiveForm.resume ? "#10b981" : "#64748b"}
                      />
                      <div
                        style={{
                          fontWeight: "600",
                          color: goLiveForm.resume ? "#10b981" : "#64748b",
                        }}
                      >
                        {goLiveForm.resume
                          ? goLiveForm.resume.name
                          : "Click to upload resume"}
                      </div>
                      <div style={{ fontSize: "0.875rem", color: "#64748b" }}>
                        PDF, DOC, DOCX (Max 5MB)
                      </div>
                    </div>
                  </div>
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
                  <div
                    className={`file-upload ${goLiveForm.resume ? "has-file" : ""
                      }`}
                    onClick={() =>
                      document.getElementById("resume-upload").click()
                    }
                  >
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
                      required={!goLiveForm.resumePath}
                    />
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <Upload
                        size={24}
                        color={goLiveForm.resume ? "#10b981" : "#64748b"}
                      />
                      <div
                        style={{
                          fontWeight: "600",
                          color: goLiveForm.resume ? "#10b981" : "#64748b",
                        }}
                      >
                        {goLiveForm.resume
                          ? goLiveForm.resume.name
                          : "Click to upload resume"}
                      </div>
                      <div style={{ fontSize: "0.875rem", color: "#64748b" }}>
                        PDF, DOC, DOCX (Max 5MB)
                      </div>
                    </div>
                  </div>
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
        {/* <MockInterviewModal onClose={() => setPracticeModalOpen(false)} /> */}
      </div>
    </div>
  );
};

export default DummyHome;