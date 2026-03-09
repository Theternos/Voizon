import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import "../styles/ats-report.css";
import { 
  ChevronLeft,
  AlertCircle,
  BarChart2,
  Target,
  Flame,
  TrendingUp,
  Star,
  FileText,
  Check,
  Phone,
  Mail,
  CheckCircle2,
  Trophy,
  Edit2,
  ChevronDown,
  Calendar,
  Search,
  Hash,
  AlertOctagon,
  ArrowDown,
  Zap,
  ArrowUpCircle,
  ArrowDownCircle,
  Circle,
  Clipboard,
  FileCheck,
  Clock,
  Percent,
  ListChecks,
  Award,
  Lightbulb,
  Sword,
  MessageSquareWarning,
  CalendarCheck
} from 'lucide-react';
import { collection, addDoc, serverTimestamp, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/config';

const ATSReport = ({ reportData, onReset, userEmail }) => {
  const [hoveredTag, setHoveredTag] = useState(null);
  const [popupStyle, setPopupStyle] = useState({});

  const updatePopupPosition = (event) => {
    if (!event) return;

    const buttonRect = event.currentTarget.getBoundingClientRect();
    const popupWidth = 250;
    const viewportWidth = window.innerWidth;

    let left = buttonRect.left + (buttonRect.width / 2) - (popupWidth / 2);

    if (left < 10) {
      left = 10;
    }

    if (left + popupWidth > viewportWidth - 10) {
      left = viewportWidth - popupWidth - 10;
    }

    setPopupStyle({
      left: `${left}px`,
      right: 'auto',
      transform: 'none'
    });
  };

  const handleTagHover = (tagId, event) => {
    updatePopupPosition(event);
    setHoveredTag(tagId);
  };
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const saveReport = async () => {
      if (!reportData || !userEmail || userEmail === 'guest@example.com') {
        return;
      }

      try {
        if (!isMounted) return;

        setIsSaving(true);

        const reportId = btoa(JSON.stringify({
          email: userEmail,
          score: reportData.matchScore?.value,
          jobDesc: reportData.jobDescription?.substring(0, 100),
          resumeText: reportData.resumeInfo?.accomplishments?.join(' ').substring(0, 100)
        }));

        const oneHourAgo = new Date();
        oneHourAgo.setHours(oneHourAgo.getHours() - 1);

        const sameReportQuery = query(
          collection(db, 'ats_reports'),
          where('reportId', '==', reportId),
          where('email', '==', userEmail),
          limit(1)
        );

        const sameReportSnapshot = await getDocs(sameReportQuery);

        if (!sameReportSnapshot.empty) {
          const reportData = sameReportSnapshot.docs[0].data();
          const reportTime = reportData.createdAt?.toDate();

          if (reportTime && reportTime > oneHourAgo) {
            return;
          }
        }

        const reportToSave = {
          email: userEmail,
          score: reportData.matchScore?.value || 0,
          reportId: reportId,
          reportData: reportData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          jobTitle: reportData.jobTitle || 'Untitled Job',
          resumeFileName: reportData.fileName || 'resume.txt'
        };

        await addDoc(collection(db, 'ats_reports'), reportToSave);
      } catch (error) {
        console.error('Error saving report: ', error);
      } finally {
        if (isMounted) {
          setIsSaving(false);
        }
      }
    };

    const saveTimer = setTimeout(saveReport, 500);

    return () => {
      isMounted = false;
      clearTimeout(saveTimer);
    };
  }, [reportData, userEmail]);

  return (
    <div className="ats-container">
      <div className="ats-main-content">
        <div className="ats-grid-layout">
          {/* Main Report Section */}
          <div className="ats-report-section">
            {/* Match Report Header */}
            <div className="ats-section-header">
              <div className="ats-section-label">
                <h1>⚡ ATS Compatibility Report</h1>
                {!userEmail && (
                  <div className="ats-auth-notice">
                    <AlertOctagon size={16} />
                    <span>Sign in to save your report history</span>
                  </div>
                )}
              </div>
              <button onClick={() => window.location.reload()} className="vz-back-btn">
                <ChevronLeft size={16} /> Back to Dashboard
              </button>
            </div>

            {/* Overall Score Card */}
            <div className="ats-score-card">
              <div className="ats-score-visual">
                <div className="ats-circular-progress">
                  <svg width="200" height="120" viewBox="0 0 200 120">
                    <defs>
                      <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#EF4444" />
                        <stop offset="25%" stopColor="#F59E0B" />
                        <stop offset="50%" stopColor="#3B82F6" />
                        <stop offset="100%" stopColor="#22C55E" />
                      </linearGradient>
                    </defs>
                    <path
                      className="ats-progress-bg"
                      d="M 20,100 A 80,80 0 0 1 180,100"
                      fill="none"
                      stroke="#E2E8F0"
                      strokeWidth="16"
                    />
                    <path
                      d="M 20,100 A 80,80 0 0 1 56.57,34.43"
                      fill="none"
                      stroke="#EF4444"
                      strokeWidth="16"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 143.43,34.43 A 80,80 0 0 1 180,100"
                      fill="none"
                      stroke="#22C55E"
                      strokeWidth="16"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 56.57,34.43 A 80,80 0 0 1 100,20"
                      fill="none"
                      stroke="#F59E0B"
                      strokeWidth="16"
                      strokeLinecap=""
                    />
                    <path
                      d="M 100,20 A 80,80 0 0 1 143.43,34.43"
                      fill="none"
                      stroke="#3B82F6"
                      strokeWidth="16"
                      strokeLinecap=""
                    />
                  </svg>

                  <div
                    className="ats-score-needle"
                    style={{ transform: `translateX(-50%) rotate(${-90 + (reportData.matchScore.value / 100) * 180}deg)` }}
                  ></div>
                  <div className="ats-needle-center"></div>
                  <div className="ats-meter-labels">
                    <span className="ats-label-poor">POOR</span>
                    <span className="ats-label-good">GOOD</span>
                  </div>
                  <div className="ats-score-valuee">{reportData.matchScore.value}</div>
                  <div className="ats-score-labell">Match Score</div>
                </div>
              </div>
              <div className="ats-score-details">
                <div className="ats-score-message">
                  <h3>{reportData.matchScore.message}</h3>
                  <div className="ats-score-pill">
                    {reportData.matchScore.value >= 80 ? (
                      <span className="ats-pill-success"><Target size={14} /> Excellent Match</span>
                    ) : reportData.matchScore.value >= 60 ? (
                      <span className="ats-pill-warning"><TrendingUp size={14} /> Good Match</span>
                    ) : (
                      <span className="ats-pill-danger"><AlertCircle size={14} /> Needs Improvement</span>
                    )}
                  </div>
                </div>
                <p className="ats-score-description">{reportData.matchScore.description}</p>
                <div className="ats-score-meter-container">
                  <div className="ats-score-meter">
                    <div className="ats-meter-fill" style={{ width: `${reportData.matchScore.value}%` }}></div>
                    <div className="ats-meter-outline" style={{ width: `100%` }}></div>
                    <div className="ats-meter-target" style={{ left: '80%' }}>
                      <div className="ats-meter-target-dot"></div>
                      <div className="ats-meter-target-label">Target</div>
                    </div>
                  </div>
                  <div className="ats-meter-labels">
                    <span>0%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Skills Sections */}
            <div className="ats-skills-section">
              {/* High Impact Skills */}
              <div className="ats-skill-category">
                <div className="ats-category-header">
                  <div className="ats-impact-indicator high-impact">
                    <span className="ats-impact-icon">
                      <Flame size={16} />
                    </span>
                    <span>High Impact Skills</span>
                    <span className="ats-impact-badge">Priority</span>
                  </div>
                  <div className="ats-category-summary">
                    <span className="ats-missing-count">{reportData.skills.highImpact.missingCount} missing</span>
                    <span className="ats-progress-value">{reportData.skills.highImpact.matchPercentage}% match</span>
                  </div>
                </div>

                <div className="ats-skill-card warning">
                  <div className="ats-skill-details">
                    <div className="ats-skill-header">
                      <h4>{reportData.skills.highImpact.title}</h4>
                    </div>
                    <div className="ats-progress-container">
                      <div className="ats-progress-bar" style={{ width: `${reportData.skills.highImpact.matchPercentage}%` }}></div>
                    </div>
                    <div className="ats-skill-content">
                      <p>{reportData.skills.highImpact.description}</p>
                      <div className="ats-skill-tags">
                        {reportData.skills.highImpact.keywords.map((keyword, index) => (
                          <span key={index} className="ats-skill-tag">
                            <span>{keyword}</span>
                            <Check size={16} />
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Medium Impact Skills */}
              <div className="ats-skill-category">
                <div className="ats-category-header">
                  <div className="ats-impact-indicator medium-impact">
                    <span className="ats-impact-icon">
                      <TrendingUp size={16} />
                    </span>
                    <span>Medium Impact Skills</span>
                  </div>
                  <div className="ats-category-summary">
                    <span className="ats-missing-count">{reportData.skills.mediumImpact.missingCount} missing</span>
                    <span className="ats-progress-value">{reportData.skills.mediumImpact.matchPercentage}% match</span>
                  </div>
                </div>

                <div className="ats-skill-card caution">
                  <div className="ats-skill-details">
                    <div className="ats-skill-header">
                      <h4>{reportData.skills.mediumImpact.title}</h4>
                    </div>
                    <div className="ats-progress-container">
                      <div className="ats-progress-bar" style={{ width: `${reportData.skills.mediumImpact.matchPercentage}%` }}></div>
                    </div>
                    <div className="ats-skill-content">
                      <p>{reportData.skills.mediumImpact.description}</p>
                      <div className="ats-skill-tags">
                        {reportData.skills.mediumImpact.keywords.map((keyword, index) => (
                          <span key={index} className="ats-skill-tag">
                            <span>{keyword}</span>
                            <Check size={16} />
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Low Impact Skills */}
              <div className="ats-skill-category">
                <div className="ats-category-header">
                  <div className="ats-impact-indicator low-impact">
                    <span className="ats-impact-icon">
                      <Star size={16} />
                    </span>
                    <span>Low Impact Skills</span>
                  </div>
                  <div className="ats-category-summary">
                    <span className="ats-missing-count">{reportData.skills.lowImpact.missingCount} missing</span>
                    <span className="ats-progress-value">{reportData.skills.lowImpact.matchPercentage}% match</span>
                  </div>
                </div>

                <div className="ats-skill-card success">
                  <div className="ats-skill-details">
                    <div className="ats-skill-header">
                      <h4>{reportData.skills.lowImpact.title}</h4>
                    </div>
                    <div className="ats-progress-container">
                      <div className="ats-progress-bar" style={{ width: `${reportData.skills.lowImpact.matchPercentage}%` }}></div>
                    </div>
                    <div className="ats-skill-content">
                      <p>{reportData.skills.lowImpact.description}</p>
                      <div className="ats-skill-tags">
                        {reportData.skills.lowImpact.keywords.map((keyword, index) => (
                          <span key={index} className="ats-skill-tag">
                            <span>{keyword}</span>
                            <Check size={16} />
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Resume Checks Section */}
            <div className="ats-section-header">
              <div className="ats-section-label">
                <Clipboard size={16} className="ats-section-icon" />
                Resume Analysis
              </div>
            </div>

            <div className="ats-resume-checks">
              {/* Word Count */}
              <div className="ats-check-card success">
                <div className="ats-check-icon">
                  <FileText size={16} />
                </div>
                <div className="ats-check-content">
                  <h4>Word Count</h4>
                  <p>
                    Your resume has <strong>{reportData.resumeInfo.wordCount} words</strong>,
                    {
                      reportData.resumeInfo.wordCount < 500
                        ? ' which is below the recommended range (500–700). Try expanding your content.'
                        : reportData.resumeInfo.wordCount <= 700
                          ? ' which is within the ideal 500–700 word range. Great job!'
                          : ' which is above the recommended range (700+). Consider trimming it down for clarity.'
                    }
                  </p>
                </div>
              </div>

              {/* Contact Info */}
              <div className="ats-contact-info">
                <div className="ats-check-card success">
                  <div className="ats-check-icon">
                    <Phone size={16} />
                  </div>
                  <div className="ats-check-content">
                    <h4>Phone Number</h4>
                    <p><strong>{reportData.resumeInfo.phone}</strong></p>
                  </div>
                </div>
                <div className="ats-check-card success">
                  <div className="ats-check-icon">
                    <Mail size={16} />
                  </div>
                  <div className="ats-check-content">
                    <h4>Email Address</h4>
                    <p><strong>{reportData.resumeInfo.email}</strong></p>
                  </div>
                </div>
              </div>

              {/* Accomplishments */}
              <div className="ats-check-card success">
                <div className="ats-check-icon">
                  <Trophy size={16} />
                </div>
                <div className="ats-check-content">
                  <h4>Highlights</h4>
                  <p>Your resume includes <strong>{reportData.resumeInfo.accomplishments.length} quantifiable deliverables</strong>:</p>
                  <ul className="ats-accomplishments-list">
                    {reportData.resumeInfo.accomplishments.map((item, index) => (
                      <li key={index}>
                        <CheckCircle2 size={16} className="ats-accomplishment-icon" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Writing Quality */}
              <div className="ats-writing-quality">
                <div className="ats-writing-header">
                  <h3 className="ats-writing-title">
                    <Edit2 size={16} className="ats-writing-title-icon" />
                    Writing Quality Analysis
                  </h3>
                  <p className="ats-writing-subtitle">Optimize your resume content for better readability and impact</p>
                </div>

                {/* Buzz Words */}
                <div className="ats-writing-card">
                  <div className="ats-writing-header">
                    <div className="ats-writing-icon">
                      <ArrowUpCircle size={16} />
                    </div>
                    <h4>{reportData.writingAnalysis.buzzwords.title}</h4>
                  </div>
                  <p>{reportData.writingAnalysis.buzzwords.description}</p>
                  <div className="ats-writing-tags">
                    {reportData.writingAnalysis.buzzwords.words.map((word, index) => (
                      <div
                        key={index}
                        className="ats-writing-tag-container"
                        onMouseEnter={(e) => handleTagHover(`buzzwords-${index}`, e)}
                        onClick={(e) => handleTagHover(`buzzwords-${index}`, e)}
                        onMouseLeave={() => setHoveredTag(null)}
                      >
                        <span className="ats-writing-tag buzzword ">
                          <span>{word}</span>
                          <ChevronDown size={16} className="ats-tag-arrow" />
                        </span>
                        {hoveredTag === `buzzwords-${index}` && (
                          <div className="ats-suggestion-modal" style={popupStyle}>
                            <div className="ats-suggestion-modal-header">
                              <h5>Suggested Alternatives</h5>
                            </div>
                            <div className="ats-suggestion-modal-content">
                              <ul>
                                <li>
                                  <span className="ats-suggestion-alternate">{reportData.writingAnalysis.buzzwords.alternate[index]}</span>
                                </li>
                              </ul>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Verb Choice */}
                <div className="ats-writing-card">
                  <div className="ats-writing-header">
                    <div className="ats-writing-icon">
                      <ArrowDownCircle size={16} />
                    </div>
                    <h4>{reportData.writingAnalysis.verbs.title}</h4>
                  </div>
                  <p>{reportData.writingAnalysis.verbs.description}</p>
                  <div className="ats-writing-tags">
                    {reportData.writingAnalysis.verbs.words.map((word, index) => (
                      <div
                        key={index}
                        className="ats-writing-tag-container"
                        onMouseEnter={(e) => handleTagHover(`verbs-${index}`, e)}
                        onClick={(e) => handleTagHover(`verbs-${index}`, e)}
                        onMouseLeave={() => setHoveredTag(null)}
                      >
                        <span className="ats-writing-tag verb">
                          <span>{word}</span>
                          <ChevronDown size={16} className="ats-tag-arrow" />
                        </span>
                        {hoveredTag === `verbs-${index}` && (
                          <div className="ats-suggestion-modal" style={popupStyle}>
                            <div className="ats-suggestion-modal-header">
                              <h5>Suggested Stronger Verbs</h5>
                            </div>
                            <div className="ats-suggestion-modal-content">
                              <ul>
                                <li>
                                  <span className="ats-suggestion-alternate">{reportData.writingAnalysis.verbs.alternate[index]}</span>
                                </li>
                              </ul>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* First-person Language */}
                <div className="ats-writing-card">
                  <div className="ats-writing-header">
                    <div className="ats-writing-icon">
                      <MessageSquareWarning size={16} />
                    </div>
                    <h4>{reportData.writingAnalysis.pronouns.title}</h4>
                  </div>
                  <p>{reportData.writingAnalysis.pronouns.description}</p>
                  <div className="ats-writing-tags">
                    {reportData.writingAnalysis.pronouns.words.map((word, index) => (
                      <div
                        key={index}
                        className="ats-writing-tag-container"
                        onMouseEnter={(e) => handleTagHover(`pronouns-${index}`, e)}
                        onClick={(e) => handleTagHover(`pronouns-${index}`, e)}
                        onMouseLeave={() => setHoveredTag(null)}
                      >
                        <span className="ats-writing-tag pronoun">
                          <span>{word}</span>
                          <ChevronDown size={16} className="ats-tag-arrow" />
                        </span>
                        {hoveredTag === `pronouns-${index}` && (
                          <div className="ats-suggestion-modal" style={popupStyle}>
                            <div className="ats-suggestion-modal-header">
                              <h5>Suggested Alternatives</h5>
                            </div>
                            <div className="ats-suggestion-modal-content">
                              <ul>
                                <li>
                                  <span className="ats-suggestion-alternate">{reportData.writingAnalysis.pronouns.alternate[index]}</span>
                                </li>
                              </ul>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Date Formatting */}
              <div className={`ats-check-card ${reportData.dateCheck.format_issue || reportData.dateCheck.order_issue ? "warning" : "success"}`}>
                <div className="ats-check-icon">
                  <CalendarCheck size={16} />
                </div>
                <div className="ats-check-content">
                  <h4>Date Formatting</h4>
                  {reportData.dateCheck.format_issue || reportData.dateCheck.order_issue ? (
                    <div>
                      {reportData.dateCheck.format_issue && (
                        <p>
                          Date format is incorrect. Found format: <span className="ats-format-badge">{reportData.dateCheck.existing_format}</span>.<br />
                          Use <strong>MMM YYYY – MMM YYYY</strong> (e.g., <em>Jan 2023 – Jun 2024</em>).
                        </p>
                      )}
                      {reportData.dateCheck.order_issue && (
                        <p>
                          Sections like experience or education are not in reverse chronological order.<br />
                          Please reorder from latest to oldest.
                        </p>
                      )}
                    </div>
                  ) : (
                    <p>All dates follow the correct format and are sorted in descending order.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Keywords Table */}
            <div className="ats-keywords-section">
              <div className="ats-section-header">
                <div className="ats-section-label">
                  <Search size={16} className="ats-section-icon" />
                  Keyword Analysis
                </div>
              </div>
              <div className="ats-keywords-table-container">
                <div className="ats-keywords-table">
                  <div className="ats-table-header">
                    <div className="ats-table-col keyword">Keyword</div>
                    <div className="ats-table-col type">Type</div>
                    <div className="ats-table-col score">Score</div>
                    <div className="ats-table-col count">Resume</div>
                    <div className="ats-table-col count">Job</div>
                  </div>
                  <div className="ats-table-body">
                    {reportData.keywords.map((keyword, index) => (
                      <div key={index} className="ats-table-row">
                        <div className="ats-table-col keyword" data-label="Keyword">
                          <button className="ats-keyword-btn">
                            <Hash size={16} className="ats-keyword-icon" />
                            {keyword.keyword}
                          </button>
                        </div>
                        <div className="ats-table-col type" data-label="Type">
                          <span className={`ats-tag ${keyword.type.toLowerCase()}`}>
                            {keyword.type}
                          </span>
                        </div>
                        <div className="ats-table-col score" data-label="Score">
                          <div className="ats-score-indicator">
                            <div className="ats-score-bar" style={{ width: `${keyword.score}%` }}></div>
                            <span className={`ats-score-value ${keyword.score === 100 ? 'perfect' : keyword.score > 70 ? 'good' : 'poor'}`}>
                              {keyword.score}%
                            </span>
                          </div>
                        </div>
                        <div className="ats-table-col count" data-label="Resume">
                          <span className="ats-count">{keyword.resumeCount}</span>
                        </div>
                        <div className="ats-table-col count" data-label="Job">
                          <span className="ats-count">{keyword.jobCount}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Job Description Sidebar */}
          <div className="ats-job-description">
            <div className="ats-description-header">
              <div className="ats-description-header-content">
                <h3><FileText size={16} className="ats-section-icon" /> Job Description</h3>
              </div>
            </div>
            <div className="ats-description-content">
              <div className="ats-description-text">
                <p>{reportData.jobDescription}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ATSReport;