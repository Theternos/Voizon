import React, { useState, useEffect } from "react";
import logo from "../images/logo_bg.png";
import logo_white from "../images/logo_white.png";
import { useNavigate, useLocation } from "react-router-dom";

import {
  Menu,
  X,
  User,
  Shield,
  Mail,
  Phone,
  MapPin,
  FileText,
  Scale,
  RefreshCw,
  HelpCircle,
  Book,
  Activity,
  Building,
  Users,
  MessageCircle,
  ChevronRight,
  Linkedin,
  Github,
  Twitter,
} from "lucide-react";
import "../styles/support.css"; // Import your CSS styles

const NavigationUI = () => {
  const [activeTab, setActiveTab] = useState("Company");
  const [activeSubTab, setActiveSubTab] = useState("About");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigationData = {
    Company: {
      subItems: [
        { key: "About", label: "About", icon: <Users className="w-4 h-4" /> },
        {
          key: "Contact",
          label: "Contact",
          icon: <Mail className="w-4 h-4" />,
        },
      ],
    },
    Legal: {
      subItems: [
        {
          key: "Privacy",
          label: "Privacy Policy",
          icon: <Shield className="w-4 h-4" />,
        },
        {
          key: "Terms",
          label: "Terms and Conditions",
          icon: <FileText className="w-4 h-4" />,
        },
        {
          key: "Refund",
          label: "Cancellation and Refund Policy",
          icon: <RefreshCw className="w-4 h-4" />,
        },
      ],
    },
    Support: {
      subItems: [
        {
          key: "Help",
          label: "Help Center",
          icon: <MessageCircle className="w-4 h-4" />,
        },
        {
          key: "Documentation",
          label: "Documentation",
          icon: <Book className="w-4 h-4" />,
        },
        {
          key: "Status",
          label: "Status",
          icon: <Activity className="w-4 h-4" />,
        },
      ],
    },
  };

  const handleSignIn = () => {
    // Handle sign in logic here
    console.log("Sign in clicked");
  };

  useEffect(() => {
    const pathParts = location.pathname.split("/").filter(Boolean);
    const main = pathParts[0] || "company";
    const sub = pathParts[1] || "about";

    const tabMap = {
      company: "Company",
      legal: "Legal",
      support: "Support",
    };

    const resolvedTab = tabMap[main.toLowerCase()];
    const resolvedSub =
      sub.charAt(0).toUpperCase() + sub.slice(1).toLowerCase();

    if (resolvedTab && navigationData[resolvedTab]) {
      setActiveTab(resolvedTab);
      setActiveSubTab(resolvedSub);
    }
  }, [location.pathname]);

  const handleTabChange = (tab) => {
    const base = tab.toLowerCase();
    const firstSub = navigationData[tab].subItems[0].key.toLowerCase();
    navigate(`/${base}/${firstSub}`);
  };

  const renderContent = () => {
    const contentMap = {
      About: {
        title: "About Voizon",
        content: (
          <div className="content-section">
            <h2>Our Mission</h2>
            <p>
              Voizon is dedicated to helping job seekers master their interview
              skills through AI-powered feedback and personalized coaching. We
              believe that everyone deserves the opportunity to showcase their
              best self during interviews.
            </p>

            <h3>What We Do</h3>
            <p>
              We provide real-time AI assistance during mock interviews, helping
              candidates practice and improve their responses to common and
              industry-specific questions. Our platform offers:
            </p>
            <ul>
              <li>AI-powered interview coaching</li>
              <li>Personalized feedback based on your resume</li>
              <li>Real-time response suggestions</li>
              <li>Comprehensive performance analytics</li>
            </ul>

            <h3>Our Team</h3>
            <p>
              Founded by experienced professionals in technology and human
              resources, Voizon combines cutting-edge AI technology with deep
              understanding of the interview process.
            </p>
          </div>
        ),
      },
      Contact: {
        title: "Contact Us",
        content: (
          <div className="content-section">
            <div className="contact-grid">
              <div className="contact-card">
                <Mail className="contact-icon" />
                <h3>Email Support</h3>
                <p>voizon.in@gmail.com</p>
                <p>We typically respond within 24 to 48 hours</p>
              </div>

              <div className="contact-card">
                <MapPin className="contact-icon" />
                <h3>Office Address</h3>
                <p>
                  Dharapuram
                  <br />
                  Tiruppur, Tamil Nadu
                  <br />
                  India - 638656
                </p>
              </div>

              <div className="contact-card">
                <Phone className="contact-icon" />
                <h3>Phone Support</h3>
                {/* <p>+91 80-72677947</p> */}
                <p>Apologies, our telephonic support is temporarily unavailable. We're happy to help you via email instead.</p>
              </div>
            </div>
          </div>
        ),
      },
      Privacy: {
        title: "Privacy Policy",
        content: (
          <div className="content-section">
            <p className="last-updated">Last updated: June 2, 2025</p>

            <h2>Information We Collect</h2>
            <p>
              Voizon collects information necessary to deliver AI-driven
              interview coaching, improve service quality, and ensure account
              integrity.
            </p>

            <h3>Types of Information</h3>
            <ul>
              <li>Full name, email address, and profile photo</li>
              <li>Uploaded resumes and job preferences</li>
              <li>
                Interview transcripts, recordings, and AI-generated feedback
              </li>
              <li>Usage analytics and activity logs</li>
              <li>
                Billing and payment information (via secure third-party
                gateways)
              </li>
            </ul>

            <h2>How We Use Your Information</h2>
            <p>We use your data to:</p>
            <ul>
              <li>Deliver personalized interview coaching and analytics</li>
              <li>Provide follow-up support and maintain chat history</li>
              <li>Improve AI responses using anonymized interaction data</li>
              <li>Facilitate resume-based practice and targeted questions</li>
              <li>Process payments and manage credits</li>
            </ul>

            <h2>Data Security</h2>
            <p>
              All user data is securely stored using Firebase services and
              encrypted in transit. Only authorized systems have access to
              sensitive information.
            </p>
          </div>
        ),
      },
      Terms: {
        title: "Terms of Service",
        content: (
          <div className="content-section">
            <p className="last-updated">Last updated: June 3, 2025</p>

            <h2>Acceptance of Terms</h2>
            <p>
              By accessing or using Voizon ("the Platform"), you agree to be
              bound by these Terms of Service and our Privacy Policy. If you do
              not agree, you may not use the Platform.
            </p>

            <h2>Use of Services</h2>
            <p>
              Voizon provides AI-powered tools designed to assist users in
              preparing for and participating in mock or live interviews. The
              platform is not a substitute for your own skills or judgment. You
              agree not to use the service to mislead employers or violate
              interview integrity.
            </p>

            <h2>Permitted Usage</h2>
            <ul>
              <li>
                You may use Voizon for self-practice, preparation, or training.
              </li>
              <li>
                You must not use Voizon to cheat during official assessments or
                hiring interviews without disclosure.
              </li>
              <li>
                You may not record or transmit interview content without proper
                consent.
              </li>
            </ul>

            <h2>User Responsibilities</h2>
            <ul>
              <li>
                You must provide accurate and complete information during
                registration.
              </li>
              <li>
                You are responsible for maintaining the confidentiality of your
                account and for all activities under your account.
              </li>
              <li>
                You agree to comply with all applicable laws, including data
                protection and intellectual property rights.
              </li>
            </ul>

            <h2>Device Limitations</h2>
            <p>
              Certain features of Voizon (e.g., Go Live interview assistant) are
              only available on desktop devices (Windows, macOS, Linux).
              Attempting to bypass device restrictions may result in limited
              functionality or account suspension.
            </p>

            <h2>Limitation of Liability</h2>
            <p>
              We make no guarantees that using Voizon will result in job offers
              or interview success. You assume all risk associated with using
              AI-based recommendations. Voizon is not liable for decisions made
              by any third party, including employers or hiring platforms.
            </p>

            <h2>Third-Party Integrations</h2>
            <p>
              Voizon uses third-party services including Razorpay for payments
              and Google AI (Gemini) for response generation. By using these
              services, you agree to their respective terms.
            </p>

            <h2>Modifications</h2>
            <p>
              We reserve the right to update these Terms at any time. Material
              changes will be communicated via in-app notice or email.
            </p>
          </div>
        ),
      },
      Refund: {
        title: "Refund Policy",
        content: (
          <div className="content-section">
            <p className="last-updated">Last updated: June 2, 2025</p>

            <h2>Credit-Based Usage</h2>
            <p>
              Voizon operates on a prepaid credit system. Each interview minute
              deducts credits from your balance.
            </p>

            <h2>No Refund Policy</h2>
            <p>
              All purchases made on Voizon are final. We do not offer refunds
              for any reason, including but not limited to:
            </p>
            <ul>
              <li>Unused or partially used credits</li>
              <li>Change of mind or dissatisfaction with AI responses</li>
              <li>Completed or missed interview sessions</li>
              <li>Accidental purchases</li>
            </ul>

            <h2>Disputes</h2>
            <p>
              If you encounter any technical issues that prevent you from using
              purchased credits, please contact support at
              <strong> voizon.in@gmail.com</strong>. While refunds are not
              issued, we may investigate and assist at our discretion. please
              contact us within 48 hours of the incident.
            </p>
          </div>
        ),
      },
      Help: {
        title: "Help & Support",
        content: (
          <div className="content-section">
            <p className="last-updated">Last updated: June 2, 2025</p>

            <h2>Need Assistance?</h2>
            <p>
              Our support team is here to help you with any issues related to
              interviews, resume uploads, payments, or account management.
            </p>

            <h2>Contact Options</h2>
            <ul>
              <li>Email: voizon.in@gmail.com</li>
              <li>Response Time: Within 24 to 48 hours</li>
            </ul>

            <h2>Common Issues</h2>
            <ul>
              <li>
                Not receiving AI responses? Check your internet and refresh the
                session.
              </li>
              <li>
                Credits not updating? Ensure payment confirmation is received.
              </li>
              <li>
                Transcript missing? Wait for final PDF after session ends.
              </li>
            </ul>
          </div>
        ),
      },
      Documentation: {
        title: "Platform Documentation",
        content: (
          <div className="content-section">
            <p className="last-updated">Last updated: June 2, 2025</p>

            <h2>Overview</h2>
            <p>
              Voizon provides documentation for users to understand and
              effectively use its AI-powered interview system.
            </p>

            <h2>Key Features</h2>
            <ul>
              <li>Live audio capture with real-time AI responses</li>
              <li>Resume analysis and personalized question generation</li>
              <li>Interview history and downloadable response PDFs</li>
              <li>Credit management and usage tracking</li>
            </ul>

            <h2>Developer Info</h2>
            <p>
              Our platform is built using React on the frontend and Express +
              Node.js on the backend, without Firebase for backend logic. PDF
              generation and file storage use Firebase Storage.
            </p>

            <h2>Getting Started</h2>
            <p>
              Visit our Help section or contact support for technical guidance.
            </p>
          </div>
        ),
      },
      Status: {
        title: "System Status",
        content: (
          <div className="content-section">
            <p className="last-updated">Last updated: June 2, 2025</p>

            <h2>Current Status</h2>
            <p>
              All systems are{" "}
              <span style={{ color: "green", fontWeight: "bold" }}>
                operational
              </span>
              .
            </p>

            <h2>Components Monitored</h2>
            <ul>
              <li>AI Response Engine</li>
              <li>Resume Upload and Storage</li>
              <li>PDF Generation and Delivery</li>
              <li>Credit Balance Sync</li>
              <li>Payment Gateway (Razorpay)</li>
            </ul>

            <h2>Uptime Guarantee</h2>
            <p>
              We aim for 99.9% uptime. In case of any planned maintenance or
              outages, we notify users in advance via email or dashboard alerts.
            </p>
          </div>
        ),
      },
    };

    return contentMap[activeSubTab] || contentMap.About;
  };

  return (
    <div className="navigation-app">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <p className="logo">
            <div className="logo-icon">
              <img src={logo} alt="Logo" style={{ width: 40, height: 40 }} />
            </div>
            Voizon
          </p>
          <nav className={`nav-menu ${mobileMenuOpen ? "mobile-open" : ""}`}>
            <a
              className="nav-link"
              onClick={() => {
                navigate("/");
                setMobileMenuOpen(false);
              }}
            >
              Home
            </a>
            {Object.keys(navigationData).map((tab) => (
              <a
                key={tab}
                className={`nav-link ${activeTab === tab ? "active" : ""}`}
                onClick={() => {
                  handleTabChange(tab);
                  setMobileMenuOpen(false);
                }}
              >
                {navigationData[tab].icon}
                {tab}
              </a>
            ))}
          </nav>

          <div className="auth-buttons"></div>
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </header>
      {/* Main Content */}
      <div className="main-layout">
        {/* Sidebar */}
        {/** Sidebar toggle button - only visible on mobile */}
        {!mobileMenuOpen && (
          <button
            className="sidebar-toggle-btn"
            onClick={() => {
              setSidebarOpen(!sidebarOpen);
              setMobileMenuOpen(false);
            }}
          >
            {sidebarOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <ChevronRight className="w-6 h-6 chevron" />
            )}
          </button>
        )}

        <aside className={`sidebar ${sidebarOpen ? "mobile-open" : ""}`}>
          <nav className="sidebar-nav">
            {navigationData[activeTab]?.subItems.map((item) => (
              <button
                key={item.key}
                className={`sidebar-item ${
                  activeSubTab === item.key ? "active" : ""
                }`}
                onClick={() => {
                  setActiveSubTab(item.key);
                  setSidebarOpen(false); // ✅ Close sidebar
                  navigate(
                    `/${activeTab.toLowerCase()}/${item.key.toLowerCase()}`
                  );
                }}
              >
                {item.icon}
                <span>{item.label}</span>
                <ChevronRight className="w-4 h-4 chevron" />
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="content">
          <div className="content-header">
            <h1>{renderContent().title}</h1>
          </div>

          <div className="content-body">{renderContent().content}</div>
        </main>
      </div>
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-top">
            <div className="footer-brand">
              <div className="footer-logo">
                <div className="logo-icon">
                  <img src={logo_white} alt="Logo" />
                </div>
                <span className="logo-text">Voizon</span>
              </div>
              <p className="footer-description">
                Master your interviews with AI-powered feedback and personalized
                coaching. Land your dream job with confidence.
              </p>
              {/* <div className="footer-socials">
                <a href="#" className="social-link" aria-label="LinkedIn">
                  <Linkedin className="social-icon" />
                </a>
                <a href="#" className="social-link" aria-label="GitHub">
                  <Github className="social-icon" />
                </a>
                <a href="#" className="social-link" aria-label="Twitter">
                  <Twitter className="social-icon" />
                </a>
              </div> */}
            </div>

            <div className="footer-links">
              <div className="footer-column">
                <h4 className="footer-title">Product</h4>
                <ul className="footer-list">
                  <li>
                    <a href="../#features" className="footer-link">
                      Features
                    </a>
                  </li>
                  <li>
                    <a href="../#pricing" className="footer-link">
                      Pricing
                    </a>
                  </li>
                  <li>
                    <a href="../#faq" className="footer-link">
                      FAQ
                    </a>
                  </li>
                  <li>
                    <a href="../#how-it-works" className="footer-link">
                      How it Works
                    </a>
                  </li>
                </ul>
              </div>

              <div className="footer-column">
                <h4 className="footer-title">Company</h4>
                <ul className="footer-list">
                  <li>
                    <a href="/company/about" className="footer-link">
                      About
                    </a>
                  </li>
                  <li>
                    <a href="/company/contact" className="footer-link">
                      Contact
                    </a>
                  </li>
                </ul>
              </div>

              <div className="footer-column">
                <h4 className="footer-title">Legal</h4>
                <ul className="footer-list">
                  <li>
                    <a href="/legal/privacy" className="footer-link">
                      Privacy Policy
                    </a>
                  </li>
                  <li>
                    <a href="/legal/terms" className="footer-link">
                      Terms of Service
                    </a>
                  </li>
                  <li>
                    <a href="/legal/refund" className="footer-link">
                      Refund Policy
                    </a>
                  </li>
                </ul>
              </div>

              <div className="footer-column">
                <h4 className="footer-title">Support</h4>
                <ul className="footer-list">
                  <li>
                    <a
                      href="mailto:support@voizon.com"
                      className="footer-contact"
                    >
                      voizon.in@gmail.com
                    </a>
                  </li>
                  <li>
                    <a href="/support/help" className="footer-link">
                      Help Center
                    </a>
                  </li>
                  <li>
                    <a href="/support/documentation" className="footer-link">
                      Documentation
                    </a>
                  </li>
                  <li>
                    <a href="/support/status" className="footer-link">
                      Status
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="footer-bottom">
            <p className="footer-copyright">
              © 2025 Voizon. All rights reserved.
            </p>
            <p className="footer-made-with">
              Made with ❤️ for job seekers worldwide
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default NavigationUI;
