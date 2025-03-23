import { useState, useRef, useEffect } from 'react';
import { generateTestTone } from '@/public/test-audio';

const DeviceCheck = ({ onComplete }) => {
  const [devices, setDevices] = useState({ video: [], audio: [] });
  const [selectedDevices, setSelectedDevices] = useState({ video: '', audio: '' });
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  const [isTestingAudio, setIsTestingAudio] = useState(false);
  const videoRef = useRef(null);
  const audioContextRef = useRef(null);

  useEffect(() => {
    // Get available devices
    const getDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        setDevices({
          video: devices.filter(d => d.kind === 'videoinput'),
          audio: devices.filter(d => d.kind === 'audioinput')
        });
        
        // Set default devices
        setSelectedDevices({
          video: devices.find(d => d.kind === 'videoinput')?.deviceId || '',
          audio: devices.find(d => d.kind === 'audioinput')?.deviceId || ''
        });
      } catch (error) {
        console.error('Error getting devices:', error);
        setError('Could not access media devices');
      }
    };

    getDevices();

    // Initialize AudioContext
    try {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    } catch (error) {
      console.error('Error creating AudioContext:', error);
    }

    return () => {
      if (audioContextRef.current?.state !== 'closed') {
        audioContextRef.current?.close();
      }
    };
  }, []);

  useEffect(() => {
    // Start media stream with selected devices
    const startStream = async () => {
      try {
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }

        const newStream = await navigator.mediaDevices.getUserMedia({
          video: selectedDevices.video ? { deviceId: { exact: selectedDevices.video } } : false,
          audio: selectedDevices.audio ? { deviceId: { exact: selectedDevices.audio } } : false
        });

        setStream(newStream);
        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
        }
        setError(null);
      } catch (error) {
        console.error('Error accessing media:', error);
        setError('Could not access selected devices');
      }
    };

    if (selectedDevices.video || selectedDevices.audio) {
      startStream();
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [selectedDevices]);

  const handleDeviceChange = (type, deviceId) => {
    setSelectedDevices(prev => ({ ...prev, [type]: deviceId }));
  };

  const testAudio = async () => {
    if (!audioContextRef.current) return;
    
    setIsTestingAudio(true);
    try {
      // Resume AudioContext if it's suspended
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      
      // Generate and play test tone
      generateTestTone(audioContextRef.current);
      
      // Reset testing state after 1 second
      setTimeout(() => setIsTestingAudio(false), 1000);
    } catch (error) {
      console.error('Error testing audio:', error);
      setIsTestingAudio(false);
    }
  };

  const handleComplete = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current?.state !== 'closed') {
      audioContextRef.current?.close();
    }
    onComplete(selectedDevices);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Device Check</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* Video preview */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Camera Preview
          </label>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-48 bg-gray-100 rounded-md object-cover"
          />
          <select
            value={selectedDevices.video}
            onChange={(e) => handleDeviceChange('video', e.target.value)}
            className="mt-2 input-field w-full"
          >
            <option value="">No camera</option>
            {devices.video.map(device => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Camera ${devices.video.indexOf(device) + 1}`}
              </option>
            ))}
          </select>
        </div>

        {/* Audio selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Microphone
          </label>
          <select
            value={selectedDevices.audio}
            onChange={(e) => handleDeviceChange('audio', e.target.value)}
            className="input-field w-full"
          >
            <option value="">No microphone</option>
            {devices.audio.map(device => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Microphone ${devices.audio.indexOf(device) + 1}`}
              </option>
            ))}
          </select>
          
          <button
            onClick={testAudio}
            disabled={!selectedDevices.audio || isTestingAudio}
            className="mt-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors disabled:bg-gray-300"
          >
            {isTestingAudio ? 'Testing...' : 'Test Microphone'}
          </button>
        </div>

        {/* Continue button */}
        <div className="flex justify-end">
          <button
            onClick={handleComplete}
            className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
          >
            Continue to Video Chat
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeviceCheck; 