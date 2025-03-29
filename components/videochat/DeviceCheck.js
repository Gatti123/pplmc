import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setSelectedDevices } from '@/store/slices/videoChatSlice';

const DeviceCheck = () => {
  const dispatch = useDispatch();
  const selectedDevices = useSelector((state) => state.videoChat.selectedDevices);
  const [devices, setDevices] = useState({
    audioInput: [],
    videoInput: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInput = devices.filter(device => device.kind === 'audioinput');
        const videoInput = devices.filter(device => device.kind === 'videoinput');

        setDevices({
          audioInput,
          videoInput
        });

        // Set default devices if none selected
        if (!selectedDevices.audioInput && audioInput.length > 0) {
          dispatch(setSelectedDevices({
            ...selectedDevices,
            audioInput: audioInput[0].deviceId
          }));
        }
        if (!selectedDevices.videoInput && videoInput.length > 0) {
          dispatch(setSelectedDevices({
            ...selectedDevices,
            videoInput: videoInput[0].deviceId
          }));
        }
      } catch (error) {
        console.error('Error getting devices:', error);
      } finally {
        setLoading(false);
      }
    };

    getDevices();
  }, [dispatch, selectedDevices]);

  const handleDeviceSelect = (deviceType, deviceId) => {
    dispatch(setSelectedDevices({
      ...selectedDevices,
      [deviceType]: deviceId
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Check Your Devices</h2>
      
      {/* Audio Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Microphone
        </label>
        <select
          value={selectedDevices.audioInput || ''}
          onChange={(e) => handleDeviceSelect('audioInput', e.target.value)}
          className="block w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
        >
          {devices.audioInput.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || `Microphone ${device.deviceId.slice(0, 5)}`}
            </option>
          ))}
        </select>
      </div>

      {/* Video Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Camera
        </label>
        <select
          value={selectedDevices.videoInput || ''}
          onChange={(e) => handleDeviceSelect('videoInput', e.target.value)}
          className="block w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
        >
          {devices.videoInput.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || `Camera ${device.deviceId.slice(0, 5)}`}
            </option>
          ))}
        </select>
      </div>

      {/* Preview */}
      <div className="mt-6">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Preview</h3>
        <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
          <video
            ref={(el) => {
              if (el && selectedDevices.videoInput) {
                navigator.mediaDevices
                  .getUserMedia({
                    video: { deviceId: selectedDevices.videoInput }
                  })
                  .then(stream => {
                    el.srcObject = stream;
                  })
                  .catch(error => {
                    console.error('Error accessing video device:', error);
                  });
              }
            }}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </div>
  );
};

export default DeviceCheck; 