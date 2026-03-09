import React, { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import logo from "../images/logo_bg.png";
import profile_pic from "../images/user_placeholder.png";
import { db } from "../firebase/config";
import "../styles/question-vault.css";
import axios from "axios";
import InterviewExperience from "./interview-experience.js"

import {
  ChevronDown,
  Menu,
  X,
  User,
  CreditCard,
  LogOut,
  Search,
  Filter,
  Bookmark,
  Copy,
  ChevronUp,
  ChevronDown as ChevronDownIcon,
  Hash,
  Briefcase,
  Building,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  Tag,
  HelpCircle,
  UserCog,
  Clock,
  MessageSquare,
} from "lucide-react";
import { getStorage, ref, getDownloadURL, listAll } from "firebase/storage";
import { deleteField, doc, setDoc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import "../styles/tag-manager.css";


const QuestionCard = ({ question, index, expandedQuestion, toggleQuestionExpand, savedQuestions, toggleSaveQuestion, userPlan }) => (
  <div
    key={question.Index}
    className={`qv-question-card ${expandedQuestion === index ? 'qv-expanded' : ''}`}
  >
    <div
      className="qv-question-header"
      onClick={() => toggleQuestionExpand(index)}
    >
      <div className="qv-question-meta">
        {question.Difficulty && (
          <span className={`qv-question-difficulty ${question.Difficulty.toLowerCase()}`}>
            {question.Difficulty}
          </span>
        )}
        {question.Category && (
          <span className="qv-question-type">
            <Tag size={14} /> {question.Category}
          </span>
        )}
      </div>
      <h3 className="qv-question-text">{question.Question}</h3>

      {question.Company && (
        <div className="qv-company-tags">
          {question.Company.split(',').map((company, i) => (
            <span key={i} className="qv-company-tag">
              {company.trim()}
            </span>
          ))}
        </div>
      )}

      <div className="qv-question-actions-header">
        <div className="qv-save-question-container">
          <button
            className={`qv-save-question ${savedQuestions[question.Question] ? 'qv-saved' : ''} ${userPlan?.planId === 'free' ? 'qv-save-disabled' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              toggleSaveQuestion(question);
            }}
            title={userPlan?.planId === 'free' ? 'Upgrade to save questions' : savedQuestions[question.Question] ? 'Remove from saved' : 'Save question'}
            disabled={userPlan?.planId === 'free'}
          >
            <Bookmark
              size={18}
              fill={savedQuestions[question.Question] ? "currentColor" : "none"}
            />
          </button>
          &nbsp;
          {expandedQuestion === index ? (
            <ChevronUp size={20} className="qv-expand-icon" />
          ) : (
            <ChevronDown size={20} className="qv-expand-icon" />
          )}
        </div>
      </div>
    </div>

    {expandedQuestion === index && (
      <div className="qv-question-details">
        <div className="qv-question-meta-details">
          {question.Topic && (
            <div className="qv-meta-item">
              <span className="qv-meta-label">Short Answer:</span>
              <span className="qv-meta-value">{question.Answer1}</span>
            </div>
          )}
          {question.Role && (
            <div className="qv-meta-item">
              <span className="qv-meta-label">Detailed Answer:</span>
              <span className="qv-meta-value">{question.Answer2}</span>
            </div>
          )}
          {question.UpdatedAt && (
            <div className="qv-meta-item">
              <span className="qv-meta-label">Updated:</span>
              <span className="qv-meta-value">
                <Clock size={14} /> {new Date(question.UpdatedAt).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      </div>
    )}
  </div>
);


const QuestionVault = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const componentRef = useRef(null);
  const dropdownRef = useRef(null);
  const [userName, setUserName] = useState(localStorage.getItem("userName") || "");
  const [userPhoto, setUserPhoto] = useState("");
  const [userPlan, setUserPlan] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [activeTab, setActiveTab] = useState('questions'); // 'questions' or 'experience'

  // Question vault state
  const [questions, setQuestions] = useState([]);
  const [filteredQuestions, setFilteredQuestions] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedTopic, setSelectedTopic] = useState("all");
  const [selectedCompany, setSelectedCompany] = useState("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState("all");
  const [selectedRole, setSelectedRole] = useState("all");
  const [selectedTags, setSelectedTags] = useState([]);
  const [userTags, setUserTags] = useState([]);
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [expandedQuestion, setExpandedQuestion] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savedQuestions, setSavedQuestions] = useState({});
  const backend_url = process.env.REACT_APP_BACKEND_URL;
  const [user, setUser] = useState(null);
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const itemsPerPageOptions = [20, 50, 100];

  // Calculate pagination values
  const totalItems = filteredQuestions.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);


  const [toastTimeout, setToastTimeout] = useState(null);
  const [showTagModal, setShowTagModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const currentQuestions = filteredQuestions.slice(startIndex, endIndex);
  const [hoveredQuestion, setHoveredQuestion] = useState(null);


  // Helper function to encode question for Firestore path
  const encodeQuestionId = (question) => {
    return encodeURIComponent(question.replace(/[.#$/[\]]/g, '_'));
  };

  useEffect(() => {
    const handleScroll = () => {
      if (userPlan?.planId === 'free') {
        const scrollPosition = window.scrollY + window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;

        // Show prompt when user scrolls near bottom
        if (scrollPosition > documentHeight - 300) {
          setShowUpgradePrompt(true);
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [userPlan]);

  const handlePageChangeForFreeUsers = (newPage) => {
    if (userPlan?.planId === 'free' && newPage > 1) {
      setShowUpgradePrompt(true);
    } else {
      handlePageChange(newPage);
    }
  };
  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Handle items per page change
  const handleItemsPerPageChange = (value) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  useEffect(() => {
    const fetchUserPlan = async () => {
      const email = localStorage.getItem("userEmail");
      const name = localStorage.getItem("userName");
      const photo = localStorage.getItem("userPhoto");

      if (!email) {
        setLoadingPlan(false);
        return;
      }

      setUser({ email, name, photo });

      try {
        const userPlanRef = doc(db, "userPlans", email);
        const docSnap = await getDoc(userPlanRef);

        if (docSnap.exists()) {
          setUserPlan(docSnap.data());
        } else {
          const currentDate = new Date();
          const freePlan = {
            email,
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
            startDate: currentDate.toLocaleDateString("en-GB"),
            endDate: new Date(currentDate.setFullYear(currentDate.getFullYear() + 80)).toLocaleDateString("en-GB"),
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

  // Fetch questions and user's saved questions
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${backend_url}/api/questions`);
        setQuestions(response.data);

        if (user?.email) {
          await fetchSavedQuestions(user.email);
          await fetchUserTags(user.email);
        }
      } catch (err) {
        setError("Failed to load questions. Please try again later.");
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const fetchSavedQuestions = async (userEmail) => {
    if (!userEmail) return;

    try {
      const savedRef = doc(db, 'userBookmarks', userEmail);
      const docSnap = await getDoc(savedRef);

      if (docSnap.exists()) {
        const bookmarks = docSnap.data().bookmarks || {};
        // Create a mapping of encoded question IDs to their original questions
        const decodedBookmarks = {};
        Object.entries(bookmarks).forEach(([encodedId, data]) => {
          const questionId = decodeURIComponent(encodedId);
          decodedBookmarks[questionId] = data;
        });
        setSavedQuestions(decodedBookmarks);
      }
    } catch (error) {
      console.error('Error fetching saved questions:', error);
    }
  };

  const fetchUserTags = async (userEmail) => {
    if (!userEmail) return;
    const tagsRef = doc(db, "userTags", userEmail);
    const docSnap = await getDoc(tagsRef);

    if (docSnap.exists()) {
      setUserTags(docSnap.data().tags || []);
    }
  };

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedType, selectedTopic, selectedCompany, selectedDifficulty, selectedRole]);

  // Extract unique values for filters
  const categories = [...new Set(questions.map(q => q.Category))];
  const companies = [...new Set(questions.flatMap(q => q.Company ? q.Company.split(',').map(c => c.trim()) : []))].filter(c => c);
  const difficulties = [...new Set(questions.map(q => q.Difficulty))];

  // Filter questions based on search, filters, and tags
  useEffect(() => {
    let filtered = questions;

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(q =>
        q.Question.toLowerCase().includes(searchLower) ||
        (q.Category && q.Category.toLowerCase().includes(searchLower)) ||
        (q.Difficulty && q.Difficulty.toLowerCase().includes(searchLower)) ||
        (q.Company && q.Company.toLowerCase().includes(searchLower)) ||
        (q.Topic && q.Topic.toLowerCase().includes(searchLower)) ||
        (q.Role && q.Role.toLowerCase().includes(searchLower))
      );
    }

    if (selectedType !== "all") {
      filtered = filtered.filter(q => q.Category === selectedType);
    }

    if (selectedTopic !== "all") {
      filtered = filtered.filter(q =>
        q.Topic && q.Topic.split(',').some(t => t.trim() === selectedTopic)
      );
    }

    if (selectedCompany !== "all") {
      filtered = filtered.filter(q =>
        q.Company && q.Company.split(',').some(c => c.trim() === selectedCompany)
      );
    }

    if (selectedDifficulty !== "all") {
      filtered = filtered.filter(q => q.Difficulty === selectedDifficulty);
    }

    if (selectedRole !== "all") {
      filtered = filtered.filter(q =>
        q.Role && q.Role.split(',').some(r => r.trim() === selectedRole)
      );
    }

    // Filter by saved questions if showSavedOnly is true
    if (showSavedOnly && user) {
      const savedQuestionIds = Object.keys(savedQuestions);
      filtered = filtered.filter(q => savedQuestionIds.includes(q.Question));
    }

    // Filter by selected tags if any
    if (selectedTags.length > 0) {
      filtered = filtered.filter(q => {
        const questionTags = savedQuestions[q.Question]?.tags || [];
        return selectedTags.every(tag => questionTags.includes(tag));
      });
    }

    setFilteredQuestions(filtered);
  }, [searchTerm, selectedType, selectedTopic, selectedCompany, selectedDifficulty,
    selectedRole, questions, showSavedOnly, selectedTags, savedQuestions, user]);


  useEffect(() => {
    return () => {
      if (toastTimeout) {
        clearTimeout(toastTimeout);
      }
    };
  }, [toastTimeout]);


  const topics = [...new Set(
    questions.flatMap(q =>
      q.Topic ? q.Topic.split(',').map(t => t.trim()) : []
    )
  )].filter(t => t);

  const roles = [...new Set(
    questions.flatMap(q =>
      q.Role ? q.Role.split(',').map(r => r.trim()) : []
    )
  )].filter(r => r);

  // Get unique tags from saved questions for filtering
  const allSavedTags = [...new Set(
    Object.values(savedQuestions).flatMap(item => item.tags || [])
  )];

  // Count tag occurrences for the filter
  const tagCounts = {};
  Object.values(savedQuestions).forEach(item => {
    (item.tags || []).forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });

  const resetFilters = () => {
    setSearchTerm("");
    setSelectedType("all");
    setSelectedTopic("all");
    setSelectedCompany("all");
    setSelectedDifficulty("all");
    setSelectedRole("all");
    setSelectedTags([]);
    setShowSavedOnly(false);
  };

  const toggleQuestionExpand = (index) => {
    setExpandedQuestion(expandedQuestion === index ? null : index);
  };

  const toggleSaveQuestion = async (question) => {
    if (userPlan?.planId === 'free') {
      showToastMessage("Please upgrade to save questions");
      return;
    }

    if (!user) {
      showToastMessage("Please sign in to save questions");
      return;
    }

    const questionId = question.Question;
    const encodedId = encodeQuestionId(questionId);
    const isSaved = !!savedQuestions[questionId];
    const userEmail = user.email;

    try {
      const userBookmarkRef = doc(db, 'userBookmarks', userEmail);

      if (isSaved) {
        // Remove from saved
        await updateDoc(userBookmarkRef, {
          [`bookmarks.${encodedId}`]: deleteField()
        });

        setSavedQuestions(prev => {
          const newSaved = { ...prev };
          delete newSaved[questionId];
          return newSaved;
        });

        showToastMessage("Question removed from saved");
      } else {
        // Add to saved with default tag
        const userTagsRef = doc(db, 'userTags', userEmail);
        const tagDoc = await getDoc(userTagsRef);
        const lastUsedTag = tagDoc.exists() && tagDoc.data().lastUsedTag ?
          tagDoc.data().lastUsedTag : 'General';

        const bookmarkData = {
          tags: [lastUsedTag],
          savedAt: new Date().toISOString()
        };

        await setDoc(userBookmarkRef, {
          bookmarks: {
            [encodedId]: bookmarkData
          }
        }, { merge: true });

        setSavedQuestions(prev => ({
          ...prev,
          [questionId]: bookmarkData
        }));

        if (!userTags.includes(lastUsedTag)) {
          await setDoc(userTagsRef, {
            tags: arrayUnion(lastUsedTag),
            lastUsedTag: lastUsedTag
          }, { merge: true });
          setUserTags(prev => [...prev, lastUsedTag]);
        }

        showToastMessage(`Question saved to "${lastUsedTag}"`, questionId, lastUsedTag);
      }
    } catch (error) {
      console.error('Error updating saved questions:', error);
      showToastMessage("Failed to update saved questions");
    }
  };

  const updateQuestionTags = async (questionId, tags) => {
    if (!user) return;

    try {
      const encodedId = encodeQuestionId(questionId);
      const userBookmarkRef = doc(db, 'userBookmarks', user.email);
      const userTagsRef = doc(db, 'userTags', user.email);

      if (tags.length === 0) {
        await updateDoc(userBookmarkRef, {
          [`bookmarks.${encodedId}`]: deleteField()
        });

        setSavedQuestions(prev => {
          const newSaved = { ...prev };
          delete newSaved[questionId];
          return newSaved;
        });

        showToastMessage("Question removed from saved");
      } else {
        const bookmarkData = {
          tags: [...new Set(tags)],
          updatedAt: new Date().toISOString()
        };

        await setDoc(userBookmarkRef, {
          bookmarks: {
            [encodedId]: bookmarkData
          }
        }, { merge: true });

        setSavedQuestions(prev => ({
          ...prev,
          [questionId]: bookmarkData
        }));

        const lastTag = tags[tags.length - 1];
        await setDoc(userTagsRef, {
          lastUsedTag: lastTag
        }, { merge: true });

        showToastMessage("Tags updated successfully");
      }
    } catch (error) {
      console.error('Error updating tags:', error);
      showToastMessage("Failed to update tags");
    }
  };

  const toggleTagFilter = (tag) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const clearTagFilters = () => {
    setSelectedTags([]);
    setShowSavedOnly(false);
  };

  const showToastMessage = (message, questionId = null, currentTag = '') => {
    // Clear any existing timeout
    if (toastTimeout) {
      clearTimeout(toastTimeout);
    }

    setToastMessage(message);
    setShowToast(true);

    if (questionId) {
      setEditingQuestion({
        id: questionId,
        currentTag: currentTag
      });
    } else {
      setEditingQuestion(null);
    }

    // Set new timeout and store its reference
    const timeout = setTimeout(() => {
      setShowToast(false);
    }, 5000);
    setToastTimeout(timeout);
  };

  const navigateToHome = () => {
    navigate("/home", { state: { activeTab: 'home' } });
  };

  const navigateToSubscription = () => {
    navigate("/home", {
      state: { activeTab: 'subscription' },
      replace: true
    });
  };

  const navigateToAccount = () => {
    navigate("/home", {
      state: { activeTab: 'account' },
      replace: true
    });
  };

  const handleLogout = () => {
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userName");
    localStorage.removeItem("userPhoto");
    localStorage.clear();
    window.location.reload();
  };

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
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "auto";
  }, [mobileMenuOpen]);

  useEffect(() => {
    const fetchUserPhoto = async () => {
      const email = localStorage.getItem("userEmail");
      if (!email) return;

      const storage = getStorage();
      const photoRef = ref(storage, `profile_pics/${email}.png`);

      try {
        const listRef = ref(storage, "profile_pics");
        const files = await listAll(listRef);
        const exists = files.items.some(item => item.name === `${email}.png`);

        if (exists) {
          const url = await getDownloadURL(photoRef);
          setUserPhoto(url);
        } else {
          setUserPhoto(profile_pic);
        }
      } catch (err) {
        console.error("Error fetching profile photo:", err);
        setUserPhoto(profile_pic);
      }
    };

    fetchUserPhoto();
  }, []);

  const handleTagUpdate = async (newTag) => {
    if (!editingQuestion || !newTag.trim()) return;

    try {
      const encodedId = encodeQuestionId(editingQuestion.id);
      const userBookmarkRef = doc(db, 'userBookmarks', user.email);
      const userTagsRef = doc(db, 'userTags', user.email);

      // Update the question's tag
      await updateDoc(userBookmarkRef, {
        [`bookmarks.${encodedId}.tags`]: [newTag.trim()],
        [`bookmarks.${encodedId}.updatedAt`]: new Date().toISOString()
      }, { merge: true });

      // Update last used tag
      await setDoc(userTagsRef, {
        lastUsedTag: newTag.trim(),
        tags: arrayUnion(newTag.trim())
      }, { merge: true });

      // Update local state
      setSavedQuestions(prev => ({
        ...prev,
        [editingQuestion.id]: {
          ...prev[editingQuestion.id],
          tags: [newTag.trim()],
          updatedAt: new Date().toISOString()
        }
      }));

      // Update user tags if not exists
      if (!userTags.includes(newTag.trim())) {
        setUserTags(prev => [...prev, newTag.trim()]);
      }

      showToastMessage(`Tag updated to "${newTag}"`);
      setShowTagModal(false);
    } catch (error) {
      console.error('Error updating tag:', error);
      showToastMessage('Failed to update tag');
    }
  };

  const CustomDropdown = ({ label, options, value, onChange, placeholder }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const filteredOptions = options
      .filter(option => option.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => a.localeCompare(b));

    useEffect(() => {
      const handleClickOutside = (event) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
          setIsOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
      <div className="qv-filter-group" ref={dropdownRef}>
        <label>{label}</label>
        <div className="qv-custom-dropdown">
          <div
            className="qv-dropdown-header"
            onClick={() => setIsOpen(!isOpen)}
          >
            {value === 'all' ? placeholder : value}
            <ChevronDown size={16} />
          </div>
          {isOpen && (
            <div className="qv-dropdown-content">
              <div className="qv-search-within-dropdown">
                <Search size={14} />
                <input
                  type="text"
                  placeholder={`Search ${label.toLowerCase()}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="qv-dropdown-options">
                <div
                  className={`qv-dropdown-option ${value === 'all' ? 'qv-selected' : ''}`}
                  onClick={() => {
                    onChange('all');
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                >
                  All {label}
                </div>
                {filteredOptions.map(option => (
                  <div
                    key={option}
                    className={`qv-dropdown-option ${value === option ? 'qv-selected' : ''}`}
                    onClick={() => {
                      onChange(option);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                  >
                    {option}
                  </div>
                ))}
                {filteredOptions.length === 0 && (
                  <div className="qv-no-results">No results found</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="qv-container">
      <header className="header" ref={componentRef}>
        <div className="header-content">
          <div className="logo-wrapper">
            <div className="logo">
              <img src={logo} alt="Logo" style={{ width: 40, height: 40 }} />
              <span className="logo-text">Voizon</span>
              {!loadingPlan && userPlan && userPlan.planId !== 'free' && (
                <div
                  className={`plan-tag ${userPlan.planId}`}
                  role="button"
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
                    className={`dropdown-menu ${profileDropdownOpen ? "open" : ""}`}
                  >
                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        navigateToAccount();
                      }}
                    >
                      <User size={16} /> Manage Account
                    </button>
                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        navigateToSubscription();
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
              className="nav-link"
              onClick={(e) => {
                setMobileMenuOpen(false);
                e.preventDefault();
                navigate("/home");
              }}
            >
              Home
            </a>
            <a
              className="nav-link activee"
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
                  className={`dropdown-menu ${profileDropdownOpen ? "open" : ""}`}
                >
                  <button
                    className="dropdown-item"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setProfileDropdownOpen(false);
                      navigate("/home?tab=profile");
                    }}
                  >
                    <User size={16} /> Manage Account
                  </button>
                  <button
                    className="dropdown-item"
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      navigate("/home?tab=plans");
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

      {/* <div className="qv-tabs">
        <button
          className={`qv-tab ${activeTab === 'questions' ? 'qv-tab-active' : ''}`}
          onClick={() => setActiveTab('questions')}
        >
          <Search size={16} /> Question Vault
        </button>
        <button
          className={`qv-tab ${activeTab === 'experience' ? 'qv-tab-active' : ''}`}
          onClick={() => setActiveTab('experience')}
        >
          <MessageSquare size={16} /> Interview Experience
        </button>
      </div> */}
      {activeTab === 'questions' ? (
      <main className="qv-main">
        <div className="qv-header">
          <h1>🧠 Fuel Your Brain. Ace That Interview.</h1>
          <p>Access a curated collection of interview questions from top companies</p>
        </div>

        <div className="qv-controls">
          <div className="qv-search-bar">
            <Search className="qv-search-icon" size={20} />
            <input
              type="text"
              placeholder="Search questions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                className="qv-clear-search"
                onClick={() => setSearchTerm("")}
              >
                <X size={18} />
              </button>
            )}
          </div>

          <div className="qv-control-buttons">
            <button
              className={`qv-save-filter-toggle ${showSavedOnly ? 'qv-active' : ''}`}
              onClick={() => setShowSavedOnly(!showSavedOnly)}
              title={showSavedOnly ? "Show all questions" : "Show saved questions only"}
            >
              <Bookmark size={16} fill={showSavedOnly ? "currentColor" : "none"} />
              {showSavedOnly ? "All Questions" : "Saved"}
            </button>
            <button
              className={`qv-filter-toggle ${showFilters ? 'qv-active' : ''}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter size={16} />
              Filters
              {showFilters ? <ChevronUp size={16} /> : <ChevronDownIcon size={16} />}
            </button>
            <button
              className="qv-reset-filters"
              onClick={resetFilters}
              disabled={
                searchTerm === "" &&
                selectedType === "all" &&
                selectedTopic === "all" &&
                selectedCompany === "all" &&
                selectedDifficulty === "all" &&
                selectedRole === "all" &&
                selectedTags.length === 0 &&
                !showSavedOnly
              }
            >
              Reset
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="qv-filters">
            <CustomDropdown
              label="Category"
              options={categories}
              value={selectedType}
              onChange={setSelectedType}
              placeholder="All Categories"
            />

            <CustomDropdown
              label="Topic"
              options={topics}
              value={selectedTopic}
              onChange={setSelectedTopic}
              placeholder="All Topics"
            />

            <CustomDropdown
              label="Company"
              options={companies}
              value={selectedCompany}
              onChange={setSelectedCompany}
              placeholder="All Companies"
            />

            <CustomDropdown
              label="Role"
              options={roles}
              value={selectedRole}
              onChange={setSelectedRole}
              placeholder="All Roles"
            />

            <div className="qv-filter-group">
              <label>Difficulty</label>
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
              >
                <option value="all">All Difficulties</option>
                {difficulties
                  .sort((a, b) => a.localeCompare(b))
                  .map(difficulty => (
                    <option key={difficulty} value={difficulty}>
                      {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        )}

        {loading ? (
          <div className="qv-loading-state">
            <Loader2 size={32} className="qv-spinner" />
            <p>Loading questions...</p>
          </div>
        ) : error ? (
          <div className="qv-error-state">
            <AlertCircle size={32} />
            <p>{error}</p>
            <button
              className="qv-retry-button"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            <div className="qv-stats">
              <div className="qv-stat-card">
                <Hash size={20} />
                <span>{totalItems} Questions</span>
              </div>
              <div className="qv-stat-card">
                <Briefcase size={20} />
                <span>{new Set(questions.flatMap(q => q.Company ? q.Company.split(',').map(c => c.trim()) : [])).size} Companies</span>
              </div>
              <div className="qv-stat-card">
                <Building size={20} />
                <span>{topics.length} Topics</span>
              </div>
              <div className="qv-stat-card">
                <UserCog size={20} />
                <span>{roles.length} Roles</span>
              </div>
              {user && (
                <div className="qv-stat-card">
                  <Bookmark size={20} />
                  <span>{Object.keys(savedQuestions).length} Saved</span>
                </div>
              )}
            </div>

            {/* Tag filters */}
            {(showSavedOnly || selectedTags.length > 0) && (
              <div className="qv-tag-filter-container">
                <div className="qv-tag-filter-header">
                  <div className="qv-tag-filter-title">
                    {selectedTags.length > 0
                      ? `Filtered by ${selectedTags.length} tag${selectedTags.length !== 1 ? 's' : ''}`
                      : 'Filter by Tag'}
                  </div>
                  {(selectedTags.length > 0 || showSavedOnly) && (
                    <button
                      className="qv-tag-filter-clear"
                      onClick={clearTagFilters}
                    >
                      Clear all
                    </button>
                  )}
                </div>

                {allSavedTags.length > 0 && (
                  <div className="qv-tag-filters">
                    {allSavedTags.map(tag => (
                      <button
                        key={tag}
                        className={`qv-tag-filter ${selectedTags.includes(tag) ? 'qv-active' : ''}`}
                        onClick={() => toggleTagFilter(tag)}
                      >
                        {tag}
                        <span className="qv-tag-filter-count">{tagCounts[tag] || 0}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className={`qv-pagination-controls-top ${userPlan?.planId === 'free' ? 'qv-free-plan-pagination-disabled' : ''}`}>              <div className="qv-items-per-page-selector">
              <label>Show:</label>
              <select
                value={itemsPerPage}
                onChange={(e) => handleItemsPerPageChange(e.target.value)}
              >
                {itemsPerPageOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <span>items per page</span>
            </div>
              <div className="qv-pagination-info">
                Showing {startIndex + 1}-{endIndex} of {totalItems} questions
              </div>
            </div>

            <div className="qv-questions-list">
              {currentQuestions.length === 0 ? (
                <div className="qv-no-results">
                  <HelpCircle size={48} className="qv-alert-icon" />
                  <h3>No questions found</h3>
                  <p>Try adjusting your search or filters to find what you're looking for.</p>
                  <button
                    className="qv-reset-filters"
                    onClick={resetFilters}
                  >
                    Reset all filters
                  </button>
                </div>
              ) : (
                <>
                  {userPlan?.planId !== 'free' && currentQuestions.map((question, index) => (
                    <QuestionCard
                      question={question}
                      index={index}
                      expandedQuestion={expandedQuestion}
                      toggleQuestionExpand={toggleQuestionExpand}
                      savedQuestions={savedQuestions}
                      toggleSaveQuestion={toggleSaveQuestion}
                      userPlan={userPlan}
                    />
                  ))}

                  {/* For free users, show first 10 normal questions + 2 blurred */}
                  {userPlan?.planId === 'free' && (
                    <>
                      {currentQuestions.slice(0, 10).map((question, index) => (
                        <QuestionCard
                          question={question}
                          index={index}
                          expandedQuestion={expandedQuestion}
                          toggleQuestionExpand={toggleQuestionExpand}
                          savedQuestions={savedQuestions}
                          toggleSaveQuestion={toggleSaveQuestion}
                          userPlan={userPlan}
                        />
                      ))}

                      {/* Blurred questions section */}
                      {currentQuestions.length > 10 && (
                        <>
                          {currentQuestions.slice(10, 12).map((question, index) => (
                            <div
                              key={question.Index}
                              className="qv-question-card qv-blurred-question"
                              onClick={() => setShowUpgradePrompt(true)}
                            >
                              <div className="qv-question-header">
                                <div className="qv-question-meta">
                                  {question.Difficulty && (
                                    <span className={`qv-question-difficulty ${question.Difficulty.toLowerCase()}`}>
                                      {question.Difficulty}
                                    </span>
                                  )}
                                  {question.Category && (
                                    <span className="qv-question-type">
                                      <Tag size={14} /> Hidden
                                    </span>
                                  )}
                                </div>
                                <h3 className="qv-question-text">This question is hidden. Please upgrade your plan to view the full content.</h3>
                              </div>
                            </div>
                          ))}

                          {/* Upgrade prompt section */}
                          {currentQuestions.length > 12 && (
                            <div className="qv-upgrade-section">
                              <div className="qv-upgrade-content">
                                <h3>Unlock Full Question Vault</h3>
                                <p>Upgrade to view all {filteredQuestions.length} questions and access premium features</p>
                                <button
                                  className="qv-upgrade-button"
                                  onClick={() => navigate("/home?tab=plans")}
                                >
                                  Upgrade Plan
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}
                </>
              )}
            </div>

            <div className={`qv-pagination-controls-bottom ${userPlan?.planId === 'free' ? 'qv-free-plan-pagination-disabled' : ''}`}>              <div className="qv-items-per-page-selector">
              <label>Show:</label>
              <select
                value={itemsPerPage}
                onChange={(e) => handleItemsPerPageChange(e.target.value)}
              >
                {itemsPerPageOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <span>items per page</span>
            </div>

              <div className="qv-pagination-navigation">
                <button
                  className="qv-pagination-button"
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft size={16} />
                  <ChevronLeft size={16} style={{ marginLeft: -8 }} />
                </button>
                <button
                  className="qv-pagination-button"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft size={16} />
                </button>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      className={`qv-pagination-button ${currentPage === pageNum ? 'qv-active' : ''}`}
                      onClick={() => handlePageChange(pageNum)}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                {totalPages > 5 && currentPage < totalPages - 2 && (
                  <span className="qv-pagination-ellipsis">...</span>
                )}

                {totalPages > 5 && currentPage < totalPages - 2 && (
                  <button
                    className={`qv-pagination-button ${currentPage === totalPages ? 'qv-active' : ''}`}
                    onClick={() => handlePageChange(totalPages)}
                  >
                    {totalPages}
                  </button>
                )}

                <button
                  className="qv-pagination-button"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages || totalPages === 0}
                >
                  <ChevronRightIcon size={16} />
                </button>
                <button
                  className="qv-pagination-button"
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages || totalPages === 0}
                >
                  <ChevronRightIcon size={16} />
                  <ChevronRightIcon size={16} style={{ marginLeft: -8 }} />
                </button>
              </div>

              <div className="qv-pagination-info">
                Page {currentPage} of {totalPages || 1}
              </div>
            </div>
          </>
        )}

        {showToast && (
          <div className="qv-toast">
            <div className="qv-toast-message">
              {toastMessage}
              {editingQuestion && (
                <button
                  className="qv-change-tag-link"
                  onClick={() => {
                    setShowToast(false);
                    setShowTagModal(true);
                  }}
                >
                  Change
                </button>
              )}
            </div>
            <button
              className="qv-toast-close"
              onClick={() => setShowToast(false)}
            >
              ×
            </button>
          </div>
        )}

        {/* Add this modal for tag editing */}
        {showTagModal && editingQuestion && (
          <div className="qv-tag-modal-overlay">
            <div className="qv-tag-modal">
              <div className="qv-modal-header">
                <h3>Organize Question</h3>
                <button
                  className="qv-modal-close-btn"
                  onClick={() => setShowTagModal(false)}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="qv-modal-body">
                <div className="qv-tag-input-section">
                  <div className="qv-input-with-icon">
                    <Tag size={18} className="qv-input-icon" />
                    <input
                      type="text"
                      value={editingQuestion.currentTag}
                      onChange={(e) => {
                        setEditingQuestion(prev => ({
                          ...prev,
                          currentTag: e.target.value
                        }));
                      }}
                      placeholder="Create or select tag"
                      className="qv-premium-input"
                      autoFocus
                    />
                  </div>

                  {editingQuestion.currentTag && (
                    <div className="qv-suggested-tags">
                      <div className="qv-suggested-tags-header">
                        <span>Suggested Tags</span>
                        <span>({userTags.filter(tag =>
                          tag.toLowerCase().includes(editingQuestion.currentTag.toLowerCase())
                        ).length} matches)</span>
                      </div>

                      <div className="qv-tags-grid">
                        {userTags
                          .filter(tag =>
                            tag.toLowerCase().includes(editingQuestion.currentTag.toLowerCase())
                          )
                          .map(tag => (
                            <button
                              key={tag}
                              className={`qv-tag-pill ${editingQuestion.currentTag === tag ? 'qv-active' : ''}`}
                              onClick={() => {
                                setEditingQuestion(prev => ({
                                  ...prev,
                                  currentTag: tag
                                }));
                              }}
                            >
                              {tag}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="qv-your-tags-section">
                  <h4>Your Tags</h4>
                  {userTags.length > 0 ? (
                    <div className="qv-tags-grid">
                      {userTags.map(tag => (
                        <button
                          key={tag}
                          className={`qv-tag-pill ${editingQuestion.currentTag === tag ? 'qv-active' : ''}`}
                          onClick={() => {
                            setEditingQuestion(prev => ({
                              ...prev,
                              currentTag: tag
                            }));
                          }}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="qv-no-tags-message">You haven't created any tags yet</p>
                  )}
                </div>
              </div>

              <div className="qv-modal-footer">
                <button
                  className="qv-secondary-btn"
                  onClick={() => setShowTagModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="qv-primary-btn"
                  onClick={() => {
                    handleTagUpdate(editingQuestion.currentTag);
                    setShowTagModal(false);
                  }}
                  disabled={!editingQuestion.currentTag.trim()}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    ) : (
      <InterviewExperience />
    )}
    </div>
  );
};

export default QuestionVault;