import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, getDownloadURL, listAll } from 'firebase/storage';
import { db } from '../firebase/config';
import "../styles/mockInterviewAnalysis.css";
import logo from "../images/logo_bg.png";
import profile_pic from "../images/user_placeholder.png";

import {
  ChevronLeft,
  ChevronRight,
  BarChart2,
  MessageSquare,
  Star,
  Award,
  Clock,
  User,
  Briefcase,
  HardDrive,
  BookOpen,
  AlertCircle,
  Mic,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  HelpCircle,
  PieChart,
  Activity,
  Zap,
  Circle,
  Menu,
  X,
  ChevronDown,
  LogOut,
  CreditCard
} from 'lucide-react';
import { Radar, Bar, Pie, Line, Scatter } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  RadialLinearScale,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  ArcElement,
  BubbleController
} from 'chart.js';

ChartJS.register(
  RadialLinearScale,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  ArcElement,
  BubbleController
);

const MockInterviewAnalysis = ({ mockInterviewId, onBack }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [interviewData, setInterviewData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState('intro');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('performance');
  const [summary, setSummary] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [userName, setUserName] = useState("");
  const [userPhoto, setUserPhoto] = useState("");
  const dropdownRef = useRef(null);
  const backend_url = process.env.REACT_APP_BACKEND_URL;

  // Function to check if file exists in Firebase Storage
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

  // Load profile photo from Firebase Storage
  const loadProfilePhoto = async (email) => {
    const storage = getStorage();
    const photoRef = ref(storage, `profile_pics/${email}.png`);

    try {
      const exists = await doesFileExist(`${email}.png`);
      if (exists) {
        const firebaseUrl = await getDownloadURL(photoRef);
        setUserPhoto(firebaseUrl);
      } else {
        // Check if there's a social photo in localStorage
        const socialPhotoUrl = localStorage.getItem("userPhoto");
        if (socialPhotoUrl && socialPhotoUrl.startsWith("http")) {
          setUserPhoto(socialPhotoUrl);
        } else {
          setUserPhoto(profile_pic);
        }
      }
    } catch (err) {
      // Fallback to profile_pic if any error occurs
      setUserPhoto(profile_pic);
    }
  };

  // Fetch user data from localStorage and load profile photo
  useEffect(() => {
    const storedName = localStorage.getItem("userName");
    const storedEmail = localStorage.getItem("userEmail");
    const storedPhoto = localStorage.getItem("userPhoto");
    
    if (storedName) setUserName(storedName);
    
    // Try to load profile photo from Firebase first, fallback to localStorage or default
    if (storedEmail) {
      loadProfilePhoto(storedEmail);
    } else if (storedPhoto) {
      setUserPhoto(storedPhoto);
    } else {
      setUserPhoto(profile_pic);
    }
  }, []);

  // Handle click outside dropdown
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

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userName");
    localStorage.removeItem("userPhoto");
    localStorage.clear();
    navigate("/", { replace: true });
  };

  const fetchInterviewData = async () => {
    setLoading(true);
    setError(null);
    try {
      const interviewId = mockInterviewId || new URLSearchParams(location.search).get('zuLjp');

      if (!interviewId) throw new Error('No interview ID found in URL');

      const docRef = doc(db, 'mockInterviewQuestions', interviewId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setInterviewData(docSnap.data());
      } else {
        throw new Error('No interview found with this ID');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInterviewData();
  }, [location.search]);

  useEffect(() => {
    if (interviewData) {
      const metricsData = calculateMetrics();

      if (interviewData.summary) {
        setSummary(interviewData.summary);
      } else {
        generateSummary(metricsData).then(summary => {
          setSummary(summary);
        });
      }
    }
  }, [interviewData]);

  if (error) {
    return (
      <div className="error-container">
        <div className="error-content">
          <AlertCircle size={64} className="error-icon" />
          <h2 className="error-title">Error Loading Interview</h2>
          <p className="error-message">{error}</p>
          <button className="retry-button" onClick={fetchInterviewData}>
            Try Again
          </button>
          &nbsp;
          &nbsp;
          &nbsp;
          <button className="back-button" onClick={() => window.location.reload()}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!interviewData) {
    return (
      <div className="empty-container">
        <div className="empty-content">
          <HelpCircle size={64} className="empty-icon" />
          <h2 className="empty-title">No Interview Data Found</h2>
          <p className="empty-message">We couldn't find any data for this interview session.</p>
          <button className="back-button" onClick={() => window.location.reload()}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const generateSummary = async (metrics) => {
    try {
      setLoading(true);
      const summaryRequestData = {
        interviewId: new URLSearchParams(location.search).get('zuLjp'),
        questions: metrics.allQuestions,
        overallMetrics: metrics.overallMetrics,
        categoryAverages: metrics.categoryAverages,
        skillRatings: metrics.skillRatings
      };

      const response = await fetch(`${backend_url}/api/generate-interview-summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(summaryRequestData)
      });

      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`);
      }

      const summary = await response.json();

      const interviewId = summaryRequestData.interviewId;
      const docRef = doc(db, 'mockInterviewQuestions', interviewId);
      await updateDoc(docRef, { summary });

      return summary;
    } catch (error) {
      return {
        strengths: ['Strong technical knowledge in core areas'],
        improvements: ['Could improve communication skills'],
        recommendations: ['Practice more mock interviews']
      };
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = () => {
    const categories = {
      intro: {
        count: 0,
        totalScore: 0,
        metrics: {
          communication: 0,
          confidence: 0,
          grammar: 0,
          vocabulary: 0
        }
      },
      resumeBased: {
        count: 0,
        totalScore: 0,
        metrics: {
          communication: 0,
          confidence: 0,
          grammar: 0,
          vocabulary: 0
        }
      },
      technical: {
        count: 0,
        totalScore: 0,
        metrics: {
          communication: 0,
          confidence: 0,
          grammar: 0,
          vocabulary: 0
        }
      }
    };

    let allQuestions = [];
    let totalScore = 0;
    let questionCount = 0;
    const timelineData = [];
    const questionScores = [];
    const skillMap = {};

    const processQuestion = (category, question, index) => {
      if (!question || !question.communicationMetrics) return;

      const baseScore = question.score || 0;
      const commMetrics = question.communicationMetrics || {};

      categories[category].count++;
      categories[category].totalScore += baseScore;
      categories[category].metrics.communication += commMetrics.communication || 0;
      categories[category].metrics.confidence += commMetrics.confidence || 0;
      categories[category].metrics.grammar += commMetrics.grammar || 0;
      categories[category].metrics.vocabulary += commMetrics.vocabulary || 0;

      allQuestions.push({
        ...question,
        category,
        isFollowUp: false
      });

      timelineData.push({
        index: index + timelineData.length,
        score: baseScore,
        type: 'question',
        category
      });

      questionScores.push({
        x: questionCount + 1,
        y: baseScore,
        r: 8,
        category
      });

      totalScore += baseScore;
      questionCount++;

      if (category === 'technical' && question.skill) {
        const skill = question.skill.toLowerCase();
        if (!skillMap[skill]) {
          skillMap[skill] = { count: 0, totalRating: 0 };
        }
        skillMap[skill].count++;
        skillMap[skill].totalRating += baseScore;
      }

      if (question.followUps && question.followUps.length > 0) {
        question.followUps.forEach((followUp, followUpIndex) => {
          if (!followUp.communicationMetrics) return;

          const followUpScore = followUp.score || 0;
          const followUpCommMetrics = followUp.communicationMetrics || {};

          categories[category].count++;
          categories[category].totalScore += followUpScore;
          categories[category].metrics.communication += followUpCommMetrics.communication || 0;
          categories[category].metrics.confidence += followUpCommMetrics.confidence || 0;
          categories[category].metrics.grammar += followUpCommMetrics.grammar || 0;
          categories[category].metrics.vocabulary += followUpCommMetrics.vocabulary || 0;

          allQuestions.push({
            ...followUp,
            category,
            isFollowUp: true
          });

          timelineData.push({
            index: index + followUpIndex + timelineData.length,
            score: followUpScore,
            type: 'follow-up',
            category
          });

          questionScores.push({
            x: questionCount + 1,
            y: followUpScore,
            r: 6,
            category
          });

          totalScore += followUpScore;
          questionCount++;

          if (category === 'technical' && followUp.skill) {
            const skill = followUp.skill.toLowerCase();
            if (!skillMap[skill]) {
              skillMap[skill] = { count: 0, totalRating: 0 };
            }
            skillMap[skill].count++;
            skillMap[skill].totalRating += followUpScore;
          }
        });
      }
    };

    try {
      if (!interviewData?.questions) {
        throw new Error('No questions data found in interview data');
      }

      Object.entries(interviewData.questions).forEach(([category, questions]) => {
        if (!questions) return;

        if (category === 'technical') {
          (questions || []).forEach((block, blockIndex) => {
            const keyword = block.keyword || 'General';

            (block.questions || []).forEach((question, questionIndex) => {
              processQuestion('technical', { ...question, skill: keyword }, blockIndex + questionIndex);
            });
          });

        } else {
          (questions || []).forEach((question, index) => {
            processQuestion(category, question, index);
          });
        }
      });

      const overallAverage = questionCount > 0 ? totalScore / questionCount : 0;
      const categoryAverages = {};
      const overallMetrics = { communication: 0, confidence: 0, grammar: 0, vocabulary: 0 };
      let metricCount = 0;

      Object.entries(categories).forEach(([category, data]) => {
        const count = data.count;
        categoryAverages[category] = {
          score: count > 0 ? data.totalScore / count : 0,
          communication: count > 0 ? data.metrics.communication / count : 0,
          confidence: count > 0 ? data.metrics.confidence / count : 0,
          grammar: count > 0 ? data.metrics.grammar / count : 0,
          vocabulary: count > 0 ? data.metrics.vocabulary / count : 0
        };

        if (count > 0) {
          overallMetrics.communication += data.metrics.communication;
          overallMetrics.confidence += data.metrics.confidence;
          overallMetrics.grammar += data.metrics.grammar;
          overallMetrics.vocabulary += data.metrics.vocabulary;
          metricCount += count;
        }
      });

      if (metricCount > 0) {
        overallMetrics.communication = overallMetrics.communication / metricCount;
        overallMetrics.confidence = overallMetrics.confidence / metricCount;
        overallMetrics.grammar = overallMetrics.grammar / metricCount;
        overallMetrics.vocabulary = overallMetrics.vocabulary / metricCount;
      }

      const skillRatings = Object.entries(skillMap).map(([skill, data]) => {
        const avg = data.totalRating / data.count;
        let rating = avg / 2;
        rating = Math.min(5, Math.max(0, Math.round(rating * 2) / 2));
        return {
          skill: skill.charAt(0).toUpperCase() + skill.slice(1),
          rating,
          count: data.count
        };
      }).sort((a, b) => b.rating - a.rating);

      const radarData = {
        labels: ['Communication', 'Confidence', 'Grammar', 'Vocabulary'],
        datasets: [{
          label: 'Overall Skills',
          data: [
            overallMetrics.communication,
            overallMetrics.confidence,
            overallMetrics.grammar,
            overallMetrics.vocabulary
          ],
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 2
        }]
      };

      const barData = {
        labels: ['Introduction', 'Resume Based', 'Technical'],
        datasets: [{
          label: 'Average Score',
          data: [
            categoryAverages.intro?.score || 0,
            categoryAverages.resumeBased?.score || 0,
            categoryAverages.technical?.score || 0
          ],
          backgroundColor: [
            'rgba(59, 130, 246, 0.7)',
            'rgba(16, 185, 129, 0.7)',
            'rgba(245, 158, 11, 0.7)'
          ],
          borderWidth: 1
        }]
      };

      const pieData = {
        labels: ['Introduction', 'Resume Based', 'Technical'],
        datasets: [{
          data: [
            categories.intro.count,
            categories.resumeBased.count,
            categories.technical.count
          ],
          backgroundColor: [
            'rgba(59, 130, 246, 0.7)',
            'rgba(16, 185, 129, 0.7)',
            'rgba(245, 158, 11, 0.7)'
          ]
        }]
      };

      const questionScoreData = {
        datasets: [
          {
            label: 'Introduction Questions',
            data: questionScores.filter(q => q.category === 'intro'),
            backgroundColor: 'rgba(59, 130, 246, 0.8)'
          },
          {
            label: 'Resume Questions',
            data: questionScores.filter(q => q.category === 'resumeBased'),
            backgroundColor: 'rgba(16, 185, 129, 0.8)'
          },
          {
            label: 'Technical Questions',
            data: questionScores.filter(q => q.category === 'technical'),
            backgroundColor: 'rgba(245, 158, 11, 0.8)'
          }
        ]
      };

      return {
        overallAverage,
        categoryAverages,
        radarData,
        barData,
        pieData,
        questionScoreData,
        allQuestions,
        questionCount,
        skillRatings,
        overallMetrics,
        questionScores,
        categories,
        existingSummary: interviewData.summary || null
      };

    } catch (error) {
      return {
        overallAverage: 0,
        categoryAverages: {},
        radarData: { labels: [], datasets: [] },
        barData: { labels: [], datasets: [] },
        pieData: { labels: [], datasets: [] },
        questionScoreData: { datasets: [] },
        allQuestions: [],
        questionCount: 0,
        skillRatings: [],
        overallMetrics: {},
        questionScores: [],
        categories: {
          intro: { count: 0 },
          resumeBased: { count: 0 },
          technical: { count: 0 }
        },
        existingSummary: null
      };
    }
  };

  const metrics = calculateMetrics();
  const currentQuestions = metrics.allQuestions.filter(q => q.category === activeCategory);
  const currentQuestion = currentQuestions[currentQuestionIndex];

  const renderPerformanceTab = () => (
    <div className="performance-tab">
      <div className="dashboard-grid">
        <div className="card overall-performance">
          <div className="card-header">
            <h3>Overall Performance</h3>
            <div className={`performance-badge ${metrics.overallAverage >= 8 ? 'excellent' :
              metrics.overallAverage >= 6 ? 'good' :
                metrics.overallAverage >= 4 ? 'average' : 'poor'
              }`}>
              {metrics.overallAverage >= 8 ? 'Excellent' :
                metrics.overallAverage >= 6 ? 'Good' :
                  metrics.overallAverage >= 4 ? 'Average' : 'Needs Work'}
            </div>
          </div>
          <div className="performance-score">
            <div className="score-display">
              <span className="score">{metrics.overallAverage.toFixed(1)}</span>
              <span className="score-label">out of 10</span>
            </div>
            <div className="score-details">
              <div className="detail-item">
                <span className="label">Questions</span>
                <span className="value">{metrics.questionCount}</span>
              </div>
              <div className="detail-item">
                <span className="label">Duration</span>
                <span className="value">~{Math.round(metrics.questionCount * 1.5)} min</span>
              </div>
            </div>
          </div>
          <div className="performance-distribution">
            <div className="distribution-chart">
              <Scatter
                data={metrics.questionScoreData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    x: {
                      title: {
                        display: true,
                        text: 'Question Number',
                        color: 'var(--color-text-light)'
                      },
                      min: 0,
                      max: metrics.questionCount + 1,
                      grid: {
                        color: 'rgba(203, 213, 225, 0.3)'
                      },
                      ticks: {
                        stepSize: 1
                      }
                    },
                    y: {
                      title: {
                        display: true,
                        text: 'Score (out of 10)',
                        color: 'var(--color-text-light)'
                      },
                      min: 0,
                      max: 10,
                      grid: {
                        color: 'rgba(203, 213, 225, 0.3)'
                      },
                      ticks: {
                        stepSize: 2
                      }
                    }
                  },
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: {
                        usePointStyle: true,
                        padding: 20
                      }
                    },
                    tooltip: {
                      callbacks: {
                        label: function (context) {
                          const data = context.raw;
                          return [
                            `Question ${data.x}`,
                            `Score: ${data.y}/10`,
                            `Category: ${context.dataset.label}`
                          ];
                        }
                      }
                    }
                  }
                }}
              />
            </div>
          </div>
        </div>

        <div className="card skill-assessment">
          <div className="card-header">
            <h3>Skill Assessment</h3>
            <Activity size={20} />
          </div>
          <div className="radar-chart">
            <Radar
              data={metrics.radarData}
              options={{
                responsive: true,
                scales: {
                  r: {
                    angleLines: {
                      display: true,
                      color: 'rgba(203, 213, 225, 0.3)'
                    },
                    suggestedMin: 0,
                    suggestedMax: 10,
                    ticks: {
                      stepSize: 2,
                      backdropColor: 'transparent'
                    },
                    grid: {
                      color: 'rgba(137, 146, 157, 0.3)'
                    },
                    pointLabels: {
                      font: {
                        size: 14
                      }
                    }
                  }
                },
                plugins: {
                  legend: {
                    display: false
                  },
                  tooltip: {
                    callbacks: {
                      label: function (context) {
                        return `${context.dataset.label}: ${context.raw.toFixed(1)}/10`;
                      }
                    }
                  }
                },
                elements: {
                  line: {
                    borderWidth: 3
                  }
                }
              }}
            />
            <div className="radar-metric-summary">
              {['communication', 'confidence', 'grammar', 'vocabulary'].map((metric) => {
                const val = metrics.overallMetrics?.[metric] || 0;
                return (
                  <div key={metric} className="metric-chip">
                    <span className="chip-label">{metric.charAt(0).toUpperCase() + metric.slice(1)}</span>
                    <span className="chip-value">{val.toFixed(1)}/10</span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        <div className="card category-performance">
          <div className="card-header">
            <h3>Category Performance</h3>
            <BarChart2 size={20} />
          </div>
          <div className="bar-chart">
            <Bar
              data={metrics.barData}
              options={{
                responsive: true,
                scales: {
                  y: {
                    beginAtZero: true,
                    max: 10,
                    grid: {
                      color: 'rgba(203, 213, 225, 0.3)'
                    },
                    ticks: {
                      stepSize: 2
                    }
                  },
                  x: {
                    grid: {
                      display: false
                    }
                  }
                },
                plugins: {
                  legend: {
                    display: false
                  },
                  tooltip: {
                    callbacks: {
                      label: function (context) {
                        return `${context.dataset.label}: ${context.raw.toFixed(1)}/10`;
                      }
                    }
                  }
                }
              }}
            />
          </div>
          <div className="category-details">
            {Object.entries(metrics.categoryAverages).map(([category, data]) => (
              <div className="category-item" key={category}>
                <div className={`category-indicator ${category}`}></div>
                <span className="category-name">
                  {category === 'intro' ? 'Introduction' :
                    category === 'resumeBased' ? 'Resume Based' : 'Technical'}
                </span>
                <span className="category-score">{data.score.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card response-analysis">
          <div className="card-header">
            <h3>Performance Over Time</h3>
            <Clock size={20} />
          </div>
          <div className="line-chart-container">
            <div className="line-chart">
              <Line
                data={{
                  labels: metrics.allQuestions.map((_, i) => `Q${i + 1}`),
                  datasets: [{
                    label: 'Question Score',
                    data: metrics.allQuestions.map(q => q.score),
                    borderColor: 'rgba(59, 130, 246, 1)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.3,
                    fill: true
                  }]
                }}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      display: false
                    },
                    tooltip: {
                      callbacks: {
                        label: function (context) {
                          const question = metrics.allQuestions[context.dataIndex];
                          return [
                            `Score: ${context.raw}/10`,
                            `Type: ${question.isFollowUp ? 'Follow-up' : 'Main'} Question`,
                            `Category: ${question.category === 'intro' ? 'Introduction' :
                              question.category === 'resumeBased' ? 'Resume Based' : 'Technical'}`
                          ];
                        }
                      }
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      max: 10,
                      title: {
                        display: true,
                        text: 'Score (out of 10)'
                      },
                      grid: {
                        color: 'rgba(203, 213, 225, 0.3)'
                      },
                      ticks: {
                        stepSize: 2
                      }
                    },
                    x: {
                      title: {
                        display: true,
                        text: 'Question Sequence'
                      },
                      grid: {
                        display: false
                      }
                    }
                  }
                }}
              />
            </div>
          </div>
          <div className="performance-insights">
            {calculatePerformanceTrend(metrics.allQuestions.map(q => q.score))}
            <div className="additional-insights">
              <div className="insight-item">
                <div className="insight-header">
                  <Circle size={12} className="best-icon" />
                  <span>Best Question</span>
                </div>
                <div className="insight-value">
                  Q{metrics.allQuestions.findIndex(q => q.score === Math.max(...metrics.allQuestions.map(q => q.score))) + 1} (
                  {Math.max(...metrics.allQuestions.map(q => q.score))}/10)
                </div>
              </div>
              <div className="insight-item">
                <div className="insight-header">
                  <Circle size={12} className="worst-icon" />
                  <span>Needs Improvement</span>
                </div>
                <div className="insight-value">
                  Q{metrics.allQuestions.findIndex(q => q.score === Math.min(...metrics.allQuestions.map(q => q.score))) + 1} (
                  {Math.min(...metrics.allQuestions.map(q => q.score))}/10)
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card skill-ratings scrollable-card">
          <div className="card-header">
            <h3>Technical Skills</h3>
            <Award size={20} />
          </div>
          <div className="skills-container">
            <div className="skills-list">
              {metrics.skillRatings.map((skill, index) => (
                <div className="skill-item" key={index}>
                  <div className="skill-info">
                    <span className="skill-name">{skill.skill}</span>
                    <span className="skill-count">{skill.count} Questions</span>
                  </div>
                  <div className="skill-rating">
                    <div className="stars">
                      {[...Array(5)].map((_, i) => {
                        const starValue = i + 1;
                        if (skill.rating >= starValue) {
                          return <Star key={i} size={14} className="filled" fill="currentColor" />;
                        } else if (skill.rating > i && skill.rating < starValue) {
                          return (
                            <div key={i} className="half-star-container">
                              <Star size={14} className="filled half-star-left" fill="currentColor" />
                              <Star size={14} className="empty half-star-right" fill="none" />
                            </div>
                          );
                        } else {
                          return <Star key={i} size={14} className="empty" fill="none" />;
                        }
                      })}
                    </div>
                    <span className="rating-value">{skill.rating.toFixed(1)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );

  const renderQuestionsTab = () => (
    <div className="questions-tab">
      <div className="category-selector">
        <div className="category-tabs">
          <button
            className={`category-tab ${activeCategory === 'intro' ? 'active' : ''}`}
            onClick={() => {
              setActiveCategory('intro');
              setCurrentQuestionIndex(0);
            }}
          >
            <User size={16} />
            <span>Introduction</span>
            <span className="question-count">{metrics.categories.intro.count}</span>
          </button>
          <button
            className={`category-tab ${activeCategory === 'resumeBased' ? 'active' : ''}`}
            onClick={() => {
              setActiveCategory('resumeBased');
              setCurrentQuestionIndex(0);
            }}
          >
            <BookOpen size={16} />
            <span>Resume Based</span>
            <span className="question-count">{metrics.categories.resumeBased.count}</span>
          </button>
          <button
            className={`category-tab ${activeCategory === 'technical' ? 'active' : ''}`}
            onClick={() => {
              setActiveCategory('technical');
              setCurrentQuestionIndex(0);
            }}
          >
            <HardDrive size={16} />
            <span>Technical</span>
            <span className="question-count">{metrics.categories.technical.count}</span>
          </button>
        </div>
      </div>

      {currentQuestions.length === 0 ? (
        <div className="empty-questions">
          <MessageSquare size={48} />
          <h3>No Questions Found</h3>
          <p>There are no questions available in this category.</p>
        </div>
      ) : (
        <div className="question-viewer">
          <div className="question-navigation">
            <button
              className="nav-button prev"
              onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
              disabled={currentQuestionIndex === 0}
            >
              <ChevronLeft size={20} />
              Previous
            </button>
            <div className="question-counter">
              Question {currentQuestionIndex + 1} of {currentQuestions.length}
            </div>
            <button
              className="nav-button next"
              onClick={() => setCurrentQuestionIndex(prev => Math.min(currentQuestions.length - 1, prev + 1))}
              disabled={currentQuestionIndex === currentQuestions.length - 1}
            >
              Next
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="question-card">
            <div className="question-header">
              <div className="question-meta">
                <span className={`question-type ${currentQuestion.isFollowUp ? 'follow-up' : 'main'}`}>
                  {currentQuestion.isFollowUp ? 'Follow-up Question' : 'Main Question'}
                </span>
                <span className="question-score">
                  <Star size={16} className="star-icon" />
                  {currentQuestion.score || 'N/A'}/10
                </span>
              </div>
              <h3 className="question-text">{currentQuestion.text}</h3>
            </div>

            <div className="answer-section">
              <h4>Your Answer</h4>
              <div className="answer-content">
                <p>{currentQuestion.answer || 'No answer provided.'}</p>
              </div>
            </div>
            <div className="metrics-section">
              <h3 className="section-title">
                <BarChart2 size={18} />
                Performance Metrics
              </h3>

              <div className="metrics-grid">
                <div className="metric-card communication">
                  <div className="metric-header">
                    <div className="metric-label">
                      <Mic size={16} />
                      <span>Communication</span>
                    </div>
                    <div className="metric-score">4.2/10</div>
                  </div>
                  <div className="metric-visual">
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: '42%' }}></div>
                    </div>
                    <div className="progress-labels">
                      {[0, 2, 4, 6, 8, 10].map(num => (
                        <span key={num}>{num}</span>
                      ))}
                    </div>
                  </div>
                  <div className="metric-feedback">
                    Needs work. Could be more structured in responses.
                  </div>
                </div>

                <div className="metric-card grammar">
                  <div className="metric-header">
                    <div className="metric-label">
                      <BookOpen size={16} />
                      <span>Grammar</span>
                    </div>
                    <div className="metric-score">7.0/10</div>
                  </div>
                  <div className="metric-visual">
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: '70%' }}></div>
                    </div>
                    <div className="progress-labels">
                      {[0, 2, 4, 6, 8, 10].map(num => (
                        <span key={num}>{num}</span>
                      ))}
                    </div>
                  </div>
                  <div className="metric-feedback">
                    Good, with room for improvement. Watch for grammatical errors.
                  </div>
                </div>

                <div className="metric-card confidence">
                  <div className="metric-header">
                    <div className="metric-label">
                      <Zap size={16} />
                      <span>Confidence</span>
                    </div>
                    <div className="metric-score">4.0/10</div>
                  </div>
                  <div className="metric-visual">
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: '40%' }}></div>
                    </div>
                    <div className="progress-labels">
                      {[0, 2, 4, 6, 8, 10].map(num => (
                        <span key={num}>{num}</span>
                      ))}
                    </div>
                  </div>
                  <div className="metric-feedback">
                    Needs work. Could project more confidence.
                  </div>
                </div>

                <div className="metric-card vocabulary">
                  <div className="metric-header">
                    <div className="metric-label">
                      <MessageSquare size={16} />
                      <span>Vocabulary</span>
                    </div>
                    <div className="metric-score">6.5/10</div>
                  </div>
                  <div className="metric-visual">
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: '65%' }}></div>
                    </div>
                    <div className="progress-labels">
                      {[0, 2, 4, 6, 8, 10].map(num => (
                        <span key={num}>{num}</span>
                      ))}
                    </div>
                  </div>
                  <div className="metric-feedback">
                    Good, with room for improvement. Could use more precise terms.
                  </div>
                </div>
              </div>
            </div>

            <div className="feedback-section">
              <h4>Detailed Feedback</h4>
              <div className="feedback-content">
                <p>{currentQuestion.communicationMetrics?.feedback || 'No specific feedback provided for this question.'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const calculatePerformanceTrend = (scores) => {
    if (scores.length < 3) return null;

    const firstThirdAvg = scores.slice(0, Math.floor(scores.length / 3)).reduce((a, b) => a + b, 0) / Math.floor(scores.length / 3);
    const lastThirdAvg = scores.slice(-Math.floor(scores.length / 3)).reduce((a, b) => a + b, 0) / Math.floor(scores.length / 3);
    const diff = lastThirdAvg - firstThirdAvg;

    let insight = '';
    let icon = <TrendingUp size={16} />;

    if (diff > 1.5) {
      insight = 'Strong improvement throughout the interview (+' + diff.toFixed(1) + ' avg score)';
      icon = <TrendingUp size={16} className="positive" />;
    } else if (diff < -1.5) {
      insight = 'Performance declined significantly (' + diff.toFixed(1) + ' avg score)';
      icon = <TrendingDown size={16} className="negative" />;
    } else if (Math.max(...scores) - Math.min(...scores) > 4) {
      insight = 'Inconsistent performance (large score variations)';
      icon = <Activity size={16} className="neutral" />;
    } else {
      insight = 'Consistent performance throughout';
      icon = <Zap size={16} className="neutral" />;
    }

    return (
      <div className="trend-insight">
        {icon}
        <span>{insight}</span>
      </div>
    );
  };

  const renderSummaryTab = () => (
    <div className="summary-tab">
      <div className="summary-header">
        <div className="summary-score">
          <span className="score-value">{metrics.overallAverage.toFixed(1)}</span>
          <span className="score-label">Overall Score</span>
        </div>
        <h2>Interview Performance Summary</h2>
        <p className="summary-subtitle">
          {metrics.overallAverage >= 8 ? 'Excellent performance! You demonstrated strong communication and technical skills.' :
            metrics.overallAverage >= 6 ? 'Good performance with some areas for improvement.' :
              metrics.overallAverage >= 4 ? 'Average performance with several areas needing work.' : 'Needs significant improvement in multiple areas.'}
        </p>
      </div>

      <div className="summary-content">
        {summary ? (
          <>
            <div className="summary-section strengths">
              <h3>
                <CheckCircle size={20} />
                <span>Strengths</span>
              </h3>
              <ul>
                {summary.strengths.map((strength, index) => (
                  <li key={index}>{strength}</li>
                ))}
              </ul>
            </div>

            <div className="summary-section improvements">
              <h3>
                <XCircle size={20} />
                <span>Areas for Improvement</span>
              </h3>
              <ul>
                {summary.improvements.map((improvement, index) => (
                  <li key={index}>{improvement}</li>
                ))}
              </ul>
            </div>

            <div className="summary-section recommendations">
              <h3>
                <TrendingUp size={20} />
                <span>Recommendations</span>
              </h3>
              <ul>
                {summary.recommendations.map((recommendation, index) => (
                  <li key={index}>{recommendation}</li>
                ))}
              </ul>
            </div>
          </>
        ) : (
          <div className="loading-summary">
            <div className="loading-spinner"></div>
            <p>Generating your personalized summary...</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Navigation Header */}
      <header className="header">
        <div className="header-content">
          <div className="logo-wrapper">
            <div className="logo">
              <img src={logo} alt="Logo" style={{ width: 40, height: 40 }} />
              <span className="logo-text">Voizon</span>
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
                        navigate('/home?tab=profile');
                      }}
                    >
                      <User size={16} /> Manage Account
                    </button>
                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        navigate('/home?tab=plans');
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
                navigate('/home');
              }}
            >
              Home
            </a>
            <a
              className="nav-link"
              onClick={(e) => {
                setMobileMenuOpen(false);
                e.preventDefault();
                navigate('/vault-voices');
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
                      navigate('/home?tab=profile');
                    }}
                  >
                    <User size={16} /> Manage Account
                  </button>
                  <button
                    className="dropdown-item"
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      navigate('/home?tab=plans');
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

      {/* Main Analysis Content */}
      <div className="interview-analysis">
        <div className="interview-header">
          <div className="company-info">
            <div className="company-details">
              <h1>{interviewData.company} Mock Interview Analysis</h1>
              <div className="details-row">
                <span className="role">{interviewData.role} Position</span>
                <span className="date">
                  <Clock size={16} />
                  {new Date(interviewData.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onBack || (() => navigate('/home'))} className="vz-back-btn">
            <ChevronLeft /> Back to Dashboard
          </button>
        </div>

        <div className="analysis-tabs">
          <button
            className={`analysis-tab ${activeTab === 'performance' ? 'active' : ''}`}
            onClick={() => setActiveTab('performance')}
          >
            <Activity size={18} />
            Performance
          </button>
          <button
            className={`analysis-tab ${activeTab === 'questions' ? 'active' : ''}`}
            onClick={() => setActiveTab('questions')}
          >
            <MessageSquare size={18} />
            Questions
          </button>
          <button
            className={`analysis-tab ${activeTab === 'summary' ? 'active' : ''}`}
            onClick={() => setActiveTab('summary')}
          >
            <PieChart size={18} />
            Summary
          </button>
        </div>

        <div className="analysis-content">
          {activeTab === 'performance' && renderPerformanceTab()}
          {activeTab === 'questions' && renderQuestionsTab()}
          {activeTab === 'summary' && renderSummaryTab()}
        </div>
      </div>
    </>
  );
};

export default MockInterviewAnalysis;