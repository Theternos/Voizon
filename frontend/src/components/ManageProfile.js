import React, { useEffect, useState } from "react";
import profile_pic from "../images/user_placeholder.png";
import "../styles/manageprofile.css"; // Import your CSS file
import {
  ArrowLeft,
  User,
  Shield,
  CreditCard,
  Calendar,
  Camera,
  Mail,
  Trash2,
  Eye,
  EyeOff,
  X,
  ArrowRight, // Add this
  AlertTriangle,
} from "lucide-react";
import {
  collection,
  updateDoc,
  getDocs,
  query,
  where,
  deleteDoc,
} from "firebase/firestore";
import { getStorage, ref, getDownloadURL, listAll } from "firebase/storage";

import { db } from "../firebase/config";

const ManageProfile = ({ setActiveView, setUserPhoto, setUserName }) => {
  const [activeTab, setActiveTab] = useState("profile");
  const [userName, setLocalUserName] = useState(""); // ✅ Renamed local setter
  const [userEmail, setUserEmail] = useState("");
  const [profilePhoto, setProfilePhoto] = useState("");
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [retypePassword, setRetypePassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showRetypePassword, setShowRetypePassword] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  const [nameMessage, setNameMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [showNameToast, setShowNameToast] = useState(false);
  const [showPasswordToast, setShowPasswordToast] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const backend_url = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    // Only clear the inline message if the toast is NOT currently showing
    if (!showPasswordToast) {
      setPasswordMessage("");
      setPasswordSuccess(false);
    }
  }, [password, retypePassword, showPasswordToast]);

  useEffect(() => {
    // Clear messages when switching tabs
    setNameMessage("");
    setPasswordMessage("");
    setShowNameToast(false);
    setShowPasswordToast(false);
  }, [activeTab]);

  useEffect(() => {
    const email = localStorage.getItem("userEmail");
    const name = localStorage.getItem("userName");

    setUserEmail(email);
    setUserName(name || "Guest");
    setNewName(name || "");

    const storage = getStorage();

    const fetchProfilePhoto = async () => {
      try {
        const exists = await doesProfilePhotoExist(email);
        if (!exists) {
          setProfilePhoto(profile_pic);
          setUserPhoto?.(profile_pic);
          return;
        }

        const refPath = ref(storage, `profile_pics/${email}.png`);
        const url = await getDownloadURL(refPath);
        setProfilePhoto(url);
        setUserPhoto?.(url);
      } catch (err) {
        setProfilePhoto(profile_pic);
        setUserPhoto?.(profile_pic);
      }
    };

    fetchProfilePhoto();

    const fetchPurchaseHistory = async () => {
      try {
        const q = query(
          collection(db, "purchaseHistory"),
          where("email", "==", email)
        );
        const snapshot = await getDocs(q);
        const history = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        // Sort by most recent
        history.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setPurchaseHistory(history);
      } catch (err) {
        console.error("Error fetching purchase history:", err);
      }
    };

    const checkPassword = async () => {
      try {
        const q = query(collection(db, "users"), where("email", "==", email));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const data = snapshot.docs[0].data();
          setHasPassword(!!data.password);
        }
      } catch (err) {
        console.error("Error checking password:", err);
      }
    };

    fetchPurchaseHistory();
    checkPassword();
  }, []);

  const scrollTabs = (direction) => {
    const container = document.querySelector(".profile-tabs-wrapper");
    if (container) {
      const scrollAmount = 150;
      container.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const doesProfilePhotoExist = async (email) => {
    const storageRef = ref(getStorage(), "profile_pics");
    try {
      const list = await listAll(storageRef);
      return list.items.some((item) => item.name === `${email}.png`);
    } catch (e) {
      return false;
    }
  };
  const handleSaveName = async () => {
    const cleanName = newName.trim();

    if (!cleanName || cleanName === userName || !userEmail) {
      setNameMessage("Please enter a new name before updating.");
      setShowNameToast(true);
      setTimeout(() => setShowNameToast(false), 2000);
      return;
    }

    setSaving(true);

    try {
      const q = query(collection(db, "users"), where("email", "==", userEmail));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const userDoc = snapshot.docs[0];
        await updateDoc(userDoc.ref, {
          userName: cleanName,
          updatedAt: new Date().toISOString(),
        });

        setNameMessage("✅ Name updated successfully!");
        setShowNameToast(true);
        setTimeout(() => setShowNameToast(false), 10000);
      }

      setLocalUserName(cleanName);
      setUserName?.(cleanName);
      localStorage.setItem("userName", cleanName);
    } catch (err) {
      console.error("❌ Error updating name:", err);
    }

    setSaving(false);
  };

  const handlePhotoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !userEmail) return;

    try {
      const formData = new FormData();
      formData.append("photo", file);
      formData.append("email", userEmail);

      const res = await fetch(`${backend_url}/api/upload-profile-pic`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        // 🟢 Get the new download URL from Firebase Storage
        const storage = getStorage();
        const photoRef = ref(storage, `profile_pics/${userEmail}.png`);
        const downloadUrl = await getDownloadURL(photoRef);

        setProfilePhoto(downloadUrl);
        if (setUserPhoto) setUserPhoto(downloadUrl);
      } else {
        console.error("❌ Upload failed");
      }
    } catch (err) {
      console.error("❌ Upload error:", err);
    }
  };

  const handleRemovePhoto = async () => {
    try {
      const defaultPic = profile_pic;
      setProfilePhoto(defaultPic);
      localStorage.removeItem("userPhoto");

      // 🔥 Immediately update navbar image
      if (setUserPhoto) {
        setUserPhoto(defaultPic);
      }

      // Optional: request backend to delete the file
      const res = await fetch(`${backend_url}/api/remove-profile-pic`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail }),
      });

      if (!res.ok) {
        console.warn("⚠️ Backend did not confirm deletion");
      }
    } catch (err) {
      console.error("❌ Error removing photo:", err);
    }
  };

  const isPasswordStrong = (password) => {
    const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{6,}$/;
    return strongRegex.test(password);
  };

  const handlePasswordSave = async () => {
    if (!password || password !== retypePassword) {
      setPasswordMessage("❌ Passwords must match.");
      setPasswordSuccess(false);
      setShowPasswordToast(true);
      setTimeout(() => setShowPasswordToast(false), 20000);
      return;
    }

    if (!isPasswordStrong(password)) {
      setPasswordMessage(
        "❌ Password must include uppercase, lowercase, number, special character and be 6+ characters."
      );
      setPasswordSuccess(false);
      setShowPasswordToast(true);
      setTimeout(() => setShowPasswordToast(false), 20000);
      return;
    }

    setSaving(true);

    try {
      const q = query(collection(db, "users"), where("email", "==", userEmail));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const userDoc = snapshot.docs[0];
        await updateDoc(userDoc.ref, {
          password, // ⚠️ Reminder: store hashed passwords in production
          passwordSetAt: new Date().toISOString(),
        });

        setPasswordMessage("✅ Password updated successfully!");
        setPasswordSuccess(true);
        setShowPasswordToast(true);
        setTimeout(() => setShowPasswordToast(false), 10000);

        setHasPassword(true);
        setPassword("");
        setRetypePassword("");
      }
    } catch (err) {
      console.error("❌ Error saving password:", err);
    }

    setSaving(false);
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);

    if (!userEmail) return;

    try {
      // Step 1: Get all interviewIds from currentInterviews
      const currentInterviewQuery = query(
        collection(db, "currentInterviews"),
        where("email", "==", userEmail)
      );
      const snapshot = await getDocs(currentInterviewQuery);
      const interviewIds = snapshot.docs.map((doc) => doc.data().interviewId);
      const resumePaths = snapshot.docs.map((doc) => doc.data().resumePathName);

      // Step 2: Delete profile pic
      await fetch(`${backend_url}/api/remove-profile-pic`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail }),
      });

      // Step 3: Delete all files (resumes, profile photo, response PDFs)
      await fetch(`${backend_url}/api/delete-user-files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, interviewIds, resumePaths }),
      });

      // Step 4: Delete Firestore docs
      const deleteDocsByEmail = async (collectionName) => {
        const q = query(
          collection(db, collectionName),
          where("email", "==", userEmail)
        );
        const snapshot = await getDocs(q);
        const deletions = snapshot.docs.map((doc) => deleteDoc(doc.ref));
        await Promise.all(deletions);
      };

      await Promise.all([
        deleteDocsByEmail("users"),
        deleteDocsByEmail("userCredits"),
        deleteDocsByEmail("purchaseHistory"),
        deleteDocsByEmail("interviewHistory"),
        deleteDocsByEmail("currentInterviews"),
      ]);

      localStorage.clear();
      window.location.href = "/";
    } catch (err) {
      console.error("❌ Deletion failed:", err);
    }

    setShowDeleteModal(false);
    setDeleting(false);
  };

  const DeleteConfirmModal = () => {
    return (
      <div className="delete-account-modal-overlay">
        <div className="delete-account-modal">
          <div className="delete-account-modal-header">
            <AlertTriangle className="delete-account-warning-icon" />
            <h3>Delete Account</h3>
          </div>
          <div className="delete-account-modal-body">
            <p>
              <strong>Warning:</strong> Deleting your account is{" "}
              <span style={{ color: "red" }}>permanent</span> and will:
            </p>
            <ul
              style={{
                paddingLeft: "1.25rem",
                marginTop: "0.75rem",
                color: "#475569",
              }}
            >
              <li>Remove your account from our system</li>
              <li>Delete your interview history and purchased credits</li>
              <li>Remove any uploaded resumes and response PDFs</li>
              <li>No refunds will be issued for remaining credits</li>
            </ul>
            <p style={{ marginTop: "1rem", fontWeight: "500" }}>
              Are you absolutely sure you want to continue?
            </p>
          </div>

          <div className="delete-account-modal-footer">
            <button
              className="btn btn-secondary"
              onClick={() => setShowDeleteModal(false)}
            >
              Cancel
            </button>
            <button
              className="btn btn-danger"
              onClick={handleDeleteAccount}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete Account"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const isPlaceholder = profilePhoto === profile_pic;

  return (
    <div className="account-container">
      <div className="account-content">
        <div className="profile-sidebar">
          <button
            className="profile-back-btn"
            onClick={() => {
              setActiveView("home");
              setNameMessage("");
              setPasswordMessage("");
              setShowNameToast(false);
              setShowPasswordToast(false);
            }}
          >
            <ArrowLeft size={20} />
            Back
          </button>
          <div className="profile-tabs-container">
            <div
              className="profile-scroll-indicator profile-scroll-left"
              onClick={() => scrollTabs("left")}
            >
              <ArrowLeft size={16} />
            </div>

            <div className="profile-tabs-wrapper">
              <button
                className={`profile-tab-btn ${
                  activeTab === "profile" ? "profile-active" : ""
                }`}
                onClick={() => setActiveTab("profile")}
              >
                <User size={18} />
                Profile
              </button>
              <button
                className={`profile-tab-btn ${
                  activeTab === "security" ? "profile-active" : ""
                }`}
                onClick={() => setActiveTab("security")}
              >
                <Shield size={18} />
                Security
              </button>
              <button
                className={`profile-tab-btn ${
                  activeTab === "purchase" ? "profile-active" : ""
                }`}
                onClick={() => setActiveTab("purchase")}
              >
                <CreditCard size={18} />
                Purchase History
              </button>
            </div>

            <div
              className="profile-scroll-indicator profile-scroll-right"
              onClick={() => scrollTabs("right")}
            >
              <ArrowRight size={16} />
            </div>
          </div>
        </div>

        <div className="main-contentt">
          {activeTab === "profile" && (
            <div className="profile-section">
              <div className="section-header">
                <h2>Profile details</h2>
              </div>

              <div className="profile-card">
                <div className="profile-photo-section">
                  <div className="photo-container">
                    {profilePhoto ? (
                      <img
                        src={profilePhoto}
                        alt="Profile"
                        className="profile-photo"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = profile_pic;
                        }}
                      />
                    ) : (
                      <div className="photo-placeholder">
                        <User size={40} />
                      </div>
                    )}
                  </div>
                  <div className="photo-actions">
                    <label className="btn btn-secondary">
                      <Camera size={16} />
                      {isPlaceholder ? "Add photo" : "Change photo"}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        style={{ display: "none" }}
                      />
                    </label>
                    {!isPlaceholder && (
                      <button
                        className="btn btn-outline"
                        onClick={handleRemovePhoto}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label>Name</label>

                  {nameMessage && (
                    <div
                      className={`status-message ${
                        nameMessage.startsWith("✅")
                          ? "status-success"
                          : "status-error"
                      }`}
                      style={{ marginBottom: "0.5rem" }}
                    >
                      {nameMessage}
                    </div>
                  )}

                  <div className="input-with-button">
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Enter your name"
                    />
                    <button
                      className="btn btn-primary"
                      disabled={
                        saving || !newName.trim() || newName === userName
                      }
                      onClick={handleSaveName}
                    >
                      {saving ? "Saving..." : "Update"}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label>Email addresses</label>
                  <div className="email-item">
                    <Mail size={16} />
                    <span>{userEmail}</span>
                    <span className="primary-badge">Primary</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "security" && (
            <div className="security-section">
              <div className="section-header">
                <h2>Security</h2>
              </div>

              <div className="security-card">
                <div className="form-group">
                  <label>
                    {hasPassword ? "Reset Password" : "Set New Password"}
                  </label>
                  {passwordMessage && (
                    <div
                      className={`status-message ${
                        passwordSuccess ? "status-success" : "status-error"
                      }`}
                      style={{ marginBottom: "0.5rem" }}
                    >
                      {passwordMessage}
                    </div>
                  )}

                  <div className="password-input">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                    />
                    <button
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label>Retype Password</label>
                  <div className="password-input">
                    <input
                      type={showRetypePassword ? "text" : "password"}
                      value={retypePassword}
                      onChange={(e) => setRetypePassword(e.target.value)}
                      placeholder="Retype password"
                    />
                    <button
                      className="password-toggle"
                      onClick={() => setShowRetypePassword(!showRetypePassword)}
                    >
                      {showRetypePassword ? (
                        <EyeOff size={16} />
                      ) : (
                        <Eye size={16} />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  className="btn btn-primary"
                  disabled={saving || !password || password !== retypePassword}
                  onClick={handlePasswordSave}
                >
                  {saving
                    ? "Saving..."
                    : hasPassword
                    ? "Reset Password"
                    : "Set Password"}
                </button>

                <div className="danger-zone">
                  <h3>Danger Zone</h3>
                  <p>
                    Once you delete your account, there is no going back. Please
                    be certain.
                  </p>
                  <button
                    className="btn btn-danger"
                    onClick={() => {
                      console.log("Delete button clicked"); // ✅ Check browser console
                      setShowDeleteModal(true);
                    }}
                  >
                    <Trash2 size={16} />
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "purchase" && (
            <div className="purchase-section">
              <div className="section-header">
                <h2>Purchase History</h2>
              </div>

              {purchaseHistory.length === 0 ? (
                <div className="empty-state">
                  <CreditCard size={48} />
                  <h3>No purchases yet</h3>
                  <p>
                    Your purchase history will appear here once you make your
                    first purchase.
                  </p>
                </div>
              ) : (
                <div className="purchase-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Credits</th>
                        <th>Amount</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchaseHistory.map((item) => (
                        <tr key={item.id}>
                          <td data-label="Date">
                            <div className="date-cell">
                              <Calendar size={16} />
                              {new Date(item.createdAt).toLocaleDateString(
                                "en-US",
                                {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                }
                              )}
                            </div>
                          </td>
                          <td data-label="Credits">
                            <span className="credits-badge">
                              {item.credits} credits
                            </span>
                          </td>
                          <td data-label="Amount">
                            <span className="amount">₹{item.cost}</span>
                          </td>
                          <td data-label="Status">
                            <span className="status-badge success">
                              <div className="status-dot"></div>
                              Completed
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showDeleteModal && DeleteConfirmModal()}
    </div>
  );
};

export default ManageProfile;
