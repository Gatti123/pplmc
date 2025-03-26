import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';

const DeviceCheck = ({ onDeviceSelect }) => {
  const [videoDevices, setVideoDevices] = useState([]);
  const [audioDevices, setAudioDevices] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState('');
  const [selectedAudio, setSelectedAudio] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [testStream, setTestStream] = useState(null);
  const videoRef = useRef(null);

  // Initialize device list
  useEffect(() => {
    async function getDevices() {
      try {
        setIsLoading(true);
        
        // Request permissions first
        await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        
        // Then get device list
        const devices = await navigator.mediaDevices.enumerateDevices();
        
        const videos = devices.filter(device => device.kind === 'videoinput');
        const audios = devices.filter(device => device.kind === 'audioinput');
        
        setVideoDevices(videos);
        setAudioDevices(audios);
        
        if (videos.length > 0) {
          setSelectedVideo(videos[0].deviceId);
        }
        
        if (audios.length > 0) {
          setSelectedAudio(audios[0].deviceId);
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error accessing media devices:', error);
        toast.error('Failed to access camera or microphone. Please ensure permissions are granted.');
        setIsLoading(false);
      }
    }
    
    getDevices();
  }, []);

  // Update preview when devices change
  useEffect(() => {
    async function updatePreview() {
      // Only proceed if devices are selected
      if (!selectedVideo || !selectedAudio) return;
      
      // Stop any existing stream
      if (testStream) {
        testStream.getTracks().forEach(track => track.stop());
      }
      
      try {
        // Get a new stream with selected devices
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: selectedVideo },
          audio: { deviceId: selectedAudio }
        });
        
        // Update state and preview
        setTestStream(stream);
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error setting up preview:', error);
        toast.error('Error setting up camera preview. Please try a different device.');
      }
    }
    
    updatePreview();
    
    // Cleanup on component unmount
    return () => {
      if (testStream) {
        testStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [selectedVideo, selectedAudio]);

  // Handle continue button
  const handleContinue = () => {
    if (testStream) {
      // Stop the test stream
      testStream.getTracks().forEach(track => track.stop());
      setTestStream(null);
    }
    
    // Call the parent callback with selected devices
    onDeviceSelect({
      video: selectedVideo,
      audio: selectedAudio
    });
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Check Your Devices</h2>
      
      {isLoading ? (
        <div className="text-center py-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Accessing your camera and microphone...</p>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <p className="text-gray-600 mb-4">Please check your camera and microphone before starting a video chat.</p>
            
            <div className="bg-gray-900 rounded-lg overflow-hidden aspect-video mb-6">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              ></video>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Camera
                </label>
                <select
                  value={selectedVideo}
                  onChange={(e) => setSelectedVideo(e.target.value)}
                  className="block w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                >
                  {videoDevices.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Camera ${videoDevices.indexOf(device) + 1}`}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Microphone
                </label>
                <select
                  value={selectedAudio}
                  onChange={(e) => setSelectedAudio(e.target.value)}
                  className="block w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                >
                  {audioDevices.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Microphone ${audioDevices.indexOf(device) + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end">
            <button
              onClick={handleContinue}
              disabled={!selectedVideo || !selectedAudio}
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors"
            >
              Continue
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default DeviceCheck; 