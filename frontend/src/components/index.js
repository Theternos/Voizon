import React, { useState, useEffect } from "react";
import logo from "../images/logo_bg.png";
import logo_white from "../images/logo_white.png";
import { useNavigate } from "react-router-dom";
import "../styles/index.css";

import {
  Play,
  Target,
  Video,
  BookOpen,
  Rocket,
  ArrowRight,
  Menu,
  X,
  Upload as UploadIcon,
  MessageCircle,
  Brain,
  FileText,
  RotateCcw,
  Download,
  Cloud,
  Shield,
  Check,
  ChevronDown,
  ChevronUp,
  Mail,
  Linkedin,
  Github,
  Twitter,
  Star,
} from "lucide-react";

const VoizonLanding = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const navigate = useNavigate();
  const [expandedFAQ, setExpandedFAQ] = useState(null);
  const [showAllFaqs, setShowAllFaqs] = useState(false);
  const backend_url = process.env.REACT_APP_BACKEND_URL;


  if (process.env.REACT_APP_ENV === "production") {
    console.log = () => { };
    console.warn = () => { };
    console.error = () => { };
  }

  const toggleShowAllFaqs = () => {
    setShowAllFaqs(!showAllFaqs);
  };

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "auto";
  }, [mobileMenuOpen]);

  // Testimonials data
  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Software Engineer at Google",
      content:
        "Voizon helped me nail my technical interviews. The AI feedback was incredibly accurate and helped me improve my communication skills.",
      rating: 5,
    },
    {
      name: "Michael Rodriguez",
      role: "Product Manager at Meta",
      content:
        "The mock interview practice was game-changing. I felt completely prepared for my actual interviews and landed my dream job!",
      rating: 5,
    },
    {
      name: "Emily Johnson",
      role: "Data Scientist at Netflix",
      content:
        "The personalized feedback and industry-specific questions gave me the confidence I needed. Highly recommend!",
      rating: 5,
    },
  ];

  const workSteps = [
    {
      step: "01",
      title: "Upload Resume",
      description: "Your resume helps us tailor responses based on experience.",
      icon: <UploadIcon className="w-8 h-8" />,
      color: "from-blue-500 to-cyan-500",
    },
    {
      step: "02",
      title: "Ask Questions Live",
      description: "Speak or type interview questions during a live session.",
      icon: <MessageCircle className="w-8 h-8" />,
      color: "from-purple-500 to-pink-500",
    },
    {
      step: "03",
      title: "Get Smart AI Answers",
      description: "Receive context-aware, natural responses instantly.",
      icon: <Brain className="w-8 h-8" />,
      color: "from-orange-500 to-red-500",
    },
  ];

  const coreFeatures = [
    {
      icon: <Target className="w-6 h-6" />,
      title: "Real-time AI Answers",
      description:
        "Get intelligent responses instantly during your practice sessions",
    },
    {
      icon: <FileText className="w-6 h-6" />,
      title: "Resume Context Awareness",
      description:
        "Answers tailored specifically to your background and experience",
    },
    {
      icon: <RotateCcw className="w-6 h-6" />,
      title: "Follow-Up Question Support",
      description:
        "Seamlessly handle multi-part questions and follow-up inquiries",
    },
    {
      icon: <Download className="w-6 h-6" />,
      title: "Response PDF Report",
      description:
        "Download detailed reports of your practice sessions for review",
    },
    {
      icon: <Cloud className="w-6 h-6" />,
      title: "Cloud Resume Storage",
      description: "Securely store and access your resume from anywhere",
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Privacy-Focused & Secure",
      description:
        "Your data is protected with enterprise-grade security measures",
    },
  ];

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
        "Email support"
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

  const faqs = [
    {
      question: "Will my resume be safe?",
      answer:
        "Yes. Your resume is securely stored in Firebase Storage with access limited to your account. We use end-to-end encryption and do not share your files with any third party. You can delete them at any time from your profile.",
    },
    {
      question: "Can I download interview answers?",
      answer:
        "Yes. After every session, a PDF containing your questions and AI responses is automatically generated and saved to your history. You can view or download it anytime.",
    },
    {
      question: "Can I pause my timer?",
      answer:
        "Absolutely. When you stop the audio input, your interview timer and credits pause. The state is saved in localStorage and resumes when you restart.",
    },
    {
      question: "How does the credit system work?",
      answer:
        "Each credit equals one minute of active interview time. Credits are only deducted while audio capture is on. Unused seconds are carried forward precisely to ensure fair usage.",
    },
    {
      question: "What types of interviews can I practice?",
      answer:
        "You can practice any live interview scenario. The AI adapts based on your uploaded resume and previous questions, supporting technical, behavioral, and domain-specific queries.",
    },
    {
      question: "What are the payment options?",
      answer:
        "We support secure payments via Razorpay using credit cards, debit cards, UPI, and net banking. All transactions are encrypted and securely processed.",
    },
    {
      question: "Are there refunds for unused credits?",
      answer:
        "Currently, we do not offer refunds for unused credits. However, your credits do not expire and can be used across any future sessions.",
    },
    {
      question: "Is there a free trial available?",
      answer:
        "Yes. Every new user gets 10 free minutes upon signing up. No credit card is required to activate the trial.",
    },
    {
      question: "Can I store multiple resumes?",
      answer:
        "Yes. You can upload and manage multiple resumes from your profile. These can be selected during interview setup to personalize your session.",
    },
    {
      question: "Is the AI updated regularly?",
      answer:
        "Yes. Our AI engine is continuously improved using real interview trends, user feedback, and performance analysis to keep responses relevant and accurate.",
    },
  ];


  const handleSignIn = () => {
    navigate("/login");
  };

  const toggleFAQ = (index) => {
    setExpandedFAQ(expandedFAQ === index ? null : index);
  };

  const PreLoginContent = () => (
    <div>
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-badge">
            <span className="status-dot"></span>
            AI-Powered Interview Training Platform
          </div>
          <h1>Master Your Interviews with Confidence</h1>
          <p className="hero-subtitle">
            Nail your interviews — with AI assistance, realistic mock interviews,
            and personalized feedback reports.
          </p>
          <div className="hero-buttons">
            <button className="btn btn-cta btn-large" onClick={handleSignIn}>
              Start Training Free
              <ArrowRight className="w-5 h-5" />
            </button>
            {/* <button className="btn btn-demo btn-large">
              <Play className="w-5 h-5" />
              Watch Demo
            </button> */}
          </div>
        </div>
        <div className="hero-visual">
          <div className="floating-cards">
            <div className="floating-card card-1">
              <div className="card-icon">🎯</div>
              <div className="card-text">AI Answers</div>
            </div>
            <div className="floating-card card-2">
              <div className="card-icon">📈</div>
              <div className="card-text">95% Success</div>
            </div>
            <div className="floating-card card-3">
              <div className="card-icon">⚡</div>
              <div className="card-text">Real-time</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="index-howItWorksSection">
        <div className="index-sectionContainer">
          <div className="index-sectionHeader">
            <div className="index-badge">
              <span className="status-dot"></span>
              How It Works
            </div>
            <h2 className="index-sectionTitle">
              Get Interview-Ready in 3 Simple Steps
            </h2>
            <p className="index-sectionSubtitle">
              Our streamlined process helps you practice and improve your
              interview skills with personalized AI assistance
            </p>
          </div>

          <div className="index-stepsContainer">
            {workSteps.map((step, index) => (
              <div
                key={index}
                className="index-stepCard"
                style={{ animationDelay: `${index * 0.2}s` }}
              >
                <div
                  className="index-stepNumber"
                  style={{
                    background: `linear-gradient(135deg, ${step.color.split(" ")[1]}, ${step.color.split(" ")[3]})`
                  }}
                >
                  {step.step}
                </div>
                <div
                  className="index-stepIcon"
                  style={{
                    background: `linear-gradient(135deg, ${step.color.split(" ")[1]}, ${step.color.split(" ")[3]})`
                  }}
                >
                  {step.icon}
                </div>
                <h3 className="index-stepTitle">{step.title}</h3>
                <p className="index-stepDescription">{step.description}</p>

                {/* Connecting Line */}
                {index < workSteps.length - 1 && (
                  <div className="index-connectingLine"></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Core Features Section */}
      <section id="features" className="index-coreFeaturesSection">
        <div className="index-sectionContainer">
          <div className="index-sectionHeader">
            <div className="index-badge">
              <span className="status-dot"></span>
              Core Features
            </div>
            <h2 className="index-sectionTitle">
              Powerful Tools for Interview Success
            </h2>
            <p className="index-sectionSubtitle">
              Everything you need to ace your interviews, powered by advanced AI
              technology
            </p>
          </div>

          <div className="index-featuresGrid">
            {coreFeatures.map((feature, index) => (
              <div
                key={index}
                className="index-featureCard"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="index-featureIcon">{feature.icon}</div>
                <h3 className="index-featureTitle">{feature.title}</h3>
                <p className="index-featureDescription">{feature.description}</p>
                <div className="index-featureHover"></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who It's For Section */}
      <section className="who-its-for-section">
        <div className="section-container">
          <div
            className="section-header"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
            }}
          >
            <div className="index-badge">
              <span className="status-dot"></span>
              Who It's For
            </div>
            <h2 className="index-sectionTitle">
              Perfect for Every Career Stage
            </h2>
            <p className="index-sectionSubtitle" style={{ marginBottom: "2rem" }}>
              Whether you're a student, a job switcher, or a seasoned
              professional
            </p>
          </div>

          <div className="audience-grid">
            <div className="audience-card">
              <div className="audience-avatar">
                <div className="avatar-icon">🎓</div>
              </div>
              <h3 className="audience-title">Freshers</h3>
              <p className="audience-description">
                Students and recent graduates preparing for their first
                interviews
              </p>
              <ul className="audience-features">
                <li>Basic interview fundamentals</li>
                <li>Common fresher questions</li>
                <li>Confidence building exercises</li>
              </ul>
            </div>

            <div className="audience-card">
              <div className="audience-avatar">
                <div className="avatar-icon">💼</div>
              </div>
              <h3 className="audience-title">Working Professionals</h3>
              <p className="audience-description">
                Experienced professionals seeking career advancement or role
                changes
              </p>
              <ul className="audience-features">
                <li>Senior-level interview prep</li>
                <li>Leadership scenario questions</li>
                <li>Industry-specific coaching</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="pricing-section">
        <div className="section-container">
          <div className="section-header">
            <div className="badge">
              <span className="status-dot"></span>
              Pricing & Credit Plans
            </div>
            <h2 className="index-sectionTitle">Choose Your Perfect Plan</h2>
            <p className="index-sectionSubtitle">
              Flexible pricing with 1 credit = ₹3. Each minute of interview costs 1 credit.
            </p>
          </div>

          <div className="pricing-grid">
            {pricingPlans.map((plan, index) => (
              <div
                key={index}
                className={`pricing-card ${plan.isPopular ? "popular" : ""}`}
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
                  onClick={() => handleSignIn()}
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
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="faq-section">
        <div className="section-container">
          <div className="section-header">
            <div className="badge">
              <span className="status-dot"></span>
              Frequently Asked Questions
            </div>
            <h2 className="index-sectionTitle">
              Got Questions? We've Got Answers
              </h2>
            <p className="index-sectionSubtitle">
              Everything you need to know about Voizon and how it works
            </p>
          </div>

          <div className="faq-container">
            {(showAllFaqs ? faqs : faqs.slice(0, 3)).map((faq, index) => (
              <div key={index} className="faq-item">
                <button
                  className="faq-question"
                  onClick={() => toggleFAQ(index)}
                >
                  <span>{faq.question}</span>
                  {expandedFAQ === index ? (
                    <ChevronUp className="faq-icon" />
                  ) : (
                    <ChevronDown className="faq-icon" />
                  )}
                </button>
                <div
                  className={`faq-answer ${expandedFAQ === index ? "expanded" : ""
                    }`}
                >
                  <p>{faq.answer}</p>
                </div>
              </div>
            ))}

            {faqs.length > 3 && (
              <div style={{ textAlign: "center", marginTop: "2rem" }}>
                <button
                  className="btn btn-secondary"
                  onClick={toggleShowAllFaqs}
                >
                  {showAllFaqs ? "Show Less" : "Show More"}
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Try It Free Section */}
      <section className="try-it-free-section">
        <div className="section-container">
          <div className="cta-content">
            <div className="cta-left">
              <div className="free-credit-badge">
                🎉 Get 10 minutes free credit on signup!
              </div>
              <h2 className="cta-title">Ready to Ace Your Next Interview?</h2>
              <p className="cta-subtitle">
                Start practicing with AI-powered feedback today. No card
                required.
              </p>
              <div className="cta-features">
                <div className="cta-feature">
                  <div className="check-icon">✓</div>
                  <span>10 minutes free trial</span>
                </div>
                <div className="cta-feature">
                  <div className="check-icon">✓</div>
                  <span>No credit/debit card required</span>
                </div>
                <div className="cta-feature">
                  <div className="check-icon">✓</div>
                  <span>Instant AI responses</span>
                </div>
              </div>
            </div>
            <div className="cta-right">
              <div className="signup-form">
                <button className="signup-btn" onClick={handleSignIn}>
                  Get Started Free
                  <ArrowRight className="btn-icon" />
                </button>
                <p className="no-card-text">No credit card required</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );


  return (
    <div className="app">
      {/* Background Decoration */}
      <div className="bg-decoration">
        <div className="floating-shape shape-1"></div>
        <div className="floating-shape shape-2"></div>
        <div className="floating-shape shape-3"></div>
      </div>

      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <div className="logo-icon">
              <img src={logo} alt="Logo" style={{ width: 40, height: 40 }} />
            </div>
            Voizon
          </div>
          <nav className={`nav-menu ${mobileMenuOpen ? "mobile-open" : ""}`}>
            <a
              href="#how-it-works"
              className="nav-link"
              onClick={(e) => {
                setMobileMenuOpen(false);
                e.preventDefault();
                setTimeout(() => {
                  const section = document.querySelector("#how-it-works");
                  if (section) section.scrollIntoView({ behavior: "smooth" });
                }, 10);
              }}
            >
              How it Works
            </a>
            <a
              href="#features"
              className="nav-link"
              onClick={(e) => {
                setMobileMenuOpen(false);
                e.preventDefault();
                setTimeout(() => {
                  const section = document.querySelector("#features");
                  if (section) section.scrollIntoView({ behavior: "smooth" });
                }, 10);
              }}
            >
              Features
            </a>
            <a
              href="#pricing"
              className="nav-link"
              onClick={(e) => {
                setMobileMenuOpen(false);
                e.preventDefault();
                setTimeout(() => {
                  const section = document.querySelector("#pricing");
                  if (section) section.scrollIntoView({ behavior: "smooth" });
                }, 10);
              }}
            >
              Pricing
            </a>
            <a
              href="#faq"
              className="nav-link"
              onClick={(e) => {
                setMobileMenuOpen(false);
                e.preventDefault();
                setTimeout(() => {
                  const section = document.querySelector("#faq");
                  if (section) section.scrollIntoView({ behavior: "smooth" });
                }, 10);
              }}
            >
              FAQ
            </a>
            <a
              href="/company/about"
              className="nav-link"
              onClick={() => {
                setMobileMenuOpen(false);
              }}
            >
              About
            </a>
          </nav>

          <div className="auth-buttons">
            <button
              className="btn btn-primary sign-in-btn"
              onClick={handleSignIn}
            >
              Sign In
            </button>

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
        </div>
      </header>

      {/* Main Content */}
      <main>{<PreLoginContent />}</main>

      {/* Footer */}
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
                    <a href="#features" className="footer-link">
                      Features
                    </a>
                  </li>
                  <li>
                    <a href="#pricing" className="footer-link">
                      Pricing
                    </a>
                  </li>
                  <li>
                    <a href="#faq" className="footer-link">
                      FAQ
                    </a>
                  </li>
                  <li>
                    <a href="#how-it-works" className="footer-link">
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
              © 2026 Voizon. All rights reserved.
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

export default VoizonLanding;