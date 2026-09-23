import React, { useState, useEffect, useRef, useCallback } from "react";
import logo from "../images/logo_bg.png";
import "../styles/voizon.css";
import { useNavigate, useLocation } from "react-router-dom";

import { auth, db } from "../firebase/config"; // Adjust path as needed
import MarkdownRenderer from "./MarkdownRernder.js"; // Adjust path as needed
import {
  doc,
  getDocs,
  collection,
  query,
  where,
  updateDoc,
} from "firebase/firestore";

import { onAuthStateChanged } from "firebase/auth";

import {
  Mic,
  MicOff,
  Monitor,
  MonitorOff,
  Upload,
  Download,
  Play,
  Square,
  Edit3,
  MessageSquare,
  Timer,
  Settings,
  TestTube,
  FileText,
} from "lucide-react";

const InterviewCracker = () => {
  // State management

  const [isActive, setIsActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [resumeContext, setResumeContext] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [transcriptions, setTranscriptions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [status, setStatus] = useState({
    message: "",
    type: "info",
    visible: false,
  });
  const [timer, setTimer] = useState({ minutes: 0, seconds: 0 });
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const [screenStream, setScreenStream] = useState(null);
  const [liveTranscription, setLiveTranscription] = useState("");
  const [editModal, setEditModal] = useState({
    show: false,
    text: "",
    originalText: "",
  });
  const latestAnswerRef = useRef(null);

  // Refs
  const timerIntervalRef = useRef(null);
  const answerDisplayRef = useRef(null);
  const transcriptionDisplayRef = useRef(null);
  const videoRef = useRef(null);

  const [currentUser, setCurrentUser] = useState(null);
  const [userInterviewData, setUserInterviewData] = useState(null);
  const [displayName, setDisplayName] = useState(null);
  const [userName, setUserName] = useState("");
  const [userPhoto, setUserPhoto] = useState("");
  const navigate = useNavigate();
  const [showEndMeetingModal, setShowEndMeetingModal] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const interviewId = queryParams.get("yjGb");
  const [loading, setLoading] = useState(true);
  const [remainingSeconds, setRemainingSeconds] = useState(null);
  const [showLowCreditPopup, setShowLowCreditPopup] = useState(false);
  const [isRemainingReady, setIsRemainingReady] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const hasEndedRef = useRef(false);
  const [backendStatus, setBackendStatus] = useState("loading");
  const startTimestampRef = useRef(null);
  const tickIntervalRef = useRef(null); // controls timer updates
  const lowCreditShownRef = useRef(false);
  const [selectedModel, setSelectedModel] = useState("Nemotron 3 Super");
  const [showModelMenu, setShowModelMenu] = useState(false);
  const hasLoadedRef = useRef(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const backend_url = process.env.REACT_APP_BACKEND_URL;
  const ws_url = process.env.REACT_APP_WS_URL;
  const [serverUrl, setServerUrl] = useState(`${backend_url}/api/ask`);
  const deepgramSocketRef = useRef(null);
  const SAMPLE_RATE = 16000; // Match backend sample rate
  const BUFFER_SIZE = 2048; // 128ms per chunk at 16kHz — smaller = lower latency
  const screenStreamRef = useRef(null); // Store screen stream separately
  const isActiveRef = useRef(false);
  const [showInstructionModal, setShowInstructionModal] = useState(true);
  const [termsAccepted, setTermsAccepted] = useState(false);

  if (process.env.REACT_APP_ENV === "production") {
    console.log = () => { };
    console.warn = () => { };
    console.error = () => { };
  }

  // Styles
  const styles = {
    container: {
      margin: 0,
      padding: 0,
      boxSizing: "border-box",
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      background: "#f8fafc",
      color: "#334155",
      height: "100vh",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column", // Make header + main stack vertically
    },
    header: {
      height: "60px",
      background: "#ffffff",
      borderBottom: "1px solid #e2e8f0",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 24px",
      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
    },
    headerLeft: {
      display: "flex",
      alignItems: "center",
      gap: "16px",
    },
    logo: {
      width: "32px",
      height: "32px",
      borderRadius: "50%",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "white",
      fontWeight: "bold",
      fontSize: "14px",
    },
    title: {
      fontSize: "18px",
      fontWeight: "600",
      color: "#1e293b",
      margin: 0,
    },
    statusBadge: {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      padding: "4px 12px",
      background: "#dcfce7",
      color: "#166534",
      borderRadius: "20px",
      fontSize: "12px",
      fontWeight: "500",
    },
    statusDot: {
      width: "6px",
      height: "6px",
      background: "#22c55e",
      borderRadius: "50%",
    },
    controls: {
      display: "flex",
      gap: "8px",
      alignItems: "center",
    },
    button: {
      padding: "8px 16px",
      fontSize: "13px",
      fontWeight: "500",
      borderRadius: "8px",
      border: "1px solid #e2e8f0",
      background: "#ffffff",
      color: "#475569",
      cursor: "pointer",
      transition: "all 0.2s ease",
      display: "flex",
      alignItems: "center",
      gap: "6px",
    },
    primaryButton: {
      background: "#3b82f6",
      color: "#ffffff",
      borderColor: "#3b82f6",
    },
    dangerButton: {
      background: "#ef4444",
      color: "#ffffff",
      borderColor: "#ef4444",
    },
    testButton: {
      background: "#f59e0b",
      color: "#ffffff",
      borderColor: "#f59e0b",
    },
    mainContainer: {
      height: "calc(100vh - 60px)",
      display: "flex",
      flex: 1,
      overflow: "hidden", // Prevent scroll bleeding here too
    },
    sidebar: {
      width: "350px",
      background: "#ffffff",
      borderRight: "1px solid #e2e8f0",
      display: "flex",
      flexDirection: "column",
    },
    screenSection: {
      padding: "16px 24px",
      borderBottom: "1px solid #e2e8f0",
    },
    sectionTitle: {
      fontSize: "12px",
      fontWeight: "600",
      color: "#64748b",
      textTransform: "uppercase",
      letterSpacing: "0.5px",
      marginBottom: "12px",
    },
    screenContainer: {
      background: "#f8fafc",
      border: "1px solid #e2e8f0",
      borderRadius: "8px",
      height: "120px",
      overflow: "hidden",
      position: "relative",
    },
    screenVideo: {
      width: "100%",
      height: "100%",
      objectFit: "cover",
    },
    screenPlaceholder: {
      height: "100%",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      color: "#94a3b8",
      fontSize: "11px",
      textAlign: "center",
    },
    screenIcon: {
      fontSize: "24px",
      marginBottom: "8px",
    },
    transcriptSection: {
      flex: 1,
      padding: "16px 24px",
      display: "flex",
      flexDirection: "column",
    },
    transcriptionDisplay: {
      height: "100%",
      maxHeight: "55vh",
      minHeight: "40vh",
      overflowY: "auto",
      background: "#f8fafc",
      border: "1px solid #e2e8f0",
      borderRadius: "8px",
      padding: "12px",
      display: "flex",
      flexDirection: "column",
      fontSize: "13px",
    },
    mainContent: {
      flex: 1,
      background: "#ffffff",
      display: "flex",
      flexDirection: "column",
    },
    mainHeader: {
      padding: "20px 24px",
      borderBottom: "1px solid #e2e8f0",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    },
    mainTitle: {
      fontSize: "16px",
      fontWeight: "600",
      color: "#1e293b",
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    copilotStatus: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      fontSize: "12px",
      color: "#64748b",
    },
    copilotReady: {
      color: "#059669",
      fontWeight: "500",
    },
    autoScrollToggle: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      fontSize: "12px",
      color: "#64748b",
    },
    toggleSwitch: {
      width: "40px",
      height: "20px",
      background: "#e2e8f0",
      borderRadius: "10px",
      position: "relative",
      cursor: "pointer",
      transition: "background 0.2s ease",
    },
    toggleSwitchActive: {
      background: "#3b82f6",
    },
    contentArea: {
      flex: 1,
      padding: "24px",
      overflowY: "auto",
      maxHeight: "calc(100vh - 60px)", // Limit height to viewport minus header
      overflowX: "hidden",
    },
    emptyState: {
      minHeight: "73vh",
      textAlign: "center",
      color: "#94a3b8",
      fontSize: "14px",
      padding: "60px 20px",
      background: "#f8fafc",
      borderRadius: "12px",
      border: "1px dashed #cbd5e1",
    },
    emptyIcon: {
      fontSize: "48px",
      marginBottom: "16px",
      marginTop: "20vh",
    },
    transcriptionItem: {
      marginBottom: "12px",
      padding: "12px",
      background: "#f8fafc",
      borderLeft: "3px solid #3b82f6",
      borderRadius: "6px",
    },
    timestamp: {
      fontSize: "10px",
      color: "#64748b",
      marginBottom: "6px",
      textTransform: "uppercase",
      letterSpacing: "0.5px",
    },
    transcriptionActions: {
      marginTop: "8px",
      display: "flex",
      gap: "6px",
    },
    actionButton: {
      fontSize: "10px",
      padding: "4px 8px",
      background: "#3b82f6",
      color: "#ffffff",
      border: "none",
      borderRadius: "4px",
      cursor: "pointer",
    },
    editButton: {
      background: "#f59e0b",
    },
    answerItem: {
      marginBottom: "24px",
      padding: "20px",
      background: "#f8fafc",
      borderLeft: "4px solid #10b981",
      borderRadius: "8px",
      scrollMarginTop: "80px", // 💡 Offset scroll to stay below fixed header
    },
    questionText: {
      fontWeight: "600",
      color: "#1e293b",
      marginBottom: "12px",
      fontSize: "14px",
    },
    answerText: {
      color: "#334155",
      lineHeight: "1.6",
      fontSize: "14px",
    },
    liveTranscription: {
      background: "#fef3c7",
      borderLeft: "4px solid #f59e0b",
      padding: "12px",
      marginBottom: "12px",
      borderRadius: "6px",
      fontStyle: "italic",
      color: "#92400e",
    },
    statusIndicator: {
      position: "fixed",
      top: "1.2vh",
      left: "50%",
      transform: "translateX(-50%)",
      padding: "12px 16px",
      borderRadius: "8px",
      background: "#10b981",
      color: "#ffffff",
      fontSize: "12px",
      fontWeight: "500",
      zIndex: 1000,
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
    },
    statusError: {
      background: "#ef4444",
    },
    statusWarning: {
      background: "#f59e0b",
    },
    modal: {
      position: "fixed",
      inset: 0,
      background: "rgba(0, 0, 0, 0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999,
    },
    modalContent: {
      background: "#ffffff",
      padding: "24px",
      borderRadius: "12px",
      width: "90%",
      maxWidth: "500px",
      boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
    },
    modalTitle: {
      marginBottom: "16px",
      fontSize: "16px",
      color: "#1e293b",
      fontWeight: "600",
    },
    textarea: {
      width: "100%",
      height: "120px",
      border: "1px solid #e2e8f0",
      borderRadius: "8px",
      padding: "12px",
      fontSize: "14px",
      fontFamily: "inherit",
      marginBottom: "20px",
      resize: "vertical",
    },
    modalButtons: {
      display: "flex",
      justifyContent: "flex-end",
      gap: "12px",
    },
    resumeModalContent: {
      background: "#ffffff",
      borderRadius: "12px",
      boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
      padding: "32px",
      width: "90%",
      maxWidth: "400px",
      textAlign: "center",
    },
    fileLabel: {
      display: "inline-block",
      background: "#f8fafc",
      border: "1px solid #e2e8f0",
      padding: "12px 20px",
      borderRadius: "8px",
      cursor: "pointer",
      fontSize: "13px",
      color: "#475569",
      transition: "all 0.2s ease",
      marginBottom: "20px",
    },
    fileInput: {
      display: "none",
    },
    fileNameDisplay: {
      marginTop: "8px",
      fontSize: "11px",
      color: "#64748b",
    },
    downloadButton: {
      background: "#10b981",
      color: "#ffffff",
      borderColor: "#10b981",
    },
    answerContainer: {
      fontSize: "16px",
      lineHeight: "1.6",
      color: "#1f2937",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      maxWidth: "100%",
      wordWrap: "break-word",
    },

    codeBlockWrapper: {
      margin: "16px 0",
      borderRadius: "12px",
      overflow: "hidden",
      border: "1px solid #e5e7eb",
      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
      backgroundColor: "#fff",
    },

    codeBlockHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "12px 16px",
      backgroundColor: "#f8fafc",
      borderBottom: "1px solid #e5e7eb",
      fontSize: "12px",
      fontWeight: "500",
    },

    codeLanguage: {
      color: "#6b7280",
      textTransform: "uppercase",
      letterSpacing: "0.5px",
      fontSize: "11px",
      fontWeight: "600",
    },

    copyButton: {
      background: "none",
      border: "none",
      cursor: "pointer",
      fontSize: "14px",
      padding: "4px 8px",
      borderRadius: "6px",
      transition: "background-color 0.2s",
      ":hover": {
        backgroundColor: "#e5e7eb",
      },
    },

    codeBlock: {
      margin: 0,
      padding: "16px",
      backgroundColor: "#1e293b",
      color: "#e2e8f0",
      fontSize: "14px",
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
      lineHeight: "1.5",
      overflow: "auto",
      maxHeight: "400px",
    },

    code: {
      fontFamily: "inherit",
      fontSize: "inherit",
      color: "inherit",
      background: "none",
    },

    codeLine: {
      display: "flex",
      alignItems: "flex-start",
      minHeight: "21px",
      paddingRight: "16px",
    },

    lineNumber: {
      display: "inline-block",
      width: "32px",
      textAlign: "right",
      marginRight: "16px",
      color: "#64748b",
      fontSize: "12px",
      flexShrink: 0,
      userSelect: "none",
    },

    comment: {
      color: "#10b981",
      fontStyle: "italic",
    },

    inlineCode: {
      backgroundColor: "#f1f5f9",
      color: "#e11d48",
      padding: "2px 6px",
      borderRadius: "4px",
      fontSize: "14px",
      fontFamily: "'JetBrains Mono', 'Consolas', monospace",
      border: "1px solid #e2e8f0",
      fontWeight: "500",
    },

    boldText: {
      fontWeight: "600",
      color: "#111827",
    },
  };
  // Update the additionalStyles object - replace the existing one
  const additionalStyles = {
    answerText: {
      color: "#334155",
      lineHeight: "1.6",
      fontSize: "14px",
      whiteSpace: "pre-wrap",
    },
    codeBlock: {
      background: "#0f172a" /* deep navy */,
      color: "#e2e8f0" /* light text */,
      padding: "12px",
      fontSize: "13px",
      fontFamily: "Monaco, 'Cascadia Code', 'Roboto Mono', monospace",
      borderRadius: "6px",
      overflowX: "auto",
      margin: "8px 0",
      border: "1px solid #334155",
      whiteSpace: "pre-wrap",
    },
    inlineCode: {
      background: "#f1f5f9",
      padding: "2px 4px",
      borderRadius: "3px",
      fontFamily: "Monaco, 'Cascadia Code', 'Roboto Mono', monospace",
      fontSize: "13px",
      color: "#e11d48",
    },
    strongText: {
      fontWeight: "600",
      color: "#1e293b",
    },
    betaBadge: {
      position: "absolute",
      top: "-12px",
      left: "0px",
      background: "#22c55e", // green
      color: "#ffffff",
      fontSize: "10px",
      fontWeight: "600",
      padding: "2px 8px",
      borderRadius: "9999px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    },

  };

  const dropdownRef = useRef(null);

  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobileOrTablet = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet|ios/i.test(userAgent);

    if (isMobileOrTablet) {
      navigate('/home', { replace: true });
    }
  }, [navigate]);


  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    if (selectedModel) {
      testBackendConnection();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedModel]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowModelMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const email = localStorage.getItem("userEmail");
    const name = localStorage.getItem("userName");
    const photo = localStorage.getItem("userPhoto");

    if (!email) {
      navigate("/", { replace: true });
    } else {
      setUserName(name || "Guest");
      setUserPhoto(photo || "https://via.placeholder.com/40");
    }
  }, [navigate]);

  // Utility functions
  const showStatus = useCallback((message, type = "info") => {
    setStatus({ message, type, visible: true });
    setTimeout(() => {
      setStatus((prev) => ({ ...prev, visible: false }));
    }, 3000);
  }, []);

  useEffect(() => {
    if (isAutoScrollEnabled && latestAnswerRef.current) {
      latestAnswerRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [answers, isAutoScrollEnabled]);

  useEffect(() => {
    const savedElapsed = parseInt(
      localStorage.getItem("elapsedTime") || "0",
      10
    );
    if (!isNaN(savedElapsed)) {
      setElapsedSeconds(savedElapsed);
      setTimer({
        minutes: Math.floor(savedElapsed / 60),
        seconds: savedElapsed % 60,
      });
    }

    const savedRemaining = parseInt(
      localStorage.getItem("remainingSeconds"),
      10
    );
    if (!isNaN(savedRemaining)) {
      setRemainingSeconds(savedRemaining);
      setIsRemainingReady(true);
    }

    // Check if timer was running before refresh
    const wasActive = localStorage.getItem("timerActive") === "true";
    const savedStartTime = parseInt(localStorage.getItem("startTimestamp"), 10);

    if (wasActive && !isNaN(savedStartTime)) {
      const currentTime = Date.now();
      const actualElapsed = Math.floor((currentTime - savedStartTime) / 1000);

      setElapsedSeconds(actualElapsed);
      setTimer({
        minutes: Math.floor(actualElapsed / 60),
        seconds: actualElapsed % 60,
      });
      localStorage.setItem("elapsedTime", actualElapsed.toString());
    }
  }, []);

  useEffect(() => {
    const savedAnswers = localStorage.getItem("answers");
    if (savedAnswers) {
      setAnswers(JSON.parse(savedAnswers));
    }

    const savedTranscriptions = localStorage.getItem("transcriptions");
    if (savedTranscriptions) {
      setTranscriptions(JSON.parse(savedTranscriptions));
    }
  }, []);

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    const savedAnswers = localStorage.getItem("answers");
    if (savedAnswers) {
      setAnswers(JSON.parse(savedAnswers));
    }

    const savedTranscriptions = localStorage.getItem("transcriptions");
    if (savedTranscriptions) {
      setTranscriptions(JSON.parse(savedTranscriptions));
    }
  }, []);

  useEffect(() => {
    if (videoRef.current && screenStream) {
      videoRef.current.srcObject = screenStream;

      videoRef.current.onloadedmetadata = () => {
        videoRef.current.play().catch((err) => { });
      };
    }
  }, [screenStream]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user || !interviewId) {
        navigate("/home", { replace: true });
        return;
      }

      // 🟩 Add this block after setting `setCurrentUser(user);`
      setCurrentUser(user);

      // 🟨 ⬇️ Add this here
      const creditQuery = query(
        collection(db, "userCredits"),
        where("email", "==", user.email)
      );
      const creditSnap = await getDocs(creditQuery);
      if (!creditSnap.empty) {
        const creditDoc = creditSnap.docs[0];
        const credits = creditDoc.data().credits || 0;
        // Delay this part until elapsedSeconds is properly set
        setTimeout(() => {
          const effectiveElapsed =
            parseInt(localStorage.getItem("elapsedTime"), 10) || 0;
          const remaining = Math.max(
            0,
            Math.floor(credits * 60 - effectiveElapsed)
          );
          setRemainingSeconds(remaining);
          setIsRemainingReady(true);

          if (remaining <= 600 && !lowCreditShownRef.current) {
            setShowLowCreditPopup(true);
            lowCreditShownRef.current = true;

            setTimeout(() => {
              setShowLowCreditPopup(false);
            }, 4000);
          }
        }, 100);
      }

      try {
        const q = query(
          collection(db, "currentInterviews"),
          where("interviewId", "==", interviewId),
          where("email", "==", user.email),
          where("status", "==", "ongoing")
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          navigate("/home", { replace: true });
          return;
        }

        const latestInterview = snapshot.docs[0].data();
        setUserInterviewData(latestInterview);

        setDisplayName(
          `${latestInterview.role} @ ${latestInterview.companyName}`
        );

        const resumeResponse = await fetch(`${backend_url}/api/read-resume`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: latestInterview.resumePathName }),
        });

        const data = await resumeResponse.json();
        const resumeText = data.content;

        const chatSeed = [
          {
            role: "user",
            content: "Resume content [About Candidate]:\n" + resumeText,
          },
          {
            role: "user",
            content: `The interview is for the role of "${latestInterview.role}" at "${latestInterview.companyName}".`,
          },
          {
            role: "user",
            content: `Job description: ${latestInterview.jobDescription}`,
          },
        ];

        setChatHistory((prev) => [...prev, ...chatSeed]);
        setResumeContext(latestInterview.resumePathName);
        showStatus("✅ Resume loaded from latest profile!");
        setCurrentUser(user);
        setLoading(false);
      } catch (error) {
        navigate("/home", { replace: true });
      }
    });

    return () => unsubscribe();
  }, [navigate, interviewId]);

  useEffect(() => {
    if (isActive && remainingSeconds !== null && remainingSeconds <= 600) {
      const countdownInterval = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            if (!hasEndedRef.current) {
              completeAndExitMeeting();
            }
            return 0;
          }
          const updated = prev - 1;
          localStorage.setItem("remainingSeconds", updated.toString());
          return updated;
        });
      }, 1000);
      return () => clearInterval(countdownInterval);
    }
  }, [isActive, remainingSeconds]);

  useEffect(() => {
    const email = localStorage.getItem("userEmail");
    if (!email || !elapsedSeconds || !currentUser) return;

    const fetchCredits = async () => {
      const q = query(
        collection(db, "userCredits"),
        where("email", "==", email)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const creditDoc = snap.docs[0];
        const credits = creditDoc.data().credits || 0;
        const remaining = Math.max(
          0,
          Math.floor(credits * 60 - elapsedSeconds)
        );
        setRemainingSeconds(remaining);
        setIsRemainingReady(true);

        if (remaining <= 600 && !lowCreditShownRef.current) {
          setShowLowCreditPopup(true);
          lowCreditShownRef.current = true;
          setTimeout(() => {
            setShowLowCreditPopup(false);
          }, 4000);
        }
      }
    };

    fetchCredits();
  }, [elapsedSeconds, currentUser]);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const isQuestion = (text) => {
    if (!text || typeof text !== "string") return false;

    const lowerText = text.toLowerCase().trim();

    // Remove common filler words and clean the text
    const cleanText = lowerText
      .replace(/\b(um|uh|like|you know|well)\b/g, "")
      .trim();

    const questionWords = [
      "what",
      "when",
      "where",
      "why",
      "who",
      "which",
      "how",
      "can you",
      "could you",
      "should",
      "would you",
      "will you",
      "do you",
      "did you",
      "have you",
      "are you",
      "is it",
      "tell me",
      "describe",
      "explain",
      "walk me through",
      "share",
      "discuss",
      "talk about",
      "give me",
    ];

    const hasQuestionMark = text.includes("?");
    const hasQuestionWord = questionWords.some((word) =>
      cleanText.includes(word)
    );
    const startsWithQuestion =
      /^(what|when|where|why|who|which|how|can|could|should|would|will|do|are|is|was|were|have|tell|describe|explain|walk|share|discuss|talk|give)/i.test(
        cleanText
      );

    // Additional pattern for interview questions
    const interviewPatterns = [
      /tell me about/i,
      /walk me through/i,
      /describe your/i,
      /what's your/i,
      /how would you/i,
      /give me an example/i,
    ];

    const hasInterviewPattern = interviewPatterns.some((pattern) =>
      pattern.test(cleanText)
    );

    return (
      hasQuestionMark ||
      hasQuestionWord ||
      startsWithQuestion ||
      hasInterviewPattern
    );
  };

  // Timer functions
  const startTimer = useCallback(() => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    const startTime = Date.now() - elapsedSeconds * 1000;
    localStorage.setItem("startTimestamp", startTime.toString());
    localStorage.setItem("timerActive", "true");

    timerIntervalRef.current = setInterval(() => {
      const currentTime = Date.now();
      const actualElapsed = Math.floor((currentTime - startTime) / 1000);

      setElapsedSeconds(actualElapsed);
      setTimer({
        minutes: Math.floor(actualElapsed / 60),
        seconds: actualElapsed % 60,
      });
      localStorage.setItem("elapsedTime", actualElapsed.toString());
    }, 1000);
  }, [elapsedSeconds]);

  const stopTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    localStorage.setItem("timerActive", "false");
    // Timer state is preserved, not reset
  }, []);

  // Question detection now runs entirely off the shared-screen audio pipeline
  // (Deepgram, via startDeepgramSocket/startTabAudioStreaming below) — the
  // microphone is never captured, so there is no Web Speech API mic pipeline here.

  const getDotColor = (status) => {
    if (status === "ready") return "#22c55e"; // green
    if (status === "error") return "#ef4444"; // red
    if (status === "checking") return "#facc15"; // yellow
    return "#cbd5e1"; // default gray
  };

  const completeAndExitMeeting = async () => {
    try {
      if (hasEndedRef.current) return; // 🛡 Prevent duplicates
      hasEndedRef.current = true;

      if (currentUser && userInterviewData) {
        const q = query(
          collection(db, "currentInterviews"),
          where("email", "==", currentUser.email),
          where("status", "==", "ongoing")
        );
        const snapshot = await getDocs(q);

        const endTime = new Date().toISOString();
        const durationString = formatDuration(elapsedSeconds);

        const updatePromises = snapshot.docs.map((docSnap) =>
          updateDoc(docSnap.ref, {
            status: "completed",
            totalInterviewTime: durationString,
            interviewEndTime: endTime,
          })
        );

        await Promise.all(updatePromises);

        // ⚙️ Credit logic
        const usedCredits = elapsedSeconds / 60;
        const userCreditsQuery = query(
          collection(db, "userCredits"),
          where("email", "==", currentUser.email)
        );
        const creditSnapshot = await getDocs(userCreditsQuery);

        if (!creditSnapshot.empty) {
          const creditDoc = creditSnapshot.docs[0];
          const currentCredits = creditDoc.data().credits || 0;
          const remainingCredits = Math.max(0, currentCredits - usedCredits);

          await updateDoc(creditDoc.ref, {
            credits: parseFloat(remainingCredits.toFixed(2)), // limit to 2 decimals
            lastUpdated: new Date().toISOString(),
          });
        }

        localStorage.removeItem("elapsedTime");
        showStatus("✅ Interview marked as completed");
        stopCapture();
        stopScreenShare();
        localStorage.removeItem("elapsedTime");
        localStorage.removeItem("remainingSeconds");

        localStorage.removeItem("answers");
        localStorage.removeItem("transcriptions");

        // 📤 Send responses to backend to generate PDF
        try {
          const payload = {
            responses: answers.map((a) => ({
              question: a.question,
              candidateResponse: a.answer,
              timestamp: a.timestamp,
            })),
            customFileName: "Responses",
            interviewId: userInterviewData?.interviewId,
            companyName: userInterviewData?.companyName,
            role: userInterviewData?.role,
            candidateName: userName,
            candidateEmail: currentUser?.email,
          };

          const res = await fetch(`${backend_url}/api/generate-response-pdf`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });

          const data = await res.json();
        } catch (pdfErr) { }

        navigate("/home", { replace: true });
      } else {
        showStatus("⚠️ No interview found to update", "warning");
        navigate("/home", { replace: true });
      }
    } catch (error) {
      showStatus("❌ Failed to complete interview", "error");
    }
  };

  const saveAnswersToServer = async (interviewId, answers) => {
    try {
      await fetch(`${backend_url}/api/save-answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interviewId, answers }),
      });
    } catch (error) {
      console.error("❌ Failed to save answers:", error);
    }
  };

  // 2. Enhanced generateAnswer function with formatted response
  const generateAnswer = async (question) => {
    if (!question || !question.trim()) {
      return;
    }

    const cleanQuestion = question.trim();
    showStatus("🤖 Generating answer...");

    try {
      const updatedChat = [
        ...chatHistory,
        { role: "user", content: cleanQuestion },
      ];

      const requestBody = {
        question: cleanQuestion,
        chat: updatedChat,
        resume: resumeContext || userInterviewData?.resumePathName || "",
        model: selectedModel,
      };

      const response = await fetch(serverUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        // Every API key is out of free quota for the day — say so plainly
        // rather than surfacing a generic backend failure.
        if (response.status === 429) {
          const info = await response.json().catch(() => ({}));
          showStatus(
            info.error || "⚠️ Daily AI request limit reached. Try again later.",
            "warning"
          );
          return;
        }
        throw new Error(`Backend responded with status: ${response.status}`);
      }

      const data = await response.json();
      const answer =
        data.answer ??
        data.response ??
        data.message ??
        "No response received from backend.";

      const actualModel = data.actualModelUsed || selectedModel;

      if (actualModel !== selectedModel) {
        showStatus(
          `⚠️ "${selectedModel}" is unavailable. Switched to "${actualModel}"`,
          "warning"
        );
      }

      const newAnswer = {
        id: Date.now(),
        question: cleanQuestion,
        answer,
        model: actualModel,
        timestamp: new Date().toISOString(),
      };

      if (interviewId && answers.length > 0) {
        await saveAnswersToServer(interviewId, [...answers, newAnswer]);
      }

      setAnswers((prev) => {
        const updated = [newAnswer, ...prev];
        localStorage.setItem("answers", JSON.stringify(updated));
        return updated;
      });

      setChatHistory((prev) => [
        ...prev,
        { role: "user", content: cleanQuestion },
        { role: "assistant", content: answer },
      ]);

      showStatus("✅ Answer generated successfully");

      if (isAutoScrollEnabled && answerDisplayRef.current) {
        setTimeout(() => {
          answerDisplayRef.current.scrollTop =
            answerDisplayRef.current.scrollHeight;
        }, 100);
      }
    } catch (error) {
      console.error("❌ Answer generation failed:", error);
      showStatus("❌ Failed to generate answer - check backend", "error");
    }
  };

  // The websocket handlers below are created once when capture starts, so calling
  // generateAnswer directly would keep using that render's chat history and
  // answers for the whole interview. Go through a ref to always hit the latest.
  const generateAnswerRef = useRef(generateAnswer);
  useEffect(() => {
    generateAnswerRef.current = generateAnswer;
  });

  // ✅ Fix: Parse Deepgram transcripts and update UI
  const startDeepgramSocket = useCallback(
    (stream) => {
      if (!isActiveRef.current) {
        console.log(
          "🛑 Not capturing audio yet (via ref), skipping tab audio stream start."
        );
        return;
      }

      // Close existing connection if any
      if (deepgramSocketRef.current) {
        deepgramSocketRef.current.close();
      }

      const socket = new WebSocket(ws_url);

      socket.onopen = () => {
        if (!isActiveRef.current) {
          console.warn(
            "⚠️ Socket opened before audio capture started. Will not stream audio yet."
          );
          return; // just skip starting stream
        }

        console.log("🧠 Deepgram socket connected");
        deepgramSocketRef.current = socket;
        showStatus("🎧 Transcribing shared screen audio", "success");
        startTabAudioStreaming(stream); // ✅ stream tab audio
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case "connection_status":
              console.log("📡 Connection status:", data.message);
              if (data.status === "connected") {
                showStatus("✅ Connected to speech service", "success");
              }
              break;

            // Words as they are being spoken — display only, never sent to the LLM.
            case "interim":
              if (typeof data.transcript === "string") {
                setLiveTranscription(data.transcript);
              }
              break;

            case "transcript": {
              const { transcript, confidence } = data;
              if (!transcript || !transcript.trim()) break;

              const fullText = transcript.trim();
              const isQ = isQuestion(fullText);

              // Deepgram omits confidence on some final results; treat those
              // as trustworthy rather than silently dropping the question.
              const score = typeof confidence === "number" ? confidence : 1;
              const willAnswer = isQ && score > 0.7;

              // The utterance is complete, so the live line is replaced by it.
              setLiveTranscription("");

              const newTranscription = {
                id: Date.now(),
                text: fullText,
                timestamp: new Date().toLocaleTimeString(),
                isQuestion: isQ,
                wasAsked: willAnswer,
                confidence: score,
              };

              setTranscriptions((prev) => {
                const updated = [newTranscription, ...prev];
                localStorage.setItem("transcriptions", JSON.stringify(updated));
                return updated;
              });

              if (willAnswer) {
                generateAnswerRef.current(fullText);
              }
              break;
            }

            case "utterance_end":
              console.log("🔚 Utterance ended");
              break;

            case "error":
              console.error("❌ Server error:", data.error);
              showStatus(`❌ Error: ${data.error}`, "error");
              break;

            default:
              console.log("📥 Unknown message type:", data);
          }
        } catch (err) {
          console.error("❌ Failed to parse message:", event.data, err);
        }
      };

      socket.onerror = (err) => {
        console.error("❌ Socket error:", err);
        showStatus("❌ Connection failed", "error");
      };

      socket.onclose = (event) => {
        console.log(
          `🔌 Deepgram socket closed (${event.code}): ${event.reason}`
        );
        showStatus("🔌 Connection closed", "warning");

        // Cleanup audio resources
        if (processorRef.current) {
          processorRef.current.disconnect();
          processorRef.current = null;
        }
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }

        deepgramSocketRef.current = null;
      };
    },
    [generateAnswer, showStatus]
  );

  const audioContextRef = useRef(null);
  const processorRef = useRef(null);
  const silenceCheckRef = useRef(null);

  // Cleanup function (call this when component unmounts or stops recording)
  const stopAudioStreaming = useCallback(() => {
    if (silenceCheckRef.current) {
      clearTimeout(silenceCheckRef.current);
      silenceCheckRef.current = null;
    }

    if (processorRef.current) {
      processorRef.current.onaudioprocess = null;
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (deepgramSocketRef.current) {
      deepgramSocketRef.current.close();
      deepgramSocketRef.current = null;
    }

    console.log("🛑 Audio streaming stopped");
  }, []);

  // 4. Updated transcription actions - replace the existing renderTranscriptionActions function
  const renderTranscriptionActions = (transcription) => {
    if (transcription.isQuestion) {
      if (transcription.wasAsked) {
        // Question was already asked - only show edit button
        return (
          <div style={styles.transcriptionActions}>
            <button
              onClick={() =>
                setEditModal({
                  show: true,
                  text: transcription.text,
                  originalText: transcription.text,
                })
              }
              style={{ ...styles.actionButton, ...styles.editButton }}
            >
              <Edit3 size={10} />
              Edit
            </button>
          </div>
        );
      } else {
        // Question not asked yet - show both Ask AI and Edit buttons
        return (
          <div style={styles.transcriptionActions}>
            {!transcription.wasAsked && !transcription.isQuestion && (
              <button
                onClick={() => {
                  // Mark as asked and generate answer
                  setTranscriptions((prev) =>
                    prev.map((t) =>
                      t.id === transcription.id ? { ...t, wasAsked: true } : t
                    )
                  );
                  generateAnswer(transcription.text);
                }}
                style={styles.actionButton}
              >
                Ask AI
              </button>
            )}
            {/* Edit button always available */}
            <button
              onClick={() =>
                setEditModal({
                  show: true,
                  text: transcription.text,
                  originalText: transcription.text,
                })
              }
              style={{ ...styles.actionButton, ...styles.editButton }}
            >
              <Edit3 size={10} />
              Edit
            </button>
          </div>
        );
      }
    } else {
      // Not a question - show Ask AI and Edit buttons
      return (
        <div style={styles.transcriptionActions}>
          <button
            onClick={() => {
              generateAnswer(transcription.text);
            }}
            style={styles.actionButton}
          >
            Ask AI
          </button>
          <button
            onClick={() =>
              setEditModal({
                show: true,
                text: transcription.text,
                originalText: transcription.text,
              })
            }
            style={{ ...styles.actionButton, ...styles.editButton }}
          >
            <Edit3 size={10} />
            Edit
          </button>
        </div>
      );
    }
  };

  const startCapture = async () => {
    try {
      if (!screenStreamRef.current) {
        showStatus("❌ Share your screen first, then start audio capture", "error");
        return;
      }

      // We only ever transcribe the shared screen/tab audio — never the mic —
      // so make sure the user actually opted in to sharing audio.
      const audioTracks = screenStreamRef.current.getAudioTracks();
      if (audioTracks.length === 0) {
        showStatus(
          '❌ No audio detected in the shared screen. Stop sharing, then share again and enable "Share audio"',
          "error"
        );
        return;
      }

      // ✅ Immediately set state and ref
      setIsActive(true);
      isActiveRef.current = true;

      startTimestampRef.current = Date.now() - elapsedSeconds * 1000;
      lowCreditShownRef.current = false;

      tickIntervalRef.current = setInterval(async () => {
        const elapsed = Math.floor(
          (Date.now() - startTimestampRef.current) / 1000
        );
        setElapsedSeconds(elapsed);
        setTimer({
          minutes: Math.floor(elapsed / 60),
          seconds: elapsed % 60,
        });

        const email = localStorage.getItem("userEmail");
        if (email && currentUser && userInterviewData) {
          const q = query(
            collection(db, "userCredits"),
            where("email", "==", email)
          );
          const snap = await getDocs(q);
          if (!snap.empty) {
            const creditDoc = snap.docs[0];
            const credits = creditDoc.data().credits || 0;
            const remaining = Math.max(0, Math.floor(credits * 60 - elapsed));
            setRemainingSeconds(remaining);

            if (remaining <= 600 && !lowCreditShownRef.current) {
              lowCreditShownRef.current = true;
            }
          }
        }
      }, 1000);

      startDeepgramSocket(screenStreamRef.current);

      showStatus("⚡ Audio capture started - listening to shared screen audio!");
    } catch (error) {
      setIsActive(false);
      isActiveRef.current = false;
      showStatus(`❌ Failed to start: ${error.message}`, "error");
    }
  };

  const stopCapture = () => {
    setIsActive(false);
    isActiveRef.current = false;
    setIsListening(false);

    localStorage.setItem("elapsedTime", elapsedSeconds.toString());
    localStorage.setItem(
      "remainingSeconds",
      remainingSeconds?.toString() || "0"
    );

    // ✅ Stop timers
    if (tickIntervalRef.current) {
      clearInterval(tickIntervalRef.current);
      tickIntervalRef.current = null;
    }

    // ✅ Stop internal timer
    stopTimer();

    // ✅ Stop Deepgram socket and audio stream if still running
    stopAudioStreaming();

    setLiveTranscription("");
    showStatus("⏹️ Audio capture stopped");
  };

  const startTabAudioStreaming = async (stream) => {
    const socket = deepgramSocketRef.current;

    if (!stream || !socket || socket.readyState !== WebSocket.OPEN) {
      console.warn(
        "🚫 Cannot stream tab audio: Missing stream or socket not open"
      );
      return;
    }

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      showStatus(
        '❌ The shared screen has no audio track. Re-share with "Share audio" enabled',
        "error"
      );
      return;
    }

    try {
      // Create audio context with the target sample rate
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: SAMPLE_RATE,
      });

      // This runs from the socket's open callback, outside the click handler, so
      // Chrome may hand back a suspended context — in which case onaudioprocess
      // never fires and we would silently stream nothing.
      if (audioCtx.state === "suspended") {
        await audioCtx.resume();
      }

      // Feed the processor the screen share's audio only (no video track).
      const source = audioCtx.createMediaStreamSource(
        new MediaStream(audioTracks)
      );

      // Create a script processor (deprecated but widely supported)
      // For modern browsers, consider using AudioWorklet
      const processor = audioCtx.createScriptProcessor(BUFFER_SIZE, 1, 1);

      // A ScriptProcessorNode only runs while it's connected to the destination,
      // but the user already hears the call through their own speakers — routing
      // it through a silent gain node keeps the callback alive without echoing.
      const silentGain = audioCtx.createGain();
      silentGain.gain.value = 0;

      // Store references for cleanup
      audioContextRef.current = audioCtx;
      processorRef.current = processor;

      source.connect(processor);
      processor.connect(silentGain);
      silentGain.connect(audioCtx.destination);

      let heardAudio = false;

      processor.onaudioprocess = (e) => {
        if (socket.readyState !== WebSocket.OPEN) {
          console.warn("⚠️ Socket not open, skipping audio data");
          return;
        }

        const inputData = e.inputBuffer.getChannelData(0);

        // Convert Float32 to Int16 PCM
        const pcmData = new Int16Array(inputData.length);
        let peak = 0;
        for (let i = 0; i < inputData.length; i++) {
          // Clamp the float32 value to [-1, 1] and convert to 16-bit PCM
          const sample = Math.max(-1, Math.min(1, inputData[i]));
          const magnitude = sample < 0 ? -sample : sample;
          if (magnitude > peak) peak = magnitude;
          pcmData[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        }

        if (peak > 0.002) heardAudio = true;

        // Send the raw ArrayBuffer
        try {
          socket.send(pcmData.buffer);
        } catch (err) {
          console.error("❌ Error sending audio data:", err);
        }
      };

      // Sharing a screen/tab without ticking "Share audio" yields a track that is
      // permanently silent, so tell the user instead of appearing to work.
      if (silenceCheckRef.current) clearTimeout(silenceCheckRef.current);
      silenceCheckRef.current = setTimeout(() => {
        if (!heardAudio && isActiveRef.current) {
          showStatus(
            '⚠️ No sound coming from the shared screen — re-share and enable "Share audio"',
            "warning"
          );
        }
      }, 10000);

      console.log("🎧 Shared-screen audio streaming started successfully");
    } catch (err) {
      console.error("❌ Error setting up audio streaming:", err);
      showStatus("❌ Audio setup failed", "error");
    }
  };

  // Screen sharing functions
  const startScreenShare = async () => {
    try {
      showStatus("🖥️ Starting screen share...");
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        // These must stay off for screen/tab audio. They are microphone-oriented
        // processors: echo cancellation measures what the speakers are playing and
        // subtracts it, which is precisely the audio we are capturing here, so
        // leaving it on cancels the interviewer's voice down to near silence.
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
        systemAudio: "include",
      });

      screenStreamRef.current = stream; // ✅ Add this line
      setScreenStream(stream); // For UI rendering (video)

      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        showStatus(
          '⚠️ Shared without audio. Stop sharing, share again and tick "Share audio"',
          "warning"
        );
      } else {
        showStatus("✅ Screen sharing started with audio");
        audioTracks[0].addEventListener("ended", () => {
          stopScreenShare();
        });
      }

      stream.getVideoTracks()[0].addEventListener("ended", () => {
        stopScreenShare();
      });
    } catch (error) {
      showStatus("❌ Screen share failed: " + error.message, "error");
    }
  };

  const stopScreenShare = () => {
    const stream = screenStreamRef.current || screenStream;

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    screenStreamRef.current = null;
    setScreenStream(null);

    // The shared audio is the only transcription source, so capture cannot
    // continue once sharing ends.
    if (isActiveRef.current) {
      stopCapture();
    } else {
      stopAudioStreaming(); // will terminate Deepgram connection
    }

    showStatus("⏹️ Screen sharing stopped");
  };

  // Test backend connection
  const testBackendConnection = async () => {
    setBackendStatus("checking"); // show yellow dot and "Checking..."

    try {
      const testQuestion = "What is 2 + 2?";
      const requestBody = {
        question: testQuestion,
        chat: [],
        resume: "",
        model: selectedModel,
      };

      const response = await fetch(serverUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) {
        throw new Error("Model response failed");
      }

      const data = await response.json();
      const answer = data.answer || "";

      if (answer.toLowerCase().includes("4")) {
        setBackendStatus("ready");
      } else {
        setBackendStatus("error");
      }
    } catch (error) {
      console.error("❌ Model health check failed:", error);
      setBackendStatus("error");
    }
  };

  const downloadResponsesAsPDF = async () => {
    setIsDownloading(true); // 🔁 Start loading
    try {
      const response = await fetch(`${backend_url}/api/preview-response-pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          responses: answers.map((a) => ({
            question: a.question,
            candidateResponse: a.answer,
            timestamp: a.timestamp,
          })),
          interviewId: userInterviewData?.interviewId,
          companyName: userInterviewData?.companyName,
          role: userInterviewData?.role,
          candidateName: userName,
        }),
      });

      if (!response.ok) throw new Error("Failed to generate PDF preview");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${userInterviewData?.interviewId}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      showStatus("❌ Failed to download preview PDF", "error");
    } finally {
      setIsDownloading(false); // ✅ Done loading
    }
  };

  const formatTime = (minutes, seconds) => {
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
      2,
      "0"
    )}`;
  };

  const formatIST = (timestamp) => {
    if (!timestamp) return "Invalid timestamp";

    const date = new Date(timestamp);

    // Convert to IST by adding 5.5 hours
    const utcOffset = date.getTime() + 5.5 * 60 * 60 * 1000;
    const istDate = new Date(utcOffset);

    const day = String(istDate.getDate()).padStart(2, "0");
    const month = String(istDate.getMonth() + 1).padStart(2, "0"); // Months are 0-indexed
    const year = istDate.getFullYear();

    let hours = istDate.getHours();
    const minutes = String(istDate.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";

    hours = hours % 12 || 12; // Convert 24h to 12h format
    const formattedTime = `${hours}:${minutes} ${ampm}`;

    return `${day}/${month}/${year} - ${formattedTime}`;
  };

  const modelDisplayNames = {
    "Nemotron 3 Super": "Nemotron 3 Super (Fastest)",
    "Nemotron 3 Ultra": "Nemotron 3 Ultra",
    "Ling 3.0 Flash": "Ling 3.0 Flash",
    "Qwen3.8 27B": "Qwen3.8 27B",
  };


  if (loading) {
    return null; // Or return a spinner/loading screen
  }

  return (
    <div style={styles.container}>
      {/* Status Indicator */}
      {status.visible && (
        <div
          style={{
            ...styles.statusIndicator,
            ...(status.type === "error" ? styles.statusError : {}),
            ...(status.type === "warning" ? styles.statusWarning : {}),
          }}
        >
          {status.message}
        </div>
      )}

      {/* Edit Modal */}
      {editModal.show && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>Edit Question</h3>
            <textarea
              value={editModal.text}
              onChange={(e) =>
                setEditModal((prev) => ({ ...prev, text: e.target.value }))
              }
              style={styles.textarea}
              placeholder="Edit your question..."
            />
            <div style={styles.modalButtons}>
              <button
                onClick={() =>
                  setEditModal({ show: false, text: "", originalText: "" })
                }
                style={styles.button}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (editModal.text.trim()) {
                    generateAnswer(editModal.text.trim());
                    setEditModal({ show: false, text: "", originalText: "" });
                  }
                }}
                style={{ ...styles.button, ...styles.primaryButton }}
              >
                Save & Ask AI
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.title}>{displayName}</h1>
          <div style={styles.statusBadge}>
            <div style={styles.statusDot}></div>
            <span>{formatTime(timer.minutes, timer.seconds)}</span>
          </div>
          {isRemainingReady &&
            typeof remainingSeconds === "number" &&
            remainingSeconds <= 600 && (
              <div
                style={{
                  marginLeft: "12px",
                  background: "#fef3c7",
                  color: "#dc2626",
                  padding: "4px 10px",
                  borderRadius: "20px",
                  fontWeight: "600",
                  fontSize: "12px",
                }}
              >
                ⏳ {Math.floor(remainingSeconds / 60)}:
                {String(remainingSeconds % 60).padStart(2, "0")}
              </div>
            )}
        </div>
        <div style={styles.controls}>
          {!isActive ? (
            <button
              onClick={startCapture}
              disabled={!screenStream}
              style={{
                ...styles.button,
                ...styles.primaryButton,
                opacity: screenStream ? 1 : 0.6,
                cursor: screenStream ? "pointer" : "not-allowed",
              }}
            >
              <span>🚀</span>
              Start Audio Capture
            </button>
          ) : (
            <button
              onClick={stopCapture}
              style={{ ...styles.button, ...styles.dangerButton }}
            >
              <span>🛑</span>
              Stop Capture
            </button>
          )}

          {!screenStream ? (
            <button onClick={startScreenShare} style={styles.button}>
              <span>🖥️</span>
              Share Screen
            </button>
          ) : (
            <button
              onClick={stopScreenShare}
              style={{ ...styles.button, ...styles.dangerButton }}
            >
              <span>⏹️</span>
              Stop Screen Share
            </button>
          )}

          <button
            onClick={() => {
              // Stop all active processes before navigating
              if (isActive) stopCapture();
              if (screenStream) stopScreenShare();

              // Navigate to home.js (adjust path as needed)
              setShowEndMeetingModal(true);
              // OR if using React Router: navigate('/home');
            }}
            style={{ ...styles.button, ...styles.dangerButton }}
          >
            <span>🏠</span>
            End Meeting
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div style={styles.mainContainer}>
        {/* Sidebar */}
        <div style={styles.sidebar}>
          {/* Screen Section */}
          <div style={styles.screenSection}>
            <div style={styles.sectionTitle}>📺 SHARED SCREEN</div>
            <div style={styles.screenContainer}>
              {screenStream ? (
                <video
                  ref={videoRef}
                  style={styles.screenVideo}
                  muted
                  autoPlay
                  playsInline
                />
              ) : (
                <div style={styles.screenPlaceholder}>
                  <Monitor style={styles.screenIcon} />
                  <div>Click "Share Screen" to display screen content here</div>
                </div>
              )}
            </div>
          </div>

          {/* Transcript Section */}
          <div style={styles.transcriptSection}>
            <div style={styles.sectionTitle}>❓ QUESTIONS DETECTED</div>
            <div
              ref={transcriptionDisplayRef}
              style={styles.transcriptionDisplay}
            >
              {liveTranscription && (
                <div style={styles.liveTranscription}>
                  🎤 {liveTranscription}
                </div>
              )}

              {transcriptions.length === 0 && !liveTranscription && (
                <div
                  style={{
                    textAlign: "center",
                    color: "#94a3b8",
                    padding: "40px 20px",
                  }}
                >
                  <MessageSquare size={32} style={{ marginBottom: "12px" }} />
                  <div>No questions detected yet</div>
                  <div style={{ fontSize: "11px", marginTop: "8px" }}>
                    Start audio capture to begin detecting questions
                  </div>
                </div>
              )}

              {transcriptions.map((transcription) => (
                <div key={transcription.id} style={styles.transcriptionItem}>
                  <div style={styles.timestamp}>
                    {transcription.timestamp} •{" "}
                    {transcription.isQuestion ? "QUESTION" : "STATEMENT"}
                    {transcription.wasAsked && " • ANSWERED"}
                  </div>
                  <div>{transcription.text}</div>
                  {renderTranscriptionActions(transcription)}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div style={styles.mainContent}>
          <div style={styles.mainHeader}>
            <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
              <div style={styles.mainTitle}>
                <div className="logo-icon">
                  <img src={logo} alt="Logo" style={{ width: 40, height: 40 }} />
                </div>
                &nbsp;
                <span style={{ position: "relative", display: "inline-block" }}>
                  Voizon
                  <span
                    style={{
                      position: "absolute",
                      top: "-8px",
                      right: "-18px",
                      background: "#f59e0b",
                      color: "#ffffff",
                      fontSize: "10px",
                      fontWeight: "bold",
                      padding: "2px 5px",
                      borderRadius: "9999px",
                      lineHeight: 1,
                      boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                    }}
                  >
                    BETA
                  </span>
                </span>
                &nbsp;• Powered by&nbsp;

                <div
                  ref={dropdownRef}
                  style={{ position: "relative", display: "inline-block" }}
                >
                  <div
                    onClick={() => setShowModelMenu(!showModelMenu)}
                    style={{
                      cursor: "pointer",
                      borderRadius: "6px",
                      fontWeight: "600",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      color: "#1d4ed8",
                    }}
                  >
                    {selectedModel}
                    <span
                      style={{
                        fontSize: "11px",
                        color: "#1d4ed8",
                        marginTop: "3px",
                      }}
                    >
                      ▼
                    </span>
                  </div>

                  {showModelMenu && (
                    <div
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        backgroundColor: "#ffffff",
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                        borderRadius: "8px",
                        zIndex: 999,
                        width: "200px",
                        marginTop: "4px",
                      }}
                    >
                      {Object.keys(modelDisplayNames).map((model) => (
                        <div
                          key={model}
                          onClick={() => {
                            setSelectedModel(model);
                            setShowModelMenu(false);
                          }}
                          style={{
                            padding: "10px 16px",
                            cursor: "pointer",
                            fontSize: "13px",
                            color: selectedModel === model ? "#1d4ed8" : "#334155",
                            backgroundColor:
                              selectedModel === model ? "#f0f9ff" : "transparent",
                            fontWeight: selectedModel === model ? "600" : "500",
                          }}
                          onMouseEnter={(e) =>
                            (e.target.style.backgroundColor = "#f8fafc")
                          }
                          onMouseLeave={(e) =>
                          (e.target.style.backgroundColor =
                            selectedModel === model ? "#f0f9ff" : "transparent")
                          }
                        >
                          {modelDisplayNames[model]}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <span style={styles.copilotStatus}>
                  <div
                    style={{
                      ...styles.statusDot,
                      backgroundColor: getDotColor(backendStatus),
                    }}
                  ></div>
                  <span
                    style={{
                      color:
                        backendStatus === "ready"
                          ? "#059669"
                          : backendStatus === "checking"
                            ? "#f59e0b"
                            : "#ef4444",
                      fontWeight: 500,
                    }}
                  >
                    {backendStatus === "ready"
                      ? "Ready"
                      : backendStatus === "checking"
                        ? "Checking..."
                        : "Not Ready"}
                  </span>
                </span>
              </div>

            </div>
            <div style={styles.autoScrollToggle}>
              Auto Scroll
              <div
                style={{
                  ...styles.toggleSwitch,
                  ...(isAutoScrollEnabled ? styles.toggleSwitchActive : {}),
                }}
                onClick={() => setIsAutoScrollEnabled(!isAutoScrollEnabled)}
              >
                <div
                  style={{
                    position: "absolute",
                    top: "2px",
                    left: isAutoScrollEnabled ? "22px" : "2px",
                    width: "16px",
                    height: "16px",
                    background: "#ffffff",
                    borderRadius: "50%",
                    transition: "left 0.2s ease",
                  }}
                ></div>
              </div>
              <button
                onClick={downloadResponsesAsPDF}
                style={{
                  ...styles.button,
                  ...styles.downloadButton,
                  opacity: isDownloading ? 0.6 : 1,
                  cursor: isDownloading ? "not-allowed" : "pointer",
                }}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <span>⏳ Downloading...</span> // You can use a spinner icon here too
                ) : (
                  <>
                    <Download size={16} />
                    Download PDF
                  </>
                )}
              </button>
            </div>
          </div>

          <div style={styles.contentArea}>
            {answers.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>🤖</div>
                <div
                  style={{
                    fontSize: "16px",
                    fontWeight: "500",
                    marginBottom: "8px",
                    color: "#64748b",
                  }}
                >
                  The Interview Ally is ready and waiting for the interviewer's
                  questions.
                </div>
                <div>
                  Start audio capture to begin detecting and answering questions
                  automatically.
                </div>
              </div>
            ) : (
              <div ref={answerDisplayRef}>
                {answers.map((answer, index) => (
                  <div
                    key={answer.id}
                    ref={index === 0 ? latestAnswerRef : null}
                    style={styles.answerItem}
                  >
                    <div style={styles.questionText}>
                      <span
                        style={{
                          marginBottom: "4px",
                          fontWeight: "bold",
                          color: "#1e3a8a",
                          fontSize: "14px",
                        }}
                      >
                        Q:{" "}
                      </span>
                      {answer.question}
                    </div>
                    <div
                      style={{
                        ...styles.answerText,
                        ...additionalStyles.answerText,
                      }}
                    >
                      <span
                        style={{
                          marginTop: "4px",
                          marginBottom: "4px",
                          fontWeight: "bold",
                          color: "#065f46",
                          fontSize: "14px",
                        }}
                      >
                        Answer:
                      </span>
                      <MarkdownRenderer
                        answer={answer}
                        className="custom-class"
                      />
                    </div>

                    <div style={{ ...styles.timestamp, marginTop: "12px" }}>
                      Generated at {formatIST(answer.timestamp)}
                      {answer.model && (
                        <span
                          style={{
                            marginLeft: "8px",
                            fontStyle: "normal",
                            color: "#475569",
                          }}
                        >
                          • Model: <strong>{answer.model}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {showEndMeetingModal && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>End Meeting?</h3>
            <p style={{ marginBottom: "16px", color: "#475569" }}>
              Are you sure you want to end the interview? This action will mark
              the session as completed.
            </p>
            <div style={styles.modalButtons}>
              <button
                onClick={() => setShowEndMeetingModal(false)}
                style={styles.button}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (isEnding) return; // 🛡 Prevent double click
                  setIsEnding(true);
                  await completeAndExitMeeting();
                  setIsEnding(false);
                }}
                disabled={isEnding}
                style={{
                  ...styles.button,
                  ...styles.dangerButton,
                  opacity: isEnding ? 0.6 : 1,
                  cursor: isEnding ? "not-allowed" : "pointer",
                }}
              >
                {isEnding ? "Ending..." : "End & Exit"}
              </button>
            </div>
          </div>
        </div>
      )}
      {showLowCreditPopup && (
        <div
          style={{
            position: "fixed",
            top: "2vh",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#fef3c7",
            color: "#92400e",
            padding: "12px 20px",
            borderRadius: "10px",
            fontWeight: "600",
            fontSize: "14px",
            zIndex: 1001,
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          }}
        >
          ⚠️ Last few mins. Low Credit!
        </div>
      )}

      {showInstructionModal && (
        <div style={styles.modal}>
          <div
            style={{
              ...styles.modalContent,
              maxWidth: "700px",
              maxHeight: "80vh",
              overflowY: "auto",
            }}
          >
            <h2
              style={{
                fontSize: "18px",
                marginBottom: "16px",
                color: "#1e293b",
              }}
            >
              📘 Interview Assistant Guide
            </h2>
            <ul
              style={{
                fontSize: "14px",
                lineHeight: "1.6",
                color: "#334155",
                marginBottom: "20px",
                paddingLeft: "20px",
              }}
            >
              <li>
                Click <strong>"Share Screen"</strong> to select the tab where
                your interview is happening (Google Meet, Microsoft Teams, etc).
              </li>
              <li>
                After screen sharing starts, click{" "}
                <strong>"Start Audio Capture"</strong> to begin the live
                transcription.
              </li>
              <li>
                Detected questions will appear in the left panel. AI-generated
                answers will be shown on the right automatically.
              </li>
              <li>
                Keep track of the <strong>timer and credits</strong> to avoid
                running out mid-interview.
              </li>
              <li>
                Once the interview ends, click the{" "}
                <strong>"End Meeting"</strong> button to save the session and
                generate your report.
              </li>
            </ul>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "16px",
                paddingTop: "16px",
                borderTop: "1px solid #e2e8f0",
              }}
            >
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  style={{
                    flexShrink: 0,
                    width: "16px",
                    height: "16px",
                    cursor: "pointer",
                  }}
                />
                <span style={{ fontSize: "14px", color: "#475569" }}>
                  I accept the{" "}
                  <a
                    href="/legal/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#2563eb", textDecoration: "underline" }}
                  >
                    Terms & Conditions
                  </a>
                  .
                </span>
              </label>
              <button
                disabled={!termsAccepted}
                onClick={() => setShowInstructionModal(false)}
                style={{
                  ...styles.button,
                  ...styles.primaryButton,
                  flexShrink: 0,
                  opacity: termsAccepted ? 1 : 0.5,
                  cursor: termsAccepted ? "pointer" : "not-allowed",
                }}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterviewCracker;

// Working Pakkka Till
