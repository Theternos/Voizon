import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import VoizonLanding from "./components/index";
import LoginComponent from "./components/login";
import Home from "./components/Home";
import NavigationUI from "./components/support";
import InterviewPrepare from "./components/practice";
import MockInterviewAnalysis from "./components/mockInterviewAnalysis";
import ATSReport from "./components/ats-report";
import QuestionVault from "./components/question-vault";
import InterviewCracker from "./components/voizon";



function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<VoizonLanding />} /> 
        <Route path="/login" element={<LoginComponent />} />
        <Route path="/home" element={<Home />} />
        <Route path="/support" element={<NavigationUI />} />
        <Route path="/practice" element={<InterviewPrepare />}  />
        <Route path="/mock-interview-analysis" element={<MockInterviewAnalysis />}  />
        <Route path="/ats-report" element={<ATSReport />}  />
        <Route path="/vault-voices" element={<QuestionVault />}  />
        <Route path="/voizon" element={<InterviewCracker />}  />
      </Routes>
    </Router>
  );
}

export default App;
