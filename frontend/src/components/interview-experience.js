import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css';
import "../styles/interview-experience.css";
import { v4 as uuidv4 } from 'uuid';

import {
  Search,
  AlertCircle,
  HelpCircle,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  X,
  Clock,
  Star,
  HardHat,
  Briefcase,
  Calendar,
  Loader2,
  Sparkles,
  CircleAlert,
  ArrowRight,
  ExternalLink,
  Filter,
  BarChart2,
  User,
  Award,
  CheckCircle,
  Clock as TimeIcon
} from 'lucide-react';

const backend_url = process.env.REACT_APP_BACKEND_URL;

const QuestionItem = ({ question, answerPrompt, onAskAI }) => {
  const [aiAnswer, setAiAnswer] = useState(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [questionExpanded, setQuestionExpanded] = useState(false);
  const [isQuestionLong, setIsQuestionLong] = useState(false);
  const contentRef = useRef(null);
  const questionRef = useRef(null);

  useEffect(() => {
    if (contentRef.current) {
      const element = contentRef.current;
      setIsOverflowing(element.scrollHeight > element.clientHeight);
    }
  }, [aiAnswer, answerPrompt]);

  useEffect(() => {
    if (questionRef.current) {
      const element = questionRef.current;
      // Check if question text is longer than 3 lines (approximate)
      const lineHeight = parseInt(window.getComputedStyle(element).lineHeight);
      const maxHeight = lineHeight * 3; // 3 lines
      setIsQuestionLong(element.scrollHeight > maxHeight);
    }
  }, [question.questionText]);

  const handleAskAI = async () => {
    try {
      setLoadingAi(true);
      setError(null);
      const answer = await onAskAI();
      setAiAnswer(answer);
      setExpanded(true);
    } catch (err) {
      console.error("Failed to get AI answer:", err);
      setError(err.message);
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div className="ie-question-card">
      <div className="ie-question-header" onClick={() => setExpanded(!expanded)}>
        <div className="ie-question-icon">
          <HelpCircle size={20} />
        </div>
        <div className="ie-question-text-container">
          <div
            ref={questionRef}
            className={`ie-question-text ${isQuestionLong && !questionExpanded ? 'ie-question-truncated' : ''}`}
          >
            {question.questionText}
          </div>

          {isQuestionLong && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setQuestionExpanded(!questionExpanded);
              }}
              className="ie-question-show-more-btn"
            >
              {questionExpanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
        <div className="ie-question-toggle">
          {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </div>

      {expanded && (
        <div className="ie-question-content">
          {answerPrompt && answerPrompt !== "Answer not available" && answerPrompt !== "Answer question" ? (
            <div className="ie-user-answer">
              <div className="ie-answer-header">
                <User size={16} className="ie-answer-icon" />
                <span>Candidate Response</span>
              </div>
              <div
                ref={contentRef}
                className={`ie-answer-text ${isOverflowing && !expanded ? 'ie-truncated' : ''}`}
              >
                {answerPrompt}
                {isOverflowing && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpanded(!expanded);
                    }}
                    className="ie-show-more-btn"
                  >
                    {expanded ? 'Show less' : 'Show more'}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="ie-ai-answer-container">
              {aiAnswer ? (
                <div className="ie-ai-answer">
                  <div className="ie-answer-header">
                    <Sparkles size={16} className="ie-answer-icon" />
                    <span>AI Suggested Answer</span>
                  </div>
                  <div
                    ref={contentRef}
                    className={`ie-answer-text ${isOverflowing && !expanded ? 'ie-truncated' : ''}`}
                  >
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeHighlight]}
                      components={{
                        code({ node, inline, className, children, ...props }) {
                          const match = /language-(\w+)/.exec(className || '');
                          return !inline && match ? (
                            <div className="ie-code-block">
                              <div className="ie-code-language">{match[1]}</div>
                              <pre className={className}>
                                <code {...props}>
                                  {children}
                                </code>
                              </pre>
                            </div>
                          ) : (
                            <code className={className} {...props}>
                              {children}
                            </code>
                          );
                        }
                      }}
                    >
                      {aiAnswer}
                    </ReactMarkdown>
                    {isOverflowing && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpanded(!expanded);
                        }}
                        className="ie-show-more-btn"
                      >
                        {expanded ? 'Show less' : 'Show more'}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleAskAI}
                  disabled={loadingAi}
                  className="ie-ask-ai-button"
                >
                  {loadingAi ? (
                    <>
                      <Loader2 className="ie-spinner" size={16} />
                      <span>Generating Answer...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span>Generate AI Answer</span>
                    </>
                  )}
                </button>
              )}
              {error && (
                <div className="ie-ai-error">
                  <CircleAlert size={14} />
                  <span>{error}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const RealisticStarRating = ({ difficulty }) => {
  const maxStars = 5;
  const normalizedDifficulty = Math.min(Math.max(difficulty * 2, 0), maxStars);
  const color = getDifficultyColor(difficulty);

  return (
    <div className="ie-star-rating-container">
      <style jsx>{`
        .ie-star-rating-container {
          display: flex;
          gap: 2px;
          align-items: center;
        }
        
        .ie-single-star-container {
          position: relative;
          width: 20px;
          height: 20px;
        }
        
        .ie-star-base {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.2));
        }
        
        .ie-star-fill-mask {
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;
          overflow: hidden;
        }
        
        .ie-star-gradient {
          background: linear-gradient(
            135deg,
            #ffd700 0%,
            #ffed4e 25%,
            #ffc107 50%,
            #ff8f00 75%,
            #ff6f00 100%
          );
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .ie-star-shadow {
          filter: drop-shadow(0 0 2px rgba(255, 215, 0, 0.5))
                  drop-shadow(0 1px 3px rgba(0, 0, 0, 0.3));
        }
        
        .ie-star-glow {
          filter: drop-shadow(0 0 4px rgba(255, 215, 0, 0.8))
                  drop-shadow(0 0 8px rgba(255, 215, 0, 0.4))
                  drop-shadow(0 1px 3px rgba(0, 0, 0, 0.2));
        }
      `}</style>

      {Array.from({ length: maxStars }).map((_, index) => {
        const starValue = index + 1;
        let fillPercentage = 0;

        if (normalizedDifficulty >= starValue) {
          fillPercentage = 100;
        } else if (normalizedDifficulty > index) {
          fillPercentage = (normalizedDifficulty - index) * 100;
        }

        const isActive = fillPercentage > 0;

        return (
          <div key={index} className="ie-single-star-container">
            {/* Empty star outline */}
            <svg
              className="ie-star-base"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#d1d5db"
              strokeWidth="1"
            >
              <path
                d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
              />
            </svg>

            {/* Filled portion with golden gradient */}
            <div
              className="ie-star-fill-mask"
              style={{
                width: `${fillPercentage}%`,
              }}
            >
              <svg
                className={`ie-star-base ${isActive ? 'ie-star-glow' : ''}`}
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="url(#goldGradient)"
                stroke="url(#goldStroke)"
                strokeWidth="0.5"
              >
                <defs>
                  <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ffd700" />
                    <stop offset="25%" stopColor="#ffed4e" />
                    <stop offset="50%" stopColor="#ffc107" />
                    <stop offset="75%" stopColor="#ff8f00" />
                    <stop offset="100%" stopColor="#ff6f00" />
                  </linearGradient>
                  <linearGradient id="goldStroke" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#b8860b" />
                    <stop offset="100%" stopColor="#8b4513" />
                  </linearGradient>
                </defs>
                <path
                  d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                />
              </svg>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const getDifficultyColor = (difficulty) => {
  const normalized = difficulty * 2;
  if (normalized <= 1) return "#4ade80";
  if (normalized <= 2) return "#22c55e";
  if (normalized <= 3) return "#f59e0b";
  if (normalized <= 4) return "#ef4444";
  return "#9333ea";
};

const InterviewExperience = () => {
  const [company, setCompany] = useState("");
  const [roles, setRoles] = useState([]);
  const [interviewData, setInterviewData] = useState(null);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [error, setError] = useState("");
  const [activeRole, setActiveRole] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedCards, setExpandedCards] = useState({});
  const [scrapingProgress, setScrapingProgress] = useState(null);
  const [totalInterviews, setTotalInterviews] = useState(0);
  const eventSourceRef = useRef(null);
  const [showAllRoles, setShowAllRoles] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [logoUrl, setLogoUrl] = useState(null);
  const [visibleQuestions, setVisibleQuestions] = useState({});
  const experiencesPerPage = 3;
  const [expandedQuestions, setExpandedQuestions] = useState({});
  const [clientId] = useState(() => uuidv4()); // client stays consistent
  const activeScrapes = new Map(); // key: clientId, value: { res, browser }
  const [placeholder, setPlaceholder] = useState("Search company");
  const isMobile = /Mobi|Android/i.test(navigator.userAgent);

  useEffect(() => {
    const updatePlaceholder = () => {
      const isMobile = window.innerWidth <= 768;
      setPlaceholder(
        isMobile
          ? "Search company"
          : "Search company (e.g. Google, Amazon, Microsoft)"
      );
    };
  
    updatePlaceholder(); // Initial check
    window.addEventListener("resize", updatePlaceholder);
  
    return () => window.removeEventListener("resize", updatePlaceholder);
  }, []);
  


  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const fetchRoles = async () => {
    if (!company.trim()) return;

    await stopPreviousScrape(); // 🔥 cancel here too

    // Cancel any ongoing scraping
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    // Reset all interview-related states
    setLoadingRoles(true);
    setRoles([]);
    setInterviewData(null);
    setError("");
    setActiveRole(null);
    setCurrentPage(1);
    setExpandedCards({});
    setScrapingProgress(null);
    setTotalInterviews(0);
    setVisibleQuestions({});

    try {
      const res = await axios.get(`${backend_url}/api/roles`, {
        params: { company },
      });
      setRoles(res.data.roles);
      setLogoUrl(res.data.logoUrl);
    } catch (err) {
      console.error("Failed to fetch roles:", err);
      setError("Failed to fetch roles. Please try a different company.");
    } finally {
      setLoadingRoles(false);
    }
  };

  const fetchQuestions = async (url, roleTitle) => {
    await stopPreviousScrape(); // Cancel any existing

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setLoadingQuestions(true);
    setInterviewData(null);
    setError("");
    setActiveRole(roleTitle);
    setCurrentPage(1);
    setExpandedCards({});
    setScrapingProgress(null);
    setTotalInterviews(0);
    setVisibleQuestions({});

    try {
      const encodedUrl = encodeURIComponent(url);
      const eventSource = new EventSource(`${backend_url}/api/interview-questions?url=${encodedUrl}&clientId=${clientId}`);
      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case 'metadata':
            setScrapingProgress({
              currentPage: 0,
              totalPages: data.data.totalPages,
              message: `Found ${data.data.totalPages} pages to scrape...`
            });
            break;

          case 'progress':
            setScrapingProgress({
              currentPage: data.data.currentPage,
              totalPages: data.data.totalPages,
              message: data.data.message
            });
            break;

          case 'pageData':
            setInterviewData(prevData => {
              const newData = {
                header: data.data.header || (prevData ? prevData.header : {}),
                interviews: prevData
                  ? [...prevData.interviews, ...data.data.interviews]
                  : data.data.interviews
              };

              if (newData.header) {
                newData.header.totalPages = data.data.totalPages;
              }

              return newData;
            });

            setTotalInterviews(prev => prev + data.data.interviewCount);

            setScrapingProgress({
              currentPage: data.data.page,
              totalPages: data.data.totalPages,
              message: `Completed page ${data.data.page} of ${data.data.totalPages} (${data.data.interviewCount} interviews found)`
            });
            break;

          case 'error':
            setError(data.error);
            break;

          case 'complete':
            setLoadingQuestions(false);
            setScrapingProgress(null);
            eventSource.close();
            eventSourceRef.current = null;
            break;
        }
      };

      eventSource.onerror = (error) => {
        console.error('EventSource failed:', error);
        setLoadingQuestions(false);
        setScrapingProgress(null);
        eventSource.close();
        eventSourceRef.current = null;
      };

    } catch (err) {
      console.error("Failed to start scraping:", err);
      setError("Failed to start scraping. Please try another role.");
      setLoadingQuestions(false);
      setScrapingProgress(null);
    }
  };


  const stopPreviousScrape = async () => {
    try {
      await axios.post(`${backend_url}/api/stop-scraping`, { clientId });
    } catch (err) {
      console.warn("Failed to stop previous scraping:", err.message);
    }
  };



  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const paginateExperiences = (experiences) => {
    const startIndex = (currentPage - 1) * experiencesPerPage;
    const endIndex = startIndex + experiencesPerPage;
    return experiences.slice(startIndex, endIndex);
  };

  const totalExperiencePages = () => Math.ceil(interviewData?.interviews.length / experiencesPerPage) || 1;

  const toggleExpandCard = (index) => {
    setExpandedCards(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const toggleShowAllRoles = () => {
    setShowAllRoles(prev => !prev);
  };

  const cancelScraping = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setLoadingQuestions(false);
    setScrapingProgress(null);
  };

  const handleAskAI = async (questionText) => {
    try {
      const response = await axios.post(`${backend_url}/api/ask`, {
        question: questionText,
        model: "Nemotron 3 Super"
      });
      return response.data.answer;
    } catch (err) {
      console.error("Failed to get AI answer:", err);
      throw new Error("Failed to get AI answer. Please try again.");
    }
  };

  const toggleQuestionsVisibility = (experienceIndex) => {
    setVisibleQuestions(prev => ({
      ...prev,
      [experienceIndex]: !prev[experienceIndex]
    }));
  };

  const getVisibleQuestionsCount = (experienceIndex) => {
    return visibleQuestions[experienceIndex] ? Infinity : 2;
  };

  const getExperienceColor = (experience) => {
    switch (experience.toLowerCase()) {
      case 'positive': return 'var(--color-success)';
      case 'negative': return 'var(--color-danger)';
      case 'neutral': return 'var(--color-warning)';
      default: return 'var(--color-text-light)';
    }
  };

  return (
    <div className="ie-app-container">
      {/* Main Content */}
      <main className="ie-main-content">
        {/* Hero Section */}
        <section className="ie-hero-section">
          <div className="ie-hero-content">
            <h1>Lessons From the Firing Line 🚨</h1>
            <p className="ie-hero-subtitle">
            Where Interviews Get Real — Questions. Stories. Wins.
            </p>
            <div className="ie-hero-stats">
              <div className="ie-hero-stat">
                <Briefcase size={24} />
                <span>10,000+ Companies</span>
              </div>
              <div className="ie-hero-stat">
                <HardHat size={24} />
                <span>50,000+ Roles</span>
              </div>
              <div className="ie-hero-stat">
                <MessageSquare size={24} />
                <span>1M+ Interview Experiences</span>
              </div>
            </div>
          </div>
        </section>

        {/* Search Section */}
        <section className="ie-search-section">
          <div className={`ie-search-container ${searchFocused ? 'ie-focused' : ''}`}>
            <div className="ie-search-icon">
              <Search size={20} />
            </div>
            <input
              type="text"
              placeholder={placeholder}
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && fetchRoles()}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              className="ie-search-input"
            />

            <button
              onClick={fetchRoles}
              disabled={!company || loadingRoles}
              className="ie-search-button"
            >
              {loadingRoles ? (
                <Loader2 className="ie-spinner" size={20} />
              ) : (
                <>
                  <span>Search</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="ie-error-message">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}
        </section>

        {/* Featured Companies */}
        {!roles.length && !loadingRoles && (
          <section className="ie-featured-companies">
            <h3>Popular Tech Companies</h3>
            <div className="ie-companies-grid">
              {[
                { name: 'Google', logo: 'https://logo.clearbit.com/google.com' },
                { name: 'Amazon', logo: 'https://logo.clearbit.com/amazon.com' },
                { name: 'Microsoft', logo: 'https://logo.clearbit.com/microsoft.com' },
                { name: 'Apple', logo: 'https://logo.clearbit.com/apple.com' },
                { name: 'Meta', logo: 'https://logo.clearbit.com/meta.com' },
                { name: 'Netflix', logo: 'https://logo.clearbit.com/netflix.com' },
                { name: 'Tesla', logo: 'https://logo.clearbit.com/tesla.com' },
                { name: 'Nvidia', logo: 'https://logo.clearbit.com/nvidia.com' },
                { name: 'Adobe', logo: 'https://logo.clearbit.com/adobe.com' },
                { name: 'Intel', logo: 'https://logo.clearbit.com/intel.com' },
                { name: 'Oracle', logo: 'https://logo.clearbit.com/oracle.com' },
                { name: 'Uber', logo: 'https://logo.clearbit.com/uber.com' },
                { name: 'Salesforce', logo: 'https://logo.clearbit.com/salesforce.com' },
                { name: 'Spotify', logo: 'https://logo.clearbit.com/spotify.com' },
              ].map((company) => (
                <div
                  key={company.name}
                  className="ie-company-card"
                  onClick={() => {
                    setCompany(company.name);
                    fetchRoles();
                  }}
                >
                  <div className="ie-company-logo">
                    <img src={company.logo} alt={`${company.name} logo`} onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '';
                      e.target.parentNode.textContent = company.name.charAt(0);
                      e.target.parentNode.classList.add('ie-company-logo-fallback');
                    }} />
                  </div>
                  <span>{company.name}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Roles Section */}
        {roles.length > 0 && (
          <section className="ie-roles-section">
            <div className="ie-section-header">
              <h2>Available Roles at {company}</h2>
            </div>

            <div className={`ie-roles-grid ${showAllRoles ? 'ie-expanded' : ''}`}>
              {roles.map((role, i) => (
                <div
                  key={i}
                  onClick={() => fetchQuestions(role.href, role.title)}
                  className={`ie-role-card ${activeRole === role.title ? 'ie-active' : ''}`}
                >
                  <div className="ie-role-card-content">
                    <div className="ie-role-icon">
                      <Briefcase size={20} />
                    </div>
                    <div className="ie-role-info">
                      <h3 className="ie-role-title">
                        {role.title.replace(/\s*\(\d+\)$/, "").trim()}
                      </h3>
                    </div>
                  </div>
                  {loadingQuestions && activeRole === role.title && (
                    <div className="ie-role-loading">
                      <Loader2 className="ie-spinner ie-small" size={16} />
                    </div>
                  )}
                </div>
              ))}
            </div>
            {roles.length > 3 && (
              <button
                onClick={toggleShowAllRoles}
                className="ie-show-more-roles"
              >
                {showAllRoles ? 'Show Less Roles' : `Show All ${roles.length} Roles`}
                {showAllRoles ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            )}
          </section>
        )}


        {/* Loading State */}
        {loadingQuestions && !scrapingProgress && activeRole && (
          <div className="ie-loading-container">
            <div className="ie-loading-spinner">
              <Loader2 className="ie-spinner" size={32} />
            </div>
            <p>Gathering interview data for {activeRole}...</p>
          </div>
        )}

        {/* Scraping Progress */}
        {scrapingProgress && (
          <div className="ie-progress-container">
            <div className="ie-progress-header">
              <h3>Collecting Interview Data</h3>
            </div>
            <div className="ie-progress-info">
              <div className="ie-progress-message">
                <span>{scrapingProgress.message}</span>
              </div>
              <div className="ie-progress-stats">
                <span>Page {scrapingProgress.currentPage} of {scrapingProgress.totalPages}</span>
              </div>
            </div>
            <div className="ie-progress-bar">
              <div
                className="ie-progress-fill"
                style={{
                  width: `${(scrapingProgress.currentPage / scrapingProgress.totalPages) * 100}%`
                }}
              ></div>
            </div>
          </div>
        )}


        {/* Interview Data */}
        {interviewData && (
          <section className="ie-interview-section">
            <div className="ie-interview-header">
              <div className="ie-company-info">
                <div className="ie-company-logo">
                  <img src={logoUrl} alt="Company Logo" />
                </div>
                <div className="ie-company-details">
                  <h2>{company}</h2>
                  <h3>{interviewData.header.title} Interview Insights</h3>
                </div>
              </div>

              <div className="ie-interview-stats">
                <div className="ie-stat-card">
                  <div className="ie-stat-value">{interviewData.interviews.length}</div>
                  <div className="ie-stat-label">Total Interviews</div>
                </div>

                {interviewData.header.difficulty && (
                  <div className="ie-stat-card">
                    <div className="ie-stat-label">Difficulty</div>
                    <div className="ie-difficulty-rating">
                      <RealisticStarRating difficulty={interviewData.header.difficulty} />
                    </div>
                  </div>
                )}

                {interviewData.header.experience?.length > 0 && (
                  <div className="ie-stat-card">
                    <div className="ie-stat-value">
                      {interviewData.header.experience.map((exp, i) => (
                        <span key={i} className="ie-experience-tag">{exp}</span>
                      ))}
                    </div>
                    <div className="ie-stat-label">Experience Level</div>
                  </div>
                )}
              </div>
            </div>

            {interviewData.interviews.length > 0 ? (
              <div className="ie-interview-content">
                <div className="ie-content-header">
                  <h3>Interview Experiences</h3>
                  {interviewData.interviews.length > experiencesPerPage && (
                    <div className="ie-pagination">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="ie-pagination-button"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <span className="ie-page-info">
                        Page {currentPage} of {totalExperiencePages()}
                      </span>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalExperiencePages()))}
                        disabled={currentPage === totalExperiencePages()}
                        className="ie-pagination-button"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="ie-experience-list">
                  {paginateExperiences(interviewData.interviews).map((interview, i) => {
                    const globalIndex = (currentPage - 1) * experiencesPerPage + i;
                    const visibleCount = getVisibleQuestionsCount(globalIndex);
                    const hasMoreQuestions = interview.questions.length - 1 > 2;

                    return (
                      <div key={globalIndex} className="ie-experience-card">
                        <div className="ie-experience-header">
                          <div className="ie-experience-title">
                            <h4>{interview.title}</h4>
                            {interview.date && (
                              <div className="ie-experience-date">
                                <Calendar size={14} />
                                <span>{interview.date}</span>
                              </div>
                            )}
                          </div>
                          {interview.summary.length > 0 && (
                            <div className="ie-experience-tags">
                              {interview.summary.map((item, idx) => {
                                let bgColor = 'var(--color-warning-light)';
                                let textColor = 'var(--color-warning)';

                                if (item.includes('Accepted offer') || item.includes('Positive experience')) {
                                  bgColor = 'var(--color-success-light)';
                                  textColor = 'var(--color-success)';
                                } else if (item.includes('No offer') || item.includes('Negative experience')) {
                                  bgColor = 'var(--color-danger-light)';
                                  textColor = 'var(--color-danger)';
                                }

                                return (
                                  <span
                                    key={idx}
                                    className="ie-experience-tag"
                                    style={{ backgroundColor: bgColor, color: textColor }}
                                  >
                                    {item}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        <div className="ie-experience-details">
                          {interview.details !== "N/A" && (
                            <div className={`ie-details-content ${expandedCards[globalIndex] ? 'ie-expanded' : ''}`}>
                              {interview.details}
                            </div>
                          )}

                          {interview.details.length > 300 && (
                            <button
                              onClick={() => toggleExpandCard(globalIndex)}
                              className="ie-expand-details"
                            >
                              {expandedCards[globalIndex] ? 'Show less' : 'Read more'}
                              {expandedCards[globalIndex] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                          )}
                        </div>

                        {interview.questions.length > 1 && (
                          <div className="ie-questions-section">
                            <div className="ie-questions-header">
                              <h5>Interview Questions ({interview.questions.length - 1})</h5>
                            </div>
                            <div className={`ie-questions-list ${expandedQuestions[globalIndex] ? 'ie-expanded' : ''}`}>
                              {interview.questions.slice(1, visibleQuestions[globalIndex] ? undefined : 1 + visibleCount).map((q, idx) => (
                                <QuestionItem
                                  key={idx}
                                  question={q}
                                  answerPrompt={q.answerPrompt}
                                  onAskAI={() => handleAskAI(q.questionText)}
                                />
                              ))}
                            </div>
                            {hasMoreQuestions && (
                              <div className="ie-questions-footer">
                                <button
                                  onClick={() => toggleQuestionsVisibility(globalIndex)}
                                  className="ie-show-more-questions"
                                >
                                  {visibleQuestions[globalIndex] ? 'Show Less Questions' : 'Show More Questions'}
                                  {visibleQuestions[globalIndex] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </button>
                                {interview.questions.length > 3 && (
                                  <button
                                    onClick={() => setExpandedQuestions(prev => ({
                                      ...prev,
                                      [globalIndex]: !prev[globalIndex]
                                    }))}
                                    className="ie-expand-questions"
                                  >
                                    {expandedQuestions[globalIndex] ? 'Collapse All' : 'Expand All'}
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {interviewData.interviews.length > experiencesPerPage && (
                  <div className="ie-pagination ie-bottom-pagination">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="ie-pagination-button"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <span className="ie-page-info">
                      Page {currentPage} of {totalExperiencePages()}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalExperiencePages()))}
                      disabled={currentPage === totalExperiencePages()}
                      className="ie-pagination-button"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="ie-empty-state">
                <div className="ie-empty-icon">
                  <HelpCircle size={48} />
                </div>
                <h4>No interview experiences found</h4>
                <p>We couldn't find any interview experiences for this role. Try another role or company.</p>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
};

export default InterviewExperience;