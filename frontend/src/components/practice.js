import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
import logo from "../images/logo_bg.png";
import "../styles/practice.css";
import { useNavigate, useLocation } from "react-router-dom";
import { auth, db } from "../firebase/config";
import MarkdownRenderer from "./MarkdownRernder.js";
import profile_pic from "../images/user_placeholder.png";
import ai_avatar from "../images/ternoshi.png";
import { getStorage, ref, getDownloadURL } from "firebase/storage";

import {
  doc,
  getDocs,
  collection,
  query,
  where,
  updateDoc,
  addDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { Canvas } from '@react-three/fiber'
import { useGLTF, Html } from '@react-three/drei'
import { PerspectiveCamera } from '@react-three/drei';
import { OrbitControls } from '@react-three/drei';
import { useMemo } from 'react'; // Add this to your existing React imports
import {
  Mic,
  X,
  AlertCircle,
  AlertTriangle,
  Bot,
  Briefcase,
  Building2,
  Clock,
  DoorOpen,
  HelpCircle,
  Loader2,
  MessageSquare,
  MessageSquareDashed,
  Play,
  Repeat,
  Rocket,
  CheckCircle,
  Settings,
  StopCircle,
  Check,
  MessageCircle,
  Volume,
  ChevronsDown,
  Lightbulb,
  Headphones,
  NotebookPen,
  MessageSquareQuote,
  Send
} from "lucide-react";


const MockInterview = () => {
  // State management
  const [isActive, setIsActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [resumeContext, setResumeContext] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [transcriptions, setTranscriptions] = useState([]);
  const [conversation, setConversation] = useState([]);
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
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [interviewStage, setInterviewStage] = useState("not_started");
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);
  const [userInterviewData, setUserInterviewData] = useState(null);
  const [displayName, setDisplayName] = useState(null);
  const [userName, setUserName] = useState("");
  const [userPhoto, setUserPhoto] = useState("");
  const [showEndMeetingModal, setShowEndMeetingModal] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(null);
  const [showLowCreditPopup, setShowLowCreditPopup] = useState(false);
  const [isRemainingReady, setIsRemainingReady] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [backendStatus, setBackendStatus] = useState("loading");
  const [selectedModel, setSelectedModel] = useState("Nemotron 3 Super");
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showInstructionModal, setShowInstructionModal] = useState(
    localStorage.getItem('hasSeenInstructions') !== 'true'
  );
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [waveformStatus, setWaveformStatus] = useState("ready"); // 'ready', 'listening', or 'processing'
  const audioContextRef = useRef(null);
  const aiWaveAnimationRef = useRef(null);
  const [isStartingInterview, setIsStartingInterview] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [showEndConfirmation, setShowEndConfirmation] = useState(false);
  const [showClosingCountdown, setShowClosingCountdown] = useState(false);
  const [closingCountdown, setClosingCountdown] = useState(10);
  const [autoEndTimer, setAutoEndTimer] = useState(null);
  const [questionBank, setQuestionBank] = useState({
    intro: [],
    resumeBased: [],
    technical: [],
    behavioral: [],
  });

  // Refs
  const mediaStreamRef = useRef(null);
  const recognitionRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const answerDisplayRef = useRef(null);
  const transcriptionDisplayRef = useRef(null);
  const videoRef = useRef(null);
  const conversationEndRef = useRef(null);
  const hasEndedRef = useRef(false);
  const startTimestampRef = useRef(null);
  const tickIntervalRef = useRef(null);
  const lowCreditShownRef = useRef(false);
  const hasLoadedRef = useRef(false);
  const dropdownRef = useRef(null);
  const voicesRef = useRef([]);
  const followUpMapRef = useRef({});
  const originalQuestionRef = useRef(null);
  const followUpQuestionRef = useRef(null);
  const silenceTimeoutRef = useRef(null);
  const isProcessingRef = useRef(false);
  const lastSpeechTimeRef = useRef(null);
  const transcriptBufferRef = useRef("");
  const autoEndTimerId = useRef(null); // 👈 ADD THIS REF

  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const interviewId = queryParams.get("uyhn");
  const backend_url = process.env.REACT_APP_BACKEND_URL;
  const ws_url = process.env.REACT_APP_WS_URL;
  const [serverUrl, setServerUrl] = useState(`${backend_url}/api/ask`);
  const [silenceCountdown, setSilenceCountdown] = useState(0);
  const currentAnswerChunksRef = useRef([]);
  const isSpeakingRef = useRef(false);
  const lastAskedMainQuestionRef = useRef(null);
  const [textInput, setTextInput] = useState("");
  const [isInterviewStarted, setIsInterviewStarted] = useState(false);
  const transcriptLogRef = useRef(null);
  // Add these state variables
  const [audioContext, setAudioContext] = useState(null);
  const [analyser, setAnalyser] = useState(null);
  const [dataArray, setDataArray] = useState(null);
  const [volume, setVolume] = useState(0);


  useEffect(() => {
    if (!isStartingInterview) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsStartingInterview(false);
          setShowInstructionModal(false);
          return 10;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isStartingInterview]);

  // Device detection
  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobileOrTablet = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet|ios/i.test(userAgent);

    if (isMobileOrTablet) {
      navigate('/home', { replace: true });
    }
  }, [navigate]);


  // Add this new useEffect hook
  useEffect(() => {
    // Only control microphone if interview is active
    if (!isActive) return;

    if (waveformStatus === "listening") {
      // Start listening when status changes to listening
      if (recognitionRef.current && !isListening) {
        try {
          recognitionRef.current.start();
          setIsListening(true);
          console.log("🎤 Microphone activated (listening mode)");
        } catch (err) {
          console.error("Failed to start recognition:", err);
        }
      }
    } else {
      // Stop listening in other states (ready/speaking)
      if (recognitionRef.current && isListening) {
        try {
          recognitionRef.current.stop();
          setIsListening(false);
          console.log("🔇 Microphone deactivated (not in listening mode)");
        } catch (err) {
          console.error("Failed to stop recognition:", err);
        }
      }
    }
  }, [waveformStatus, isActive]);



  // Update the waveform status based on interview state
  useEffect(() => {
    if (isSpeaking) {
      setWaveformStatus("speaking");
    } else if (interviewStage === "in_progress" && !isThinking) {
      setWaveformStatus("listening");
    } else {
      setWaveformStatus("ready");
    }
  }, [isSpeaking, interviewStage, isThinking]);


  useEffect(() => {
    const bars = document.querySelectorAll('.professional-waveform-bar');

    let frame = 0;

    const animate = () => {
      frame += 0.05;

      bars.forEach((bar, i) => {
        const wave = Math.sin(i * 0.2 + frame);
        const height = 8 + wave * 12; // you can tweak the range
        bar.style.height = `${Math.max(2, height)}px`;
      });

      aiWaveAnimationRef.current = requestAnimationFrame(animate);
    };

    if (isSpeaking) {
      animate();
    } else {
      cancelAnimationFrame(aiWaveAnimationRef.current);
      aiWaveAnimationRef.current = null;

      // Reset bar height to baseline
      bars.forEach(bar => {
        bar.style.height = '2px';
      });
    }

    return () => {
      cancelAnimationFrame(aiWaveAnimationRef.current);
      aiWaveAnimationRef.current = null;
    };
  }, [isSpeaking]);



  // Control microphone based on waveform status
  useEffect(() => {
    if (waveformStatus === "listening") {
      // Start listening when status changes to listening
      if (recognitionRef.current && !isListening) {
        try {
          recognitionRef.current.start();
          setIsListening(true);
        } catch (err) {
          console.error("Failed to start recognition:", err);
        }
      }
    } else {
      // Stop listening in other states
      if (recognitionRef.current && isListening) {
        try {
          recognitionRef.current.stop();
          setIsListening(false);
        } catch (err) {
          console.error("Failed to stop recognition:", err);
        }
      }
    }
  }, [waveformStatus]);

  useEffect(() => {
    let animationFrameId;
    let analyser;
    let microphoneSource;
    let audioContext;

    const analyzeAudio = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });

        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 64;

        microphoneSource = audioContext.createMediaStreamSource(stream);
        microphoneSource.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const checkVolume = () => {
          if (waveformStatus !== "listening") { // Only analyze when listening
            setIsUserSpeaking(false);
            return;
          }

          analyser.getByteFrequencyData(dataArray);
          const volume = Math.max(...dataArray);
          setVolumeLevel(volume);

          if (volume > 30) {
            setIsUserSpeaking(true);
            lastSpeechTimeRef.current = Date.now();
          } else {
            setIsUserSpeaking(false);
          }
          animationFrameId = requestAnimationFrame(checkVolume);
        };

        checkVolume();
      } catch (error) {
        console.error("Error accessing microphone:", error);
        showStatus("Microphone access failed", "error");
      }
    };

    // Only start analysis when in listening mode and interview is active
    if (isInterviewStarted && waveformStatus === "listening") {
      analyzeAudio();
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (microphoneSource) microphoneSource.disconnect();
      if (audioContext) audioContext.close();
    };
  }, [isInterviewStarted, waveformStatus]);



  // Waveform animation loop
  const animateWaveform = (analyser, dataArray) => {
    const loop = () => {
      analyser.getByteFrequencyData(dataArray);
      const avg = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length;
      setVolume(avg);
      setIsUserSpeaking(avg > 20); // threshold tweakable
      console.log("🎤 avg volume:", avg);

      requestAnimationFrame(loop);
    };
    loop();
  };


  useEffect(() => {
    if (autoScroll && transcriptLogRef.current) {
      transcriptLogRef.current.scrollTop = transcriptLogRef.current.scrollHeight;
    }
  }, [conversation, autoScroll]);





  useEffect(() => {
    const fetchProfilePhoto = async () => {
      if (!currentUser) return;
      const email = currentUser.email;
      const storage = getStorage();
      const photoRef = ref(storage, `profile_pics/${email}.png`);

      try {
        const firebaseUrl = await getDownloadURL(photoRef);
        setUserPhoto(firebaseUrl);
      } catch (error) {
        console.warn("Profile photo not found, using fallback.");
        setUserPhoto(profile_pic); // fallback
      }
    };

    fetchProfilePhoto();
  }, [currentUser]);


  // In your Avatar component
  function Avatar({ isSpeaking }) {
    const { scene } = useGLTF('/3d_model.glb');
    const avatarRef = useRef();
    const mouthRef = useRef();
    const animationRef = useRef();

    const clonedScene = useMemo(() => {
      return scene?.clone() || null;
    }, [scene]);

    useEffect(() => {
      if (!clonedScene) return;

      avatarRef.current = clonedScene;
      const findMouthObject = (obj) => {
        let bestCandidate = null;
        obj.traverse((child) => {
          if (child.isMesh && child.morphTargetInfluences) {
            bestCandidate = child;
          }
        });
        return bestCandidate;
      };

      mouthRef.current = findMouthObject(clonedScene);
    }, [clonedScene]);

    useEffect(() => {
      if (!mouthRef.current) return;

      const animate = () => {
        if (!isSpeaking || !mouthRef.current) return;

        const influences = mouthRef.current.morphTargetInfluences;
        const dict = mouthRef.current.morphTargetDictionary;
        const t = Date.now() * 0.005;

        // Mouth animation
        const mouthOpen = Math.abs(Math.sin(t * 2)) * 0.8;
        if (dict.mouthOpen !== undefined) influences[dict.mouthOpen] = mouthOpen;
        if (dict.mouthSmile !== undefined) influences[dict.mouthSmile] = mouthOpen * 0.2;

        animationRef.current = requestAnimationFrame(animate);
      };

      if (isSpeaking) {
        animationRef.current = requestAnimationFrame(animate);
      } else if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        // Reset mouth position
        if (mouthRef.current?.morphTargetInfluences) {
          mouthRef.current.morphTargetInfluences.fill(0);
        }
      }

      return () => {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
      };
    }, [isSpeaking]);

    if (!clonedScene) return null;

    return (
      <group position={[0, -0.85, 0]} scale={[1.6, 1.6, 1.6]}>
        <group ref={avatarRef}>
          <primitive object={clonedScene} />
        </group>
      </group>
    );
  }


  useEffect(() => {
    const checkBackend = async () => {
      setBackendStatus("checking");

      try {
        const response = await fetch(`${backend_url}/health`);
        const data = await response.json();

        if (response.ok && data.status === "ok") {
          setBackendStatus("ready");
        } else {
          setBackendStatus("error");
        }
      } catch (error) {
        console.error("Backend health check failed:", error);
        setBackendStatus("error");
      }
    };

    checkBackend();

    const interval = setInterval(checkBackend, 10000); // repeat every 10s
    return () => clearInterval(interval);
  }, [backend_url]);

  useEffect(() => {
    if (isAutoScrollEnabled && conversationEndRef.current) {
      const container = conversationEndRef.current.parentNode;

      if (container) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: "smooth",
        });
      }
    }
  }, [conversation, isAutoScrollEnabled]);


  const handleStartInterview = () => {
    // Set flag in localStorage
    localStorage.setItem('hasSeenInstructions', 'true');
    setIsStartingInterview(true);
    setCountdown(10);
  };

  // Helper functions
  const formatDuration = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
  };

  const formatTime = (minutes, seconds) => {
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  const handleSilenceTimeout = useCallback(() => {


    if (
      interviewStage === "in_progress" &&
      !isProcessingRef.current
    ) {
      const liveText = liveTranscription.trim();
      const fullAnswer = currentAnswerChunksRef.current.join(" ").trim() +
        (liveText ? " " + liveText : "");

      if (fullAnswer.length > 0) {

        // Clear everything
        currentAnswerChunksRef.current = [];
        transcriptBufferRef.current = "";
        setLiveTranscription("");

        processResponse(fullAnswer);
      } else {
        console.log("⚠️ Nothing to process during silence");
      }
    }
  }, [interviewStage, liveTranscription]);


  const startSilenceCountdown = useCallback(() => {
    clearTimeout(silenceTimeoutRef.current);

    let countdown = 5;
    setSilenceCountdown(countdown);

    const countdownInterval = setInterval(() => {
      countdown--;
      setSilenceCountdown(countdown);

      if (countdown <= 0) {
        clearInterval(countdownInterval);
        setSilenceCountdown(0);

        if (!isProcessingRef.current && interviewStage === "in_progress") {
          handleSilenceTimeout();
        }
      }
    }, 1000);

    silenceTimeoutRef.current = countdownInterval;
  }, [interviewStage, handleSilenceTimeout]);

  const getDotColor = (status) => {
    switch (status) {
      case "ready": return "#22c55e";
      case "checking": return "#facc15";
      case "error":
      default: return "#ef4444";
    }
  };

  const formatIST = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour12: true,
    });
  };

  const showStatus = useCallback((message, type = "info") => {
    setStatus({ message, type, visible: true });
    setTimeout(() => {
      setStatus((prev) => ({ ...prev, visible: false }));
    }, 3000);
  }, []);

  // Enhanced voice loading with retry mechanism
  useEffect(() => {
    const loadVoices = () => {
      return new Promise((resolve) => {
        let voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          voicesRef.current = voices;
          resolve(voices);
        } else {
          const utterance = new SpeechSynthesisUtterance("");
          window.speechSynthesis.speak(utterance);
          window.speechSynthesis.cancel();

          const checkVoices = () => {
            voices = window.speechSynthesis.getVoices();
            if (voices.length > 0) {
              voicesRef.current = voices;
              resolve(voices);
            } else {
              setTimeout(checkVoices, 100);
            }
          };
          setTimeout(checkVoices, 100);
        }
      });
    };

    loadVoices();

    const handleVoicesChanged = () => {
      loadVoices();
    };

    window.speechSynthesis.addEventListener("voiceschanged", handleVoicesChanged);

    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", handleVoicesChanged);
    };
  }, []);

  // Initialize interview data
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user || !interviewId) {
        navigate("/home", { replace: true });
        return;
      }

      setCurrentUser(user);
      const email = currentUser?.email;

      const creditQuery = query(
        collection(db, "userCredits"),
        where("email", "==", user.email)
      );
      const creditSnap = await getDocs(creditQuery);
      if (!creditSnap.empty) {
        const creditDoc = creditSnap.docs[0];
        const credits = creditDoc.data().credits || 0;
        setTimeout(() => {
          const effectiveElapsed = parseInt(localStorage.getItem("elapsedTime"), 10) || 0;
          const remaining = Math.max(0, Math.floor(credits * 60 - effectiveElapsed));
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
          collection(db, "practiceMockInterviews"),
          where("mockInterviewId", "==", interviewId),
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

        await fetch(`${backend_url}/api/generate-mock-questions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: user.email,
            mockInterviewId: interviewId,
          }),
        });

        const questionSnap = await getDocs(
          query(
            collection(db, "mockInterviewQuestions"),
            where("mockInterviewId", "==", interviewId),
            where("email", "==", user.email)
          )
        );

        if (!questionSnap.empty) {
          const questionData = questionSnap.docs[0].data().questions;
          setQuestionBank(questionData);

          const reconstructed = [];

          const allTypes = ["intro", "resumeBased", "behavioral"];
          for (const type of allTypes) {
            for (const q of questionData[type] || []) {
              if (q.used) {
                reconstructed.push({
                  type: "question",
                  content: q.text,
                  timestamp: q.timestamp || new Date().toISOString(),
                });
                if (q.answer) {
                  reconstructed.push({
                    type: "answer",
                    content: q.answer,
                    timestamp: q.timestamp || new Date().toISOString(),
                  });
                }

                // Handle follow-ups
                if (q.followUps) {
                  for (const f of q.followUps) {
                    reconstructed.push({
                      type: "question",
                      content: f.text,
                      timestamp: f.timestamp || new Date().toISOString(),
                      isFollowUp: true,
                      originalQuestion: q.text,
                    });
                    if (f.answer) {
                      reconstructed.push({
                        type: "answer",
                        content: f.answer,
                        timestamp: f.timestamp || new Date().toISOString(),
                      });
                    }
                  }
                }
              }
            }
          }


          // Do technical questions
          for (const block of questionData.technical || []) {
            for (const q of block.questions || []) {
              if (q.used) {
                reconstructed.push({
                  type: "question",
                  content: q.text,
                  timestamp: q.timestamp || new Date().toISOString(),
                });
                if (q.answer) {
                  reconstructed.push({
                    type: "answer",
                    content: q.answer,
                    timestamp: q.timestamp || new Date().toISOString(),
                  });
                }

                if (q.followUps) {
                  for (const f of q.followUps) {
                    reconstructed.push({
                      type: "question",
                      content: f.text,
                      timestamp: f.timestamp || new Date().toISOString(),
                      isFollowUp: true,
                      originalQuestion: q.text,
                    });
                    if (f.answer) {
                      reconstructed.push({
                        type: "answer",
                        content: f.answer,
                        timestamp: f.timestamp || new Date().toISOString(),
                      });
                    }
                  }
                }
              }
            }
          }

          setConversation(reconstructed);
        }


        setDisplayName(`${latestInterview.role} @ ${latestInterview.companyName}`);

        const resumeResponse = await fetch(`${backend_url}/api/read-resume`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: latestInterview.resumePathName }),
        });

        const data = await resumeResponse.json();
        const resumeText = data.content;

        const chatSeed = [
          {
            role: "system",
            content: `You are conducting a mock interview for the role of ${latestInterview.role} at ${latestInterview.companyName}. 
              The candidate's resume is provided below. Ask relevant technical and behavioral questions one at a time, 
              wait for the candidate's response, then provide feedback or ask follow-up questions. Keep questions concise.`,
          },
          {
            role: "user",
            content: "Resume content [About Candidate]:\n" + resumeText,
          },
          {
            role: "user",
            content: `Job description: ${latestInterview.jobDescription}`,
          },
        ];

        setChatHistory(chatSeed);
        setResumeContext(latestInterview.resumePathName);
        showStatus("✅ Interview setup complete!");
        setCurrentUser(user);
      } catch (error) {
        console.error("Error initializing interview:", error);
        navigate("/home", { replace: true });
      }
    });

    return () => unsubscribe();
  }, [navigate, interviewId, backend_url]);

  const handleTextSubmit = () => {
    const trimmed = textInput.trim();
    if (!trimmed) return;

    processResponse(trimmed); // You already have this function
    setTextInput("");         // Clear the input box
  };

  // Speech recognition setup
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      showStatus("Speech Recognition not available", "warning");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsListening(true);
      showStatus("Listening for your response...");
    };

    recognition.onend = () => {
      setIsListening(false);
      if (isActive && mediaStreamRef.current) {
        setTimeout(() => {
          if (isActive && recognitionRef.current && !isListening) {
            try {
              recognitionRef.current.start();
            } catch (e) {
              console.error("Error restarting recognition:", e);
            }
          }
        }, 100);
      }
    };

    recognition.onerror = (event) => {
      console.error("Recognition error:", event.error);
      setIsListening(false);

      if (event.error === "not-allowed") {
        showStatus("Microphone access denied", "error");
        setIsActive(false);
        return;
      }

      // For follow-up scenarios, attempt to restart more aggressively
      if (interviewStage === "in_progress" && isActive) {
        setTimeout(() => {
          try {
            if (recognitionRef.current) {
              recognitionRef.current.stop();
              recognitionRef.current.start();
              setIsListening(true);
            }
          } catch (err) {
            console.warn("Error restarting recognition:", err);
          }
        }, 500);
      }
    };

    recognition.onresult = (event) => {
      let finalTranscript = "";
      let interimTranscript = "";
      let speechDetected = false;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
          speechDetected = true;
        } else {
          interimTranscript += transcript;
          speechDetected = true;
        }
      }

      if (speechDetected) {
        lastSpeechTimeRef.current = Date.now();

        // Clear existing timeout
        clearTimeout(silenceTimeoutRef.current);

        // Set new timeout - this is crucial for the 5-second trigger
        silenceTimeoutRef.current = setTimeout(() => {
          if (!isProcessingRef.current && interviewStage === "in_progress") {
            handleSilenceTimeout();
          }
        }, 5000); // 5 seconds of silence
      }

      // Update live transcription only when waveform status is "listening" and user is speaking
      if (interimTranscript.trim()) {
        if (waveformStatus === "listening" && isUserSpeaking) {
          setLiveTranscription(interimTranscript.trim());
        }
      }

      // Handle final transcript only when waveform status is "listening" and user is speaking
      if (finalTranscript.trim()) {
        if (waveformStatus === "listening" && isUserSpeaking) {
          const cleanText = finalTranscript.trim();
          setLiveTranscription("");

          transcriptBufferRef.current += " " + cleanText;
          currentAnswerChunksRef.current.push(cleanText); // <-- STORE HERE

          const newTranscription = {
            id: Date.now(),
            text: cleanText,
            timestamp: new Date().toLocaleTimeString(),
          };
          setTranscriptions((prev) => [newTranscription, ...prev]);

          clearTimeout(silenceTimeoutRef.current);
          silenceTimeoutRef.current = setTimeout(() => {
            if (!isProcessingRef.current && interviewStage === "in_progress") {
              handleSilenceTimeout();
            }
          }, 5000);
        }
      }
    };

    recognitionRef.current = recognition;

    if (isActive) {
      try {
        recognition.start();
      } catch (e) {
        console.error("Error starting recognition:", e);
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      clearTimeout(silenceTimeoutRef.current);
    };
  }, [isActive, interviewStage, waveformStatus, isUserSpeaking]);


  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      isSpeakingRef.current = false;
    };
  }, []);


  const sendCurrentAnswer = useCallback(() => {
    const bufferText = transcriptBufferRef.current.trim();
    const liveText = liveTranscription.trim();

    if (bufferText.length > 0 || liveText.length > 0) {
      const textToProcess = bufferText + (bufferText && liveText ? ' ' : '') + liveText;
      transcriptBufferRef.current = "";
      setLiveTranscription("");

      // Clear the silence timeout since user manually sent
      clearTimeout(silenceTimeoutRef.current);

      processResponse(textToProcess);
    }
  }, [liveTranscription]);

  // Interview control functions
  const startCapture = async () => {
    try {
      showStatus("Starting interview session...");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;
      setIsActive(true);

      startTimestampRef.current = Date.now() - elapsedSeconds * 1000;
      tickIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimestampRef.current) / 1000);
        setElapsedSeconds(elapsed);
        setTimer({
          minutes: Math.floor(elapsed / 60),
          seconds: elapsed % 60,
        });
      }, 1000);

      if (recognitionRef.current) {
        recognitionRef.current.start();
      }

      await startInterview();
      showStatus("Interview session started!");
    } catch (error) {
      setIsActive(false);
      showStatus(`Failed to start: ${error.message}`, "error");
    }
  };

  const stopCapture = useCallback(() => {
    console.log("🛑 Stopping all interview activities...");

    // Clear auto-end timer if it exists
    if (autoEndTimer?.intervalId) {
      clearInterval(autoEndTimer.intervalId);
    }
    setAutoEndTimer(null);

    // Rest of your existing stopCapture code...
    setIsActive(false);
    setIsListening(false);
    setIsUserSpeaking(false);
    setIsThinking(false);
    setWaveformStatus("ready");
    setLiveTranscription("");
    setIsInterviewStarted(false);

    // Clear all timeouts and intervals
    clearTimeout(silenceTimeoutRef.current);
    clearInterval(tickIntervalRef.current);
    tickIntervalRef.current = null;

    // Stop speech recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        recognitionRef.current.abort();
        console.log("🎤 Speech recognition stopped");
      } catch (err) {
        console.warn("Error stopping recognition:", err);
      }
    }

    // Stop microphone stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log("🔇 Microphone track stopped");
      });
      mediaStreamRef.current = null;
    }

    // Cancel any speech synthesis
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      isSpeakingRef.current = false;
      console.log("🗣 Text-to-speech cancelled");
    }

    // Reset conversation state if needed
    setCurrentQuestion("");
    setInterviewStage("not_started");

    showStatus("Interview session stopped");
  }, [autoEndTimer]);

  useEffect(() => {
    return () => {
      stopCapture();
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(console.warn);
      }
    };
  }, [stopCapture]);

  useEffect(() => {
    return () => {
      stopCapture();
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(console.warn);
      }
      // Clean up the auto-end timer
      if (autoEndTimer) {
        clearTimeout(autoEndTimer);
      }
    };
  }, [stopCapture, autoEndTimer]);





  // Interview question handling
  const getNextQuestion = (currentQuestionBank = questionBank) => {
    const order = ["intro", "resumeBased", "technical", "behavioral"];

    // 1. First check for any in_progress question
    for (const type of order) {
      if (type === "technical") {
        for (const block of currentQuestionBank.technical || []) {
          const inProgressQ = block.questions.find((q) => q.used === "in_progress");
          if (inProgressQ) {
            return {
              type: "technical",
              text: inProgressQ.text,
              keyword: block.keyword,
            };
          }
        }
      } else {
        const inProgressQ = (currentQuestionBank[type] || []).find((q) => q.used === "in_progress");
        if (inProgressQ) {
          return { type, text: inProgressQ.text };
        }
      }
    }

    // 2. Then fallback to any unused (used === false) question
    for (const type of order) {
      if (type === "technical") {
        for (const block of currentQuestionBank.technical || []) {
          const unusedQ = block.questions.find((q) => q.used === false);
          if (unusedQ) {
            return {
              type: "technical",
              text: unusedQ.text,
              keyword: block.keyword,
            };
          }
        }
      } else {
        const unusedQ = (currentQuestionBank[type] || []).find((q) => q.used === false);
        if (unusedQ) {
          return { type, text: unusedQ.text };
        }
      }
    }

    return null; // no more questions
  };


  const markQuestionAsUsed = async (questionText, type, keyword = null, status = "true") => {
    try {
      console.log(`▶️ markQuestionAsUsed: ${questionText} as ${status}`);
      const refQuery = query(
        collection(db, "mockInterviewQuestions"),
        where("mockInterviewId", "==", interviewId),
        where("email", "==", currentUser.email)
      );
      const snap = await getDocs(refQuery);
      if (snap.empty) {
        console.warn("⚠️ No Firestore doc found in markQuestionAsUsed");
        return null;
      }
      const docRef = snap.docs[0].ref;
      const data = snap.docs[0].data();
      const updatedQuestions = { ...data.questions };

      if (type === "technical") {
        console.log("   ↪️ In technical block:", keyword);
        for (const block of updatedQuestions.technical) {
          if (block.keyword === keyword) {
            for (const q of block.questions) {
              if (q.text === questionText) {
                console.log("       ↪️ Found question:", q.text);
                q.used = status;
              }
            }
          }
        }
      } else {
        console.log(`   ↪️ In bucket ${type}`);
        for (const q of updatedQuestions[type] || []) {
          if (q.text === questionText) {
            console.log("       ↪️ Found question:", q.text);
            q.used = status;
          }
        }
      }

      console.log("📤 Writing markQuestionAsUsed updatedQuestions:", updatedQuestions);
      await updateDoc(docRef, { questions: updatedQuestions });
      console.log("✅ markQuestionAsUsed write successful");

      return updatedQuestions;
    } catch (error) {
      console.error("❌ Error in markQuestionAsUsed:", error);
      return null;
    }
  };

  // speakQuestion function

  const speakQuestion = useCallback((text, isFinalSpeech = false) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    // Cancel any previous speech
    window.speechSynthesis.cancel();
    isSpeakingRef.current = false;
    setIsSpeaking(false);

    // Stop recognition while AI is about to speak
    if (recognitionRef.current && isListening) {
      recognitionRef.current.abort();
    }

    setTimeout(() => {
      setIsSpeaking(true);
      isSpeakingRef.current = true;
      setWaveformStatus("speaking");

      const cleanText = text
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .replace(/\*(.*?)\*/g, "$1")
        .replace(/#+\s*/g, "")
        .trim();

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = "en-US";

      // More natural speech parameters
      utterance.rate = 1.0; // Slightly faster than default (0.9 was too slow)
      utterance.pitch = 1.1; // Slightly higher pitch for more natural female voice
      utterance.volume = 0.9; // Slightly softer than maximum

      // Enhanced voice selection logic
      const selectBestVoice = (voices) => {
        // Preferred female voices (order matters)
        const preferred = [
          "Samantha",        // macOS
          "Victoria",        // macOS
          "Serena",          // macOS (British)
          "Allison",         // macOS
          "Ava",             // iOS
          "Karen",           // Australian
          "Tessa",           // South African
          "Susan",           // Windows
          "Zira",            // Windows
          "Microsoft Hazel"  // Windows
        ];

        // First try exact matches
        for (const name of preferred) {
          const exactMatch = voices.find(v =>
            v.name.toLowerCase() === name.toLowerCase()
          );
          if (exactMatch) return exactMatch;
        }

        // Then try partial matches
        for (const name of preferred) {
          const partialMatch = voices.find(v =>
            v.name.toLowerCase().includes(name.toLowerCase())
          );
          if (partialMatch) return partialMatch;
        }

        // Fallback to any female voice
        const femaleVoice = voices.find(v =>
          /female/i.test(v.name) ||
          /woman/i.test(v.name) ||
          /girl/i.test(v.name)
        );
        if (femaleVoice) return femaleVoice;

        // Final fallback
        return voices.find(v => v.lang.startsWith("en")) || voices[0];
      };

      const voices = window.speechSynthesis.getVoices();
      const bestVoice = selectBestVoice(voices);
      if (bestVoice) {
        utterance.voice = bestVoice;
        console.log("🔊 Using voice:", bestVoice.name);
      }

      // Add natural pauses for punctuation
      const addPauses = (text) => {
        return text
          .replace(/([,.])/g, "$1 ")      // Short pause for commas/periods
          .replace(/([?!])/g, "$1  ");    // Longer pause for questions/exclamations
      };
      utterance.text = addPauses(cleanText);

      utterance.onboundary = (event) => {
        // Add subtle pitch variations for more natural speech
        if (event.name === 'word') {
          const currentWord = cleanText.substring(event.charIndex, event.charIndex + event.charLength);
          if (currentWord.endsWith('?')) {
            utterance.pitch = 1.2; // Higher pitch for questions
          } else if (currentWord.endsWith('!')) {
            utterance.pitch = 1.15; // Slightly higher for exclamations
          } else {
            utterance.pitch = 1.0 + Math.random() * 0.2; // Natural variation
          }
        }
      };

      utterance.onend = () => {
        console.log("🗣️ Speech ended.");
        setIsSpeaking(false);
        isSpeakingRef.current = false;

        if (isFinalSpeech) {
          console.log("⏰ Starting closing countdown after final speech");
          setShowClosingCountdown(true);
          setClosingCountdown(10);

          // Start countdown timer that will call completeInterview
          const countdownInterval = setInterval(() => {
            setClosingCountdown(prev => {
              if (prev <= 1) {
                clearInterval(countdownInterval);
                completeInterview(); // This will handle the navigation
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        } else if (interviewStage === "in_progress") {
          setWaveformStatus("listening");
        } else {
          setWaveformStatus("ready");
        }
      };

      utterance.onerror = (e) => {
        console.error("🚨 Speech error:", e.error);
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        setWaveformStatus("ready");

        if (isFinalSpeech) {
          setShowClosingCountdown(true);
          setClosingCountdown(10);

          const countdownInterval = setInterval(() => {
            setClosingCountdown(prev => {
              if (prev <= 1) {
                clearInterval(countdownInterval);
                completeInterview();
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        }
      };

      window.speechSynthesis.speak(utterance);
    }, 100);
  }, [interviewStage, isListening]);

  const addQuestionOnce = (text) => {
    setConversation((prev) => {
      const exists = prev.some(
        (item) => item.type === "question" && item.content === text
      );
      if (!exists) {
        return [
          ...prev,
          {
            type: "question",
            content: text,
            timestamp: new Date().toISOString(),
          },
        ];
      }
      return prev;
    });

    setChatHistory((prev) => {
      const exists = prev.some(
        (item) => item.role === "assistant" && item.content === text
      );
      if (!exists) {
        return [...prev, { role: "assistant", content: text }];
      }
      return prev;
    });
  };


  const startInterview = async () => {
    setIsThinking(true);
    try {
      const next = getNextQuestion(questionBank);
      if (!next) {
        showStatus("No questions available.", "warning");
        setIsThinking(false);
        return;
      }

      await markQuestionAsUsed(next.text, next.type, next.keyword, "in_progress");

      setCurrentQuestion(next.text);
      lastAskedMainQuestionRef.current = next.text;
      const questionItem = {
        type: "question",
        content: next.text,
        timestamp: new Date().toISOString(),
      };

      addQuestionOnce(next.text);
      setInterviewStage("in_progress");

      showStatus("Interview started!");
      speakQuestion(next.text);

    } catch (error) {
      console.error("Failed to start interview:", error);
      showStatus("Failed to start interview", "error");
    } finally {
      setIsThinking(false);
    }
  };

  useEffect(() => {
    if (interviewStage === "in_progress" && isActive && !isSpeaking && !isListening) {
      // Attempt to restart recognition if it's not running but should be
      setTimeout(() => {
        if (recognitionRef.current && !isListening) {
          try {
            recognitionRef.current.start();
            setIsListening(true);
          } catch (err) {
            console.warn("Auto-restart recognition failed:", err);
          }
        }
      }, 1000);
    }
  }, [interviewStage, isActive, isSpeaking, isListening]);


  const getQuestionMetaFromBank = (questionText) => {
    for (const type of ["intro", "resumeBased", "behavioral"]) {
      const match = questionBank[type]?.find((q) => q.text === questionText);
      if (match) return { type, keyword: null };
    }

    for (const block of questionBank.technical || []) {
      const match = block.questions?.find((q) => q.text === questionText);
      if (match) return { type: "technical", keyword: block.keyword };
    }

    return null;
  };

  const markParentAsUsed = async (questionText) => {
    const meta = getQuestionMetaFromBank(questionText);
    if (meta) {
      const updated = await markQuestionAsUsed(questionText, meta.type, meta.keyword, "true");
      if (updated) setQuestionBank(updated);
    }
  };

  const processResponse = async (userResponse) => {
    console.log('📝 Processing response:', userResponse);

    if (!userResponse.trim()) return;
    if (isProcessingRef.current) return;

    isProcessingRef.current = true;
    setIsThinking(true);

    try {
      const isFollowUp = !!originalQuestionRef.current;
      const parentQuestion = originalQuestionRef.current || lastAskedMainQuestionRef.current;
      const answeredQuestion = isFollowUp
        ? followUpQuestionRef.current
        : lastAskedMainQuestionRef.current;

      console.log("🧠 answeredQuestion =", answeredQuestion);
      console.log("📌 currentQuestion =", currentQuestion);
      console.log("🔁 lastAskedMainQuestionRef =", lastAskedMainQuestionRef.current);

      // Add response to conversation
      setChatHistory((prev) => [...prev, { role: "user", content: userResponse }]);
      setConversation((prev) => [
        ...prev,
        { type: "answer", content: userResponse, timestamp: new Date().toISOString() },
      ]);

      // Evaluate answer
      const { score, feedback, acknowledgment, communicationMetrics } = await evaluateAnswer(
        answeredQuestion,
        userResponse
      );

      // Save response to Firebase
      const updatedQuestions = await saveEvaluationToSameDoc(
        answeredQuestion,
        userResponse,
        score,
        feedback,
        isFollowUp,
        originalQuestionRef.current,
        communicationMetrics
      );

      if (updatedQuestions) setQuestionBank(updatedQuestions);

      const key = parentQuestion;
      const prevFups = followUpMapRef.current[key] || 0;

      // Follow-up
      if (score < 6 && prevFups < 1) {
        const followUp = await generateFollowUpQuestion(
          answeredQuestion,
          userResponse,
          score,
          feedback
        );

        // Stop any ongoing recognition before speaking
        if (recognitionRef.current) {
          recognitionRef.current.abort();
          setIsListening(false);
        }

        // Update state
        followUpMapRef.current[key] = 1;
        originalQuestionRef.current = key;
        followUpQuestionRef.current = followUp;

        const parentMeta = getQuestionMetaFromBank(parentQuestion);
        if (parentMeta) {
          const parentBank = await markQuestionAsUsed(
            parentQuestion,
            parentMeta.type,
            parentMeta.keyword,
            "true"
          );
          if (parentBank) setQuestionBank(parentBank);
        }

        const speech = `${acknowledgment || "Alright, thanks!"} ${followUp}`;
        addQuestionOnce(followUp);
        speakQuestion(speech);
        setCurrentQuestion(followUp);
        return;
      }

      // Reset follow-up state
      followUpMapRef.current[key] = 0;
      originalQuestionRef.current = null;
      followUpQuestionRef.current = null;

      // Get next main question
      const next = getNextQuestion(updatedQuestions || questionBank);


      if (!next) {
        console.log("🏁 No more questions - ending interview");

        // Mark parent question as used
        if (parentQuestion) {
          await markParentAsUsed(parentQuestion);
        }

        const closingNote = "Thank you for your responses today. That concludes our mock interview session. You'll receive detailed feedback shortly. Best of luck with your actual interviews!";

        // CRITICAL: Set stage to completed first
        setInterviewStage("completed");
        setCurrentQuestion("");

        // Stop recognition immediately
        if (recognitionRef.current) {
          recognitionRef.current.abort();
          setIsListening(false);
        }

        // Add message to conversation
        setConversation((prev) => [
          ...prev,
          {
            type: "question",
            content: closingNote,
            timestamp: new Date().toISOString(),
            isClosing: true,
          },
        ]);
        setChatHistory((prev) => [...prev, { role: "assistant", content: closingNote }]);

        showStatus("🎉 Interview completed! Preparing your results...", "info");

        // Speak the closing note and pass true to indicate it's the final speech
        speakQuestion(closingNote, true);
        return;
      }

      // Mark and ask next main question
      const nextBank = await markQuestionAsUsed(next.text, next.type, next.keyword, "in_progress");
      if (nextBank) setQuestionBank(nextBank);

      lastAskedMainQuestionRef.current = next.text;
      setCurrentQuestion(next.text);
      const prompt = `${acknowledgment || "Great, let's continue."} ${next.text}`;
      addQuestionOnce(next.text);
      speakQuestion(prompt);

      console.log('✅ Response processed successfully');
    } catch (error) {
      console.error("❌ Error in processResponse:", error);
      showStatus("Error processing your response", "error");
    } finally {
      isProcessingRef.current = false;
      setIsThinking(false);
      currentAnswerChunksRef.current = [];
      clearTimeout(silenceTimeoutRef.current);
    }
  };


  const evaluateAnswer = async (question, answer) => {
    try {
      console.log("📤 Sending to /api/evaluate-answer:", {
        question,
        answer,
        interviewId,
        email: currentUser?.email,
      });

      const coreEvalPromise = fetch(`${backend_url}/api/evaluate-answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          answer,
          interviewId,
          email: currentUser.email,
        }),
      });

      const commEvalPromise = fetch(`${backend_url}/api/evaluate-communication`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, answer }),
      });

      const [coreRes, commRes] = await Promise.all([coreEvalPromise, commEvalPromise]);

      const coreResult = coreRes.ok
        ? await coreRes.json()
        : { score: 5, feedback: "Server error during evaluation" };

      const commResult = commRes.ok
        ? await commRes.json()
        : {
          grammar: null,
          vocabulary: null,
          confidence: null,
          communication: null,
          feedback: "Communication analysis unavailable",
        };

      return {
        ...coreResult,
        communicationMetrics: commResult,
      };

    } catch (error) {
      console.error("Evaluation error:", error);
      return {
        score: 5,
        feedback: "Could not evaluate answer",
        communicationMetrics: {
          grammar: null,
          vocabulary: null,
          confidence: null,
          communication: null,
          feedback: "Error during communication analysis",
        },
      };
    }
  };




  const saveEvaluationToSameDoc = async (
    questionText,
    answer,
    score,
    feedback,
    isFollowUp = false,
    originalQuestion = null,
    communicationMetrics = null // 👈 NEW PARAM
  ) => {
    try {
      console.log("▶️ saveEvaluationToSameDoc called for:", questionText);

      // 1️⃣ Fetch Firestore doc
      const refQuery = query(
        collection(db, "mockInterviewQuestions"),
        where("mockInterviewId", "==", interviewId),
        where("email", "==", currentUser.email)
      );
      const snap = await getDocs(refQuery);
      if (snap.empty) {
        console.warn("⚠️ No Firestore doc found for interviewId/email");
        return null;
      }
      const docRef = snap.docs[0].ref;
      const data = snap.docs[0].data();
      console.log("🔍 Fetched questions object:", data.questions);

      // 2️⃣ Clone and prepare normalization
      const updatedQuestions = structuredClone(data.questions);
      const normalize = (s) =>
        s.replace(/\s+/g, " ").trim().toLowerCase();
      const key = normalize(questionText);

      let didUpdate = false;
      const timestamp = new Date().toISOString();

      // 3️⃣ Main vs follow-up
      if (isFollowUp && originalQuestion) {
        console.log("🌀 Handling as follow-up to:", originalQuestion);
        const origKey = normalize(originalQuestion);
        // scan every bucket + tech block
        for (const [bucketName, bucket] of Object.entries(updatedQuestions)) {
          if (bucketName === "technical") {
            for (const block of bucket || []) {
              for (const q of block.questions) {
                if (normalize(q.text) === origKey) {
                  console.log("   ↪️ Found original in technical block:", q.text);
                  q.followUps = q.followUps || [];
                  q.followUps = q.followUps.filter((f) => normalize(f.text) !== key);
                  q.followUps.push({ text: questionText, answer, feedback, score, timestamp, isFollowUp: true, used: "true", ...(communicationMetrics && { communicationMetrics }) });
                  didUpdate = true;
                  break;
                }
              }
              if (didUpdate) break;
            }
          } else {
            for (const q of bucket || []) {
              if (normalize(q.text) === origKey) {
                console.log(`   ↪️ Found original in ${bucketName}:`, q.text);
                q.followUps = q.followUps || [];
                q.followUps = q.followUps.filter((f) => normalize(f.text) !== key);
                q.followUps.push({
                  text: questionText, answer, feedback, score, timestamp, isFollowUp: true, used: "true", ...(communicationMetrics && { communicationMetrics })
                });
                didUpdate = true;
                break;
              }
            }
          }
          if (didUpdate) break;
        }
      } else {
        console.log("📝 Handling as main question update");
        // scan intro/resumeBased/behavioral
        for (const type of ["intro", "resumeBased", "behavioral"]) {
          for (const q of updatedQuestions[type] || []) {
            const qNorm = normalize(q.text);
            if (qNorm === key || qNorm.includes(key) || key.includes(qNorm)) {
              console.log(`   ↪️ Matched in ${type}:`, q.text);
              q.answer = answer;
              q.feedback = feedback;
              q.score = score;
              q.timestamp = timestamp;
              q.used = "true";
              if (communicationMetrics) q.communicationMetrics = communicationMetrics;
              didUpdate = true;
              break;
            }
          }
          if (didUpdate) break;
        }
        // scan technical as fallback
        if (!didUpdate) {
          for (const block of updatedQuestions.technical || []) {
            for (const q of block.questions) {
              const qNorm = normalize(q.text);
              if (qNorm === key || qNorm.includes(key) || key.includes(qNorm)) {
                console.log("   ↪️ Matched in technical:", q.text);
                q.answer = answer;
                q.feedback = feedback;
                q.score = score;
                q.timestamp = timestamp;
                q.used = "true";
                if (communicationMetrics) q.communicationMetrics = communicationMetrics;

                didUpdate = true;
                break;
              }
            }
            if (didUpdate) break;
          }
        }
      }

      if (!didUpdate) {
        console.warn("⚠️ No matching question was updated for key:", key);
      }

      console.log("📤 Writing updatedQuestions back:", updatedQuestions);
      await updateDoc(docRef, { questions: updatedQuestions });
      console.log("✅ Firestore update successful");

      return updatedQuestions;
    } catch (error) {
      console.error("❌ Firebase save error:", error);
      return null;
    }
  };



  const generateFollowUpQuestion = async (
    originalQuestion,
    answer,
    score,
    feedback
  ) => {
    const response = await fetch(`${backend_url}/api/generate-followup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        originalQuestion,
        answer,
        score,
        feedback,
        interviewId,
        email: currentUser.email,
      }),
    });
    const data = await response.json();
    return data.followUpQuestion;
  };

  const completeInterview = async () => {
    if (hasEndedRef.current) return;
    hasEndedRef.current = true;
    console.log("🏁 Completing interview and navigating...");

    try {
      // Stop all activities first
      stopCapture();

      // Update interview status in database
      const q = query(
        collection(db, "practiceMockInterviews"),
        where("mockInterviewId", "==", interviewId),
        where("email", "==", currentUser.email)
      );

      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const docRef = snapshot.docs[0].ref;
        await updateDoc(docRef, {
          status: "completed",
          mockInterviewEndTime: new Date().toISOString(),
          duration: elapsedSeconds,
        });
      }

      // Clear any existing timer
      if (autoEndTimerId.current) {
        clearInterval(autoEndTimerId.current);
      }

      // Navigate immediately after cleanup
      navigate(`/mock-interview-analysis?zuLjp=${interviewId}`, {
        replace: true,
      });

    } catch (error) {
      console.error("❌ Error completing interview:", error);
      // Fallback navigation if something fails
      navigate(`/mock-interview-analysis?zuLjp=${interviewId}`, {
        replace: true,
      });
    }
  };


  const stripMarkdown = (markdown = "") => {
    return markdown
      .replace(/!\[.*?\]\(.*?\)/g, "") // remove images
      .replace(/\[([^\]]+)\]\((.*?)\)/g, "$1") // links
      .replace(/[`*_>#~\-+]+/g, "") // symbols
      .replace(/#+\s?/g, "") // headers
      .replace(/\n+/g, " ") // new lines to space
      .trim();
  };


  // UI rendering
  return (
    <div className="mock-interview-container">
      {/* Left Control Panel */}
      <div className="mock-interview-left-panel">
        <div className="mock-interview-logo">
          <img src={logo} alt="Voizon" className="mock-interview-logo-img" />
          <span className="mock-interview-logo-text">Voizon</span>
        </div>

        <div className="mock-interview-status-card">
          <div className="mock-interview-status-item">
            <span className="mock-interview-status-dot mock-interview-status-dot--active"></span>
            <span className="mock-interview-status-label">AI Mock Interview</span>
          </div>
          {userInterviewData && (
            <div className="mock-interview-avatar-context">
              {userInterviewData.role} @ {userInterviewData.companyName}
            </div>
          )}
        </div>

        <div className="mock-interview-toggle-group">
          <label className="mock-interview-toggle-label">Live Transcription</label>
        </div>

        <div className="mock-interview-transcript-panel">
          <div className="mock-interview-transcript-list" ref={transcriptionDisplayRef}>
            {transcriptions.length === 0 && !liveTranscription ? (
              <div className="mock-interview-empty-transcript">
                <MessageSquare size={32} className="mock-interview-empty-icon" />
                <p>Your responses will appear here.</p>
              </div>
            ) : (
              <>
                {liveTranscription && (
                  <div className="mock-interview-transcript-item mock-interview-transcript-item--live">
                    <p>{liveTranscription}</p>
                  </div>
                )}
                {transcriptions.map((transcription) => (
                  <div key={transcription.id} className="mock-interview-transcript-item">
                    <p>{transcription.text}</p>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {isInterviewStarted ? (
          <button
            className="mock-interview-end-button"
            onClick={() => setShowEndConfirmation(true)} // Show confirmation instead of stopping directly
          >
            <DoorOpen size={20} className="mock-interview-door-icon" />
            End Interview
          </button>
        ) : (
          <button
            className="mock-interview-start-button"
            onClick={() => {
              setIsInterviewStarted(true);
              startCapture();
            }}
          >
            <Mic size={20} className="mock-interview-mic-icon" />
            Start Interview
          </button>
        )}
      </div>

      {/* Center Stage Panel */}
      <div className="mock-interview-center-panel">
        {/* AI Avatar Container */}
        <div className="mock-interview-ai-avatar-container">
          <div className={`mock-interview-ai-avatar ${isSpeaking ? 'mock-interview-ai-avatar--speaking' : ''}`}>
            {/* <Canvas>
              <ambientLight intensity={0.8} />
              <directionalLight position={[10, 10, 5]} intensity={1.5} />
              <PerspectiveCamera makeDefault position={[0, 1.6, 1.8]} fov={25} />
              <Suspense fallback={
                <Html center>
                  <div className="mock-interview-avatar-loading">
                    <Loader2 className="mock-interview-avatar-spinner" size={24} />
                  </div>
                </Html>
              }>
                <Avatar isSpeaking={isSpeaking} />
              </Suspense>
            </Canvas> */}
            <img src={ai_avatar} alt="AI Avatar" className="mock-interview-avatar-image" width={200} />
          </div>

        </div>

        {/* Current Question */}
        <div className="mock-interview-question-container">
          <h2 className="mock-interview-question-text">
            {
              stripMarkdown(
                conversation
                  .slice()
                  .reverse()
                  .find(msg => msg.type === 'question')?.content
              ) || "Hi, I'm Zara — your AI interviewer. When you're ready, hit the Start Interview button to begin."
            }
          </h2>
        </div>

        {/* User Speaking Indicator */}
        <div className={`professional-waveform-container ${isSpeaking ? 'speaking' : isListening ? 'listening' : ''}`}>
          <div className="professional-waveform-bars">
            {[...Array(70)].map((_, i) => {
              const baseHeight = 2;
              let height = baseHeight;

              if (isSpeaking) {
                // AI speaking - wave pattern but all bars move in sync
                const wavePosition = Math.sin(i * 0.15); // Creates wave pattern (0.15 controls wave frequency)
                height = 8 + wavePosition * 12; // Base height + wave pattern
              } else if (isListening && isUserSpeaking) {
                // User speaking - dynamic response to volume
                const volumeFactor = volumeLevel / 255;
                const positionFactor = 1 - Math.abs(i - 35) / 35;
                height = baseHeight + (volumeFactor * 30 * positionFactor);
                height *= (0.8 + Math.random() * 0.4);
              }

              return (
                <div
                  key={i}
                  className={`professional-waveform-bar ${isListening && isUserSpeaking ? 'active' : ''}`}
                  style={{
                    height: `${height}px`,
                  }}
                />
              );
            })}
          </div>
          <div className="professional-waveform-status">
            <div className={`professional-waveform-pulse ${waveformStatus === "speaking" ? 'speaking' :
              waveformStatus === "listening" ? (isUserSpeaking ? 'active' : 'listening') :
                'ready'
              }`} />
            <span className="professional-waveform-status-text">
              {waveformStatus === "speaking" ? "Interviewer is speaking" :
                waveformStatus === "listening" ? (isUserSpeaking ? "Listening..." : "Listening...") :
                  "Ready"}
            </span>
          </div>
        </div>
      </div>

      {/* Right Transcript Panel */}
      <div className="mock-interview-right-panel">
        <div className="mock-interview-transcript-header">
          <h3 className="mock-interview-transcript-title">Conversation</h3>
          <div
            className="mock-interview-toggle-group"
            onClick={() => setAutoScroll(!autoScroll)}
          >
            <label className="mock-interview-toggle-label">Auto-Scroll</label>
            <div className="mock-interview-toggle-switch">
              <div className={`mock-interview-toggle-track ${autoScroll ? 'active' : ''}`}></div>
              <div className={`mock-interview-toggle-thumb ${autoScroll ? 'active' : ''}`}></div>
            </div>
          </div>
        </div>

        <div
          className="mock-interview-transcript-log"
          ref={transcriptLogRef}
        >
          {conversation.length === 0 ? (
            <div className="conversation-empty-state">
              <MessageSquareDashed size={40} color="#94A3B8" style={{ marginBottom: "1rem" }} />
              <h3 className="empty-heading">Let's get this conversation started</h3>
              <p className="empty-subtext">
                Once you hit <strong>Start Interview</strong>, we will begin asking you questions. You'll see your conversation right here.
              </p>
              <div className="empty-tip">
                <Lightbulb size={18} strokeWidth={1.75} style={{ marginRight: "6px" }} />
                Speak clearly — like you would in a real interview.              </div>
            </div>
          ) : (
            conversation.map((item, index) => (
              <div
                key={index}
                className={`mock-interview-message ${item.type === 'question' ? 'mock-interview-message--ai' : 'mock-interview-message--user'}`}
              >
                <div className="mock-interview-message-content">
                  <MarkdownRenderer answer={item.content} />
                </div>
              </div>
            ))
          )}


          {isThinking && (
            <div className="mock-interview-thinking-indicator">
              <div className="mock-interview-typing-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <span>Interviewer is thinking</span>
            </div>
          )}
        </div>
      </div>

      {showInstructionModal && (
        <div className="mock-interview-instruction-modal">
          <div className="mock-interview-instruction-content">
            <div className="mock-interview-instruction-header">
              <h2>Interview Preparation Guidelines</h2>
            </div>
            <div className="mock-interview-instruction-body">
              {isStartingInterview ? (
                <div className="mock-interview-starting-container">
                  <div className="mock-interview-starting-loader">
                    <Loader2 className="animate-spin" size={32} />
                  </div>
                  <h3 className="mock-interview-starting-text">
                    Preparing your interview session...
                  </h3>
                  <div className="mock-interview-countdown">
                    Starting in {countdown} seconds
                  </div>
                  <div className="mock-interview-progress-container">
                    <div
                      className="mock-interview-progress-bar"
                      style={{ width: `${(10 - countdown) * 10}%` }}
                    ></div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mock-interview-instruction-section">
                    <h3><Lightbulb size={18} className="mock-interview-instruction-icon" /> Before You Begin</h3>
                    <ul>
                      <li>Ensure you're in a <b>quiet environment</b> with minimal background noise</li>
                      <li><b>Use headphones</b> for best audio quality</li>
                      <li>Prepare as you would for a real interview</li>
                    </ul>
                  </div>

                  <div className="mock-interview-instruction-section">
                    <h3><Headphones size={18} className="mock-interview-instruction-icon" /> During the Interview</h3>
                    <ul>
                      <li><b>Speak clearly</b> and at a moderate pace</li>
                      <li>Allow the AI to finish speaking before responding</li>
                      <li>Natural pauses (<b>above 5 seconds</b>) will trigger response processing</li>
                    </ul>
                  </div>

                  <div className="mock-interview-terms-section">
                    <div className="mock-interview-terms-checkbox">
                      <input
                        type="checkbox"
                        id="acceptTerms"
                        checked={termsAccepted}
                        onChange={(e) => setTermsAccepted(e.target.checked)}
                      />
                      <label htmlFor="acceptTerms">
                        I agree to the Terms of Service and acknowledge that this is a mock interview simulation.
                      </label>
                    </div>

                    <div className="mock-interview-terms-links">
                      <a href="/terms" target="_blank" rel="noopener noreferrer">Terms of Service</a>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="mock-interview-instruction-footer">
              {isStartingInterview ? (
                <button
                  className="mock-interview-start-button mock-interview-start-button--loading"
                  disabled
                >
                  <Loader2 className="animate-spin" size={18} style={{ marginRight: "8px" }} />
                  Preparing Interview...
                </button>
              ) : (
                <button
                  className="mock-interview-start-button"
                  disabled={!termsAccepted}
                  onClick={handleStartInterview}
                >
                  <Rocket size={18} className="mock-interview-start-icon" />
                  Begin Interview
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showEndConfirmation && (
        <div className="mock-interview-confirmation-modal">
          <div className="mock-interview-confirmation-content">
            <h3>End Interview Session?</h3>
            <p>Are you sure you want to end this interview?</p>

            <div className="mock-interview-confirmation-buttons">
              <button
                className="mock-interview-confirm-button"
                onClick={async () => {
                  setShowEndConfirmation(false);
                  await completeInterview();
                }}
              >
                Yes, End Interview
              </button>

              <button
                className="mock-interview-cancel-button"
                onClick={() => setShowEndConfirmation(false)}
              >
                No, Continue Interview
              </button>
            </div>
          </div>
        </div>
      )}

      {showClosingCountdown && (
        <div className="mock-interview-closing-modal">
          <div className="mock-interview-closing-content">
            <div className="mock-interview-closing-icon">
              <CheckCircle size={48} className="text-success" />
            </div>
            <h3 className="mock-interview-closing-title">Interview Completed</h3>
            <p className="mock-interview-closing-subtext">
              Mock interview has been completed. Auto-closing in {closingCountdown} seconds...
            </p>
            <div className="mock-interview-closing-progress-container">
              <div
                className="mock-interview-closing-progress-bar"
                style={{ width: `${(10 - closingCountdown) * 10}%` }}
              ></div>
            </div>

            <div className="mock-interview-closing-actions">
              <button
                className="mock-interview-closing-button"
                onClick={() => {
                  setShowClosingCountdown(false);
                  completeInterview();
                }}
              >
                End Meeting Now
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default MockInterview;