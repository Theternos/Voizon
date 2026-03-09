import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import '../styles/resume-ats.css';
import RichTextEditor from './RichTextEditor';
import ATSReport from "./ats-report";
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';  // Use legacy build for browser compatibility
import { auth, db } from '../firebase/config';
import { useLocation, useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { ChevronLeft, ChevronRight } from "lucide-react";

const ATSAnalyser = ({ setShowPlansModal, setActiveView, onBack }) => {
    // Handle back navigation
    const handleBack = () => {
        if (onBack) {
            onBack();
        } else if (setActiveView) {
            setActiveView("home");
        } else {
            // Fallback to navigation if no handlers provided
            navigate(-1);
        }
    };
    const [jobDescription, setJobDescription] = useState('');
    const [resume, setResume] = useState('');
    const [fileName, setFileName] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const [scanResults, setScanResults] = useState(null);
    const [jobContent, setJobContent] = useState('');
    const [resumeContent, setResumeContent] = useState('');
    const [error, setError] = useState(null);
    const componentRef = useRef(null);
    const fileInputRef = useRef(null);
    const backend_url = process.env.REACT_APP_BACKEND_URL;
    const email = localStorage.getItem("userEmail");
    const location = useLocation();
    const [scanHistory, setScanHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [isViewingReport, setIsViewingReport] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 8;
    const navigate = useNavigate();

    // Add this useEffect to fetch scan history
    useEffect(() => {
        const fetchScanHistory = async () => {
            if (!email) return;

            setLoadingHistory(true);
            try {
                const q = query(
                    collection(db, 'ats_reports'),
                    where('email', '==', email)
                    // Removed orderBy('createdAt', 'desc')
                );
                const querySnapshot = await getDocs(q);
                const history = [];

                querySnapshot.forEach((doc) => {
                    history.push({
                        id: doc.id,
                        ...doc.data(),
                        createdAt: doc.data().createdAt.toDate()
                    });
                });

                // 🔽 Sort manually by createdAt (descending)
                history.sort((a, b) => {
                    return new Date(b.createdAt) - new Date(a.createdAt);
                });

                setScanHistory(history);
            } catch (error) {
                console.error('Error fetching scan history:', error);
                setError('Failed to load scan history');
            } finally {
                setLoadingHistory(false);
            }
        };

        fetchScanHistory();
    }, [email]);


    const [userPlan, setUserPlan] = useState(null);
    const [loadingPlan, setLoadingPlan] = useState(true);

    useEffect(() => {
        const fetchUserPlan = async () => {
            const email = localStorage.getItem("userEmail");
            if (!email) return;

            try {
                const userPlanRef = doc(db, "userPlans", email);
                const docSnap = await getDoc(userPlanRef);

                if (docSnap.exists()) {
                    setUserPlan(docSnap.data());
                }
            } catch (err) {
                console.error("Error fetching user plan:", err);
            } finally {
                setLoadingPlan(false);
            }
        };

        fetchUserPlan();
    }, []);

    // Add this helper function
    const getScoreClass = (score) => {
        if (score >= 75) return 'excellent';
        if (score >= 50) return 'good';
        if (score >= 25) return 'fair';
        return 'poor';
    };


    // Scroll to top when component mounts or location changes
    useEffect(() => {
        // Scroll to top immediately
        window.scrollTo(0, 0);

        // Smooth scroll to top after a small delay to ensure the component is fully rendered
        const timer = setTimeout(() => {
            window.scrollTo({
                top: 0,
                left: 0,
                behavior: 'smooth'
            });

            // Try to scroll the main container if it exists
            const mainContainer = document.querySelector('.main-content');
            if (mainContainer) {
                mainContainer.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }, 100);

        return () => clearTimeout(timer);
    }, [location]);

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setFileName(file.name);
        setError(null);

        try {
            console.log('Uploading file:', file.name, 'Type:', file.type, 'Size:', file.size);
            const content = await readFileContent(file);
            console.log('File content successfully read');
            setResume(content);
            setResumeContent(content);
        } catch (error) {
            console.error('File upload error:', {
                error: error.message,
                stack: error.stack,
                fileName: file.name,
                fileType: file.type
            });
            setError(`Failed to read file: ${error.message}`);
            setFileName('');
            fileInputRef.current.value = '';
        }
    };

    const readFileContent = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onerror = (error) => {
                console.error('FileReader error:', {
                    error: error,
                    file: file.name,
                    type: file.type
                });
                reject(new Error('Failed to read file content'));
            };

            if (file.type === 'application/pdf') {
                console.log("📄 Reading a PDF file...");

                reader.onload = async (event) => {
                    try {
                        const pdfjsLib = window['pdfjs-dist/build/pdf'];
                        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

                        const typedArray = new Uint8Array(event.target.result);
                        const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;

                        let fullText = '';
                        for (let i = 1; i <= pdf.numPages; i++) {
                            const page = await pdf.getPage(i);
                            const content = await page.getTextContent();
                            const strings = content.items.map(item => item.str).join(' ');
                            fullText += strings + '\n';
                        }

                        console.log("✅ PDF text extraction complete");
                        resolve(fullText);
                    } catch (err) {
                        console.error("❌ Failed to parse PDF:", err);
                        reject(new Error("PDF parsing failed"));
                    }
                };

                reader.readAsArrayBuffer(file);
            } else {
                reader.onload = (event) => {
                    console.log('📄 Non-PDF file read successfully');
                    resolve(event.target.result);
                };
                reader.readAsText(file);
            }
        });
    };


    useEffect(() => {
        // Smooth scroll to top of the page
        window.scrollTo({
            top: 0,
            left: 0,
            behavior: 'smooth'
        });

        // Also scroll the component into view as a fallback
        if (componentRef.current) {
            componentRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, []);

    const handleScan = async () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });

        if (!jobDescription.trim() || !resume.trim()) {
            setError('Please provide both job description and resume content');
            return;
        }

        setIsScanning(true);
        setError(null);
        console.log('Starting resume analysis...', {
            jobDescLength: jobDescription.length,
            resumeLength: resume.length
        });

        try {
            const startTime = performance.now();
            const response = await fetch(`${backend_url}/api/analyze-resume`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    resumeText: resume,
                    jobDescription,
                    email
                }),
            });

            const responseTime = performance.now() - startTime;
            console.log(`API response received in ${responseTime.toFixed(2)}ms`, {
                status: response.status,
                ok: response.ok
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('API error response:', {
                    status: response.status,
                    statusText: response.statusText,
                    errorData
                });
                throw new Error(errorData.message || `Server responded with status ${response.status}`);
            }

            // Simulate a minimum loading time for better UX
            const MIN_LOADING_TIME = 2000; // 2 seconds
            const elapsedTime = performance.now() - startTime;
            const remainingTime = Math.max(0, MIN_LOADING_TIME - elapsedTime);

            // Only wait if we haven't reached the minimum loading time
            if (remainingTime > 0) {
                await new Promise(resolve => setTimeout(resolve, remainingTime));
            }

            const data = await response.json();
            console.log('Analysis successful:', {
                matchScore: data.matchScore?.value,
                keywordsCount: data.keywords?.length
            });
            setScanResults(data);
        } catch (error) {
            console.error('Analysis failed:', {
                error: error.message,
                stack: error.stack,
                jobDescSample: jobDescription.substring(0, 100),
                resumeSample: resume.substring(0, 100)
            });
            setError(`Analysis failed: ${error.message}. Please try again.`);
        } finally {
            setIsScanning(false);
        }
    };

    const handleReset = () => {
        console.log('Resetting form...');
        setScanResults(null);
        setJobDescription('');
        setJobContent('');
        setResume('');
        setResumeContent('');
        setFileName('');
        setError(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const isScanReady = jobContent.trim() && (resumeContent.trim() || fileName);

    if (scanResults) {
        const userEmail = auth.currentUser?.email || 'guest@example.com';
        return <ATSReport reportData={scanResults} onReset={handleReset} userEmail={userEmail} />;
    }

    // Full-screen loader component
    // Full-screen loader component
    const FullScreenLoader = () => (
        <div className={`fullscreen-loader ${isScanning || isViewingReport ? 'active' : ''}`}>
            <div className="loader-content">
                <div className="loader-spinner"></div>
                <h2 className="loader-title">
                    {isViewingReport ? 'Loading Report' : 'Analyzing Your Resume'}
                </h2>
                <p className="loader-subtitle">
                    {isViewingReport ? 'Preparing your scan results...' : 'Processing your resume against the job description'}
                </p>
            </div>
        </div>
    );

    return (
        <div className="job-app-container" ref={componentRef}>
            {(isScanning || isViewingReport) && <FullScreenLoader />}
            <div className="job-app-header">
                <div className="job-app-title-container">
                    <h1 className="job-app-title">
                        ATS Resume Analyzer
                        <span className="job-app-beta-tag">Beta</span>
                        <div className="sparkle-container">
                            {[...Array(4)].map((_, i) => (
                                <div
                                    key={i}
                                    className="sparkle"
                                    style={{
                                        '--delay': `${i * 0.3}s`,
                                        '--distance': `${Math.random() * 30 + 15}px`,
                                        '--angle': `${Math.random() * 360}deg`,
                                        '--duration': `${Math.random() * 1.5 + 1}s`,
                                        '--opacity': `${Math.random() * 0.7 + 0.3}`
                                    }}
                                >
                                    <svg viewBox="0 0 36 36" className="sparkle-svg">
                                        <path fill="#FFAC33" d="M34.347 16.893l-8.899-3.294l-3.323-10.891a1 1 0 0 0-1.912 0l-3.322 10.891l-8.9 3.294a1 1 0 0 0 0 1.876l8.895 3.293l3.324 11.223a1 1 0 0 0 1.918-.001l3.324-11.223l8.896-3.293a.998.998 0 0 0-.001-1.875z"></path>
                                        <path fill="#FFCC4D" d="M14.347 27.894l-2.314-.856l-.9-3.3a.998.998 0 0 0-1.929-.001l-.9 3.3l-2.313.856a1 1 0 0 0 0 1.876l2.301.853l.907 3.622a1 1 0 0 0 1.94-.001l.907-3.622l2.301-.853a.997.997 0 0 0 0-1.874zM10.009 6.231l-2.364-.875l-.876-2.365a.999.999 0 0 0-1.876 0l-.875 2.365l-2.365.875a1 1 0 0 0 0 1.876l2.365.875l.875 2.365a1 1 0 0 0 1.876 0l.875-2.365l2.365-.875a1 1 0 0 0 0-1.876z"></path>
                                    </svg>
                                </div>
                            ))}
                        </div>
                    </h1>
                </div>
                <p className="job-app-subtitle">
                    AI-powered resume optimization for Applicant Tracking Systems
                </p>
                <div className="job-app-header-divider"></div>
            </div>

            {error && (
                <div className="job-app-error">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 8V12M12 16H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="#e53e3e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>{error}</span>
                    <button onClick={() => setError(null)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M6 18L18 6M6 6L18 18" stroke="#e53e3e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>
            )}
            <div className="job-app-bottom-section">
                <button
                    className="back-to-dashboard-btn secondary"
                    onClick={handleBack}
                >
                    ← &nbsp; Back to Dashboard
                </button>
                <button
                    className={`job-app-scan-btn ${!isScanReady ? 'disabled' : ''}`}
                    onClick={handleScan}
                    disabled={isScanning || !isScanReady}
                >
                    {isScanning ? (
                        <>
                            <svg className="job-app-spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 9.27455 20.9097 6.80375 19.1414 5" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                            </svg>
                            Analyzing Resume...
                        </>
                    ) : (
                        <>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M19 21C19 17.134 15.866 14 12 14C8.13401 14 5 17.134 5 21M12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7C16 9.20914 14.2091 11 12 11Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            Analyze My Resume
                        </>
                    )}
                </button>
            </div>
            <div className="job-app-main-content">
                {/* Step 1: Job Description */}
                <div className="job-app-step job-app-step-1">
                    <div className="job-app-step-header">
                        <div className="job-app-step-number">1</div>
                        <div className="job-app-step-text">
                            <div className="job-app-step-title">Job Details</div>
                            <div className="job-app-step-subtitle">Paste the job description you're applying for</div>
                        </div>
                    </div>

                    <div className="rich-text-editor-containerr">
                        <RichTextEditor
                            value={jobContent}
                            onChange={(content) => {
                                setJobContent(content);
                                setJobDescription(content);
                            }}
                            placeholder="Paste the full job description here..."
                            height="270px"
                        />
                    </div>

                    <div className="job-app-note">
                        <div className="job-app-note-icon">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#4299e1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M12 8V12M12 16H12.01" stroke="#4299e1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <div className="job-app-note-content">
                            <strong>Pro Tip:</strong> For best results, include the full job description with responsibilities and requirements.
                        </div>
                    </div>
                </div>

                {/* Step 2: Resume Upload */}
                <div className="job-app-step job-app-step-2">
                    <div className="job-app-step-header">
                        <div className="job-app-step-number">2</div>
                        <div className="job-app-step-text">
                            <div className="job-app-step-title">Your Resume</div>
                            <div className="job-app-step-subtitle">Upload or paste your current resume</div>
                        </div>
                    </div>

                    <input
                        type="file"
                        id="resume-upload"
                        className="job-app-upload-input"
                        accept=".txt,.pdf,.doc,.docx"
                        onChange={handleFileUpload}
                        ref={fileInputRef}
                    />

                    <div className="job-app-upload-container">
                        <label htmlFor="resume-upload" className="job-app-upload-area">
                            <div className="job-app-upload-icon">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="#4299e1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M17 8L12 3L7 8" stroke="#4299e1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M12 3V15" stroke="#4299e1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <div className="job-app-upload-text-container">
                                <div className="job-app-upload-text">Drag & drop your resume here</div>
                                <div className="job-app-upload-subtext">or click to browse files (PDF, DOC, DOCX, TXT)</div>
                            </div>
                        </label>

                        {fileName && (
                            <div className="job-app-file-info">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="#38a169" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                <span className="job-app-file-name">{fileName}</span>
                                <button
                                    className="job-app-clear-btn"
                                    onClick={() => {
                                        setFileName('');
                                        setResume('');
                                        setResumeContent('');
                                        fileInputRef.current.value = '';
                                    }}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M6 18L18 6M6 6L18 18" stroke="#e53e3e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="job-app-divider">
                        <span>or paste your resume below</span>
                    </div>

                    <div className="rich-text-editor-containerr">
                        <RichTextEditor
                            value={resumeContent}
                            onChange={(content) => {
                                setResumeContent(content);
                                setResume(content);
                            }}
                            placeholder="Paste your resume content here (formatted text works best)..."
                            height="200px"
                        />
                    </div>
                </div>
            </div>

            {!scanResults && (
                <div className="scan-history-section">
                    <h3 className="scan-history-title">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                            <polyline points="10 9 9 9 8 9"></polyline>
                        </svg>
                        Scan History
                    </h3>

                    {loadingHistory ? (
                        <div className="scan-history-loading">
                            <div className="loader-spinner small"></div>
                            Loading your scan history...
                        </div>
                    ) : scanHistory.length > 0 ? (
                        <div className="scan-history-table-container">
                            <div className="scan-history-wrapper">
                                <table className="scan-history-table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Job Title</th>
                                            <th>Score</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {/* Display paginated results for premium users, first 3 for free */}
                                        {(userPlan?.planId === "free"
                                            ? scanHistory.slice(0, 3)
                                            : scanHistory.slice(
                                                (currentPage - 1) * rowsPerPage,
                                                currentPage * rowsPerPage
                                            )
                                        ).map((scan) => (
                                            <tr key={scan.id}>
                                                <td data-label="Date">
                                                    <span>
                                                        {new Date(scan.createdAt).toLocaleString('en-IN', {
                                                            timeZone: 'Asia/Kolkata',
                                                            year: 'numeric',
                                                            month: 'short',
                                                            day: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                            hour12: true
                                                        })}
                                                    </span>
                                                </td>
                                                <td data-label="Job Title">
                                                    <span>{scan.jobTitle || 'Untitled Job'}</span>
                                                </td>
                                                <td data-label="Score">
                                                    <span className={`score-badge ${getScoreClass(scan.score)}`}>
                                                        {scan.score}%
                                                    </span>
                                                </td>
                                                <td data-label="Actions">
                                                    <button
                                                        className="view-scan-btn"
                                                        onClick={async () => {
                                                            setIsViewingReport(true);
                                                            await new Promise(resolve => setTimeout(resolve, 1000));
                                                            setScanResults(scan.reportData);
                                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                                            setIsViewingReport(false);
                                                        }}
                                                    >
                                                        View
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}

                                        {/* Locked rows section for free users */}
                                        {userPlan?.planId === "free" && scanHistory.length > 3 && (
                                            <tr className="locked-section">
                                                <td colSpan="4">
                                                    <div className="locked-rows-overlay-container">
                                                        <div className="locked-rows-content">
                                                            {scanHistory.slice(3, 6).map((scan) => (
                                                                <div key={scan.id} className="locked-row">
                                                                    {/* Date Column */}
                                                                    <div className="locked-cell" data-label="Date">
                                                                        <div className="locked-content">
                                                                            <svg className="lock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                                                                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                                                            </svg>
                                                                            <span className="locked-text">Hidden</span>
                                                                        </div>
                                                                    </div>

                                                                    {/* Job Title Column */}
                                                                    <div className="locked-cell" data-label="Job Title">
                                                                        <div className="locked-content">
                                                                            <span className="locked-text">Hidden</span>
                                                                        </div>
                                                                    </div>

                                                                    {/* Score Column */}
                                                                    <div className="locked-cell" data-label="Score">
                                                                        <div className="locked-content">
                                                                            <span className="score-badge locked">Locked</span>
                                                                        </div>
                                                                    </div>

                                                                    {/* Actions Column */}
                                                                    <div className="locked-cell" data-label="Actions">
                                                                        <button className="view-scan-btn" disabled>
                                                                            View
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        {/* Upgrade Message */}
                                                        <div className="upgrade-message">
                                                            <h3>Unlock Full History</h3>
                                                            <p>Upgrade to view your complete scan history and access premium features.</p>
                                                            <button className="upgrade-btn" onClick={() => {
                                                                setShowPlansModal(true);
                                                            }}>
                                                                Upgrade Plan
                                                            </button>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination controls - only for premium users with enough items */}
                            {userPlan?.planId !== "free" && scanHistory.length > rowsPerPage && (
                                <div className="pagination-container">
                                    <div className="pagination-info">
                                        Showing {(currentPage - 1) * rowsPerPage + 1}-
                                        {Math.min(currentPage * rowsPerPage, scanHistory.length)} of {scanHistory.length}
                                    </div>
                                    <div className="pagination-controls">
                                        <button
                                            className="pagination-btn"
                                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                            disabled={currentPage === 1}
                                        >
                                            <ChevronLeft size={18} />
                                        </button>
                                        {Array.from({ length: Math.ceil(scanHistory.length / rowsPerPage) }, (_, i) => {
                                            // Show limited page numbers on mobile
                                            if (window.innerWidth < 768 &&
                                                (i + 1 < currentPage - 1 || i + 1 > currentPage + 1) &&
                                                i + 1 !== 1 &&
                                                i + 1 !== Math.ceil(scanHistory.length / rowsPerPage)) {
                                                return null;
                                            }

                                            return (
                                                <button
                                                    key={i + 1}
                                                    className={`pagination-btn ${currentPage === i + 1 ? 'active' : ''}`}
                                                    onClick={() => setCurrentPage(i + 1)}
                                                >
                                                    {i + 1}
                                                </button>
                                            );
                                        })}
                                        <button
                                            className="pagination-btn"
                                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(scanHistory.length / rowsPerPage)))}
                                            disabled={currentPage === Math.ceil(scanHistory.length / rowsPerPage)}
                                        >
                                            <ChevronRight size={18} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="scan-history-empty">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                <line x1="16" y1="17" x2="8" y2="17"></line>
                                <polyline points="10 9 9 9 8 9"></polyline>
                            </svg>
                            <p>No previous scans found</p>
                            <p className="text-sm text-gray-500">Your scan history will appear here after your first analysis</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

ATSAnalyser.propTypes = {
  onBack: PropTypes.func,
  setShowPlansModal: PropTypes.func.isRequired
};

export default ATSAnalyser;