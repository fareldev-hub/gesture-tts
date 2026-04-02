document.addEventListener('DOMContentLoaded', function() {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const loading = document.getElementById('loading');
    const errorText = document.getElementById('errorText');
    const retryBtn = document.getElementById('retryBtn');
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const switchBtn = document.getElementById('switchBtn');
    const placeholder = document.getElementById('placeholder');
    const gestureEmoji = document.getElementById('gestureEmoji');
    const gestureLabel = document.getElementById('gestureLabel');
    const ttsCheck = document.getElementById('ttsCheck');
    const statusText = document.getElementById('statusText');

    let detector = null;
    let isRunning = false;
    let currentStream = null;
    let facingMode = 'user';
    let ttsEnabled = true;
    let lastGesture = '';
    let gestureTimeout = null;
    let socket = null;
    let animationId = null;
    let lastDetectionTime = 0;
    const DETECTION_INTERVAL = 400;
    let isProcessing = false;

    const gestureData = {
        'SHAKA': { emoji: '🤙', label: 'Call Me Farel', speak: 'Call Me Farel' },
        'PALM': { emoji: '🖐', label: 'Halo', speak: 'Halo' },
        'STOP': { emoji: '✋', label: 'Stop', speak: 'Stop' },
        'OK': { emoji: '👌', label: 'OK', speak: 'Oke' },
        'THUMBS_UP': { emoji: '👍', label: 'Bagus', speak: 'Bagus' },
        'THUMBS_DOWN': { emoji: '👎', label: 'Buruk', speak: 'Buruk' },
        'FIST': { emoji: '✊', label: 'Semangat', speak: 'Semangat' },
        'POINTING': { emoji: '☝️', label: 'Tunjuk', speak: 'Tunjuk' },
        'PEACE': { emoji: '✌️', label: 'Peace', speak: 'Peace' },
        'LOVE_YOU': { emoji: '🤟', label: 'Love You', speak: 'Love You' }
    };

    async function detect() {
        if (!isRunning || !detector || isProcessing) {
            animationId = requestAnimationFrame(detect);
            return;
        }

        const now = Date.now();
        if (now - lastDetectionTime < DETECTION_INTERVAL) {
            animationId = requestAnimationFrame(detect);
            return;
        }

        isProcessing = true;
        lastDetectionTime = now;

        try {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            const predictions = await detector.estimateHands(video, false);

            if (predictions.length > 0) {
                statusText.textContent = 'Tangan terdeteksi';
                statusText.style.color = '#00ff00';
                const landmarks = predictions[0].landmarks;

                drawSkeleton(landmarks);

                const gesture = detectGesture(landmarks);

                if (gesture && gesture !== lastGesture) {
                    lastGesture = gesture;
                    const data = gestureData[gesture];
                    updateDisplay(data.emoji, data.label);
                    highlightGesture(gesture);
                    speak(data.speak);
                    statusText.textContent = 'Gesture: ' + data.label;
                    statusText.style.color = '#00ff00';
                    if (socket) socket.emit('gesture', { gesture });

                    clearTimeout(gestureTimeout);
                    gestureTimeout = setTimeout(() => {
                        lastGesture = '';
                        clearHighlight();
                        statusText.textContent = 'Menunggu deteksi...';
                        statusText.style.color = '#666';
                    }, 1500);
                }
            } else {
                statusText.textContent = 'Tidak ada tangan';
                statusText.style.color = '#666';
            }
        } catch (error) {
            console.error('Error in detection:', error);
        } finally {
            isProcessing = false;
        }

        animationId = requestAnimationFrame(detect);
    }

    function drawSkeleton(landmarks) {
        const scaleX = canvas.width / video.videoWidth;
        const scaleY = canvas.height / video.videoHeight;

        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.fillStyle = '#00ff00';

        const connections = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[0,9],[9,10],[10,11],[11,12],[0,13],[13,14],[14,15],[15,16],[0,17],[17,18],[18,19],[19,20]];

        ctx.beginPath();
        for (let k = 0; k < connections.length; k++) {
            const i = connections[k][0];
            const j = connections[k][1];
            ctx.moveTo(landmarks[i][0] * scaleX, landmarks[i][1] * scaleY);
            ctx.lineTo(landmarks[j][0] * scaleX, landmarks[j][1] * scaleY);
        }
        ctx.stroke();

        for (let i = 0; i < landmarks.length; i++) {
            ctx.beginPath();
            ctx.arc(landmarks[i][0] * scaleX, landmarks[i][1] * scaleY, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function getDistance(p1, p2) {
        const dx = p1[0] - p2[0];
        const dy = p1[1] - p2[1];
        return Math.sqrt(dx * dx + dy * dy);
    }

    function detectGesture(landmarks) {
        const wrist = landmarks[0];
        const thumbTip = landmarks[4];
        const thumbIp = landmarks[3];
        const indexTip = landmarks[8];
        const indexPip = landmarks[6];
        const middleTip = landmarks[12];
        const middlePip = landmarks[10];
        const ringTip = landmarks[16];
        const ringPip = landmarks[14];
        const pinkyTip = landmarks[20];
        const pinkyPip = landmarks[18];

        const isFingerExtended = (tip, pip) => tip[1] < pip[1];

        const thumbExt = thumbTip[0] > thumbIp[0];
        const indexExt = isFingerExtended(indexTip, indexPip);
        const middleExt = isFingerExtended(middleTip, middlePip);
        const ringExt = isFingerExtended(ringTip, ringPip);
        const pinkyExt = isFingerExtended(pinkyTip, pinkyPip);

        if (thumbExt && pinkyExt && !indexExt && !middleExt && !ringExt) return 'SHAKA';
        if (thumbExt && indexExt && middleExt && ringExt && pinkyExt) return 'PALM';
        if (!thumbExt && indexExt && middleExt && ringExt && pinkyExt) return 'STOP';
        if (getDistance(thumbTip, indexTip) < 40 && middleExt && ringExt && pinkyExt) return 'OK';

        if (!indexExt && !middleExt && !ringExt && !pinkyExt) {
            return thumbTip[1] < wrist[1] ? 'THUMBS_UP' : 'THUMBS_DOWN';
        }

        if (!thumbExt && !indexExt && !middleExt && !ringExt && !pinkyExt) return 'FIST';
        if (indexExt && !middleExt && !ringExt && !pinkyExt) return 'POINTING';
        if (indexExt && middleExt && !ringExt && !pinkyExt) return 'PEACE';
        if (indexExt && !middleExt && !ringExt && pinkyExt) return 'LOVE_YOU';

        return null;
    }

    async function init() {
        try {
            loading.classList.remove('hidden');
            errorText.classList.add('hidden');
            retryBtn.classList.add('hidden');

            await tf.ready();
            detector = await handpose.load();

            loading.classList.add('hidden');
        } catch (err) {
            errorText.textContent = 'Error initializing hand detection: ' + err.message;
            errorText.classList.remove('hidden');
            retryBtn.classList.remove('hidden');
        }
    }

    async function startCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    facingMode: facingMode, 
                    width: { ideal: 320 },
                    height: { ideal: 240 },
                    frameRate: { ideal: 12, max: 15 }
                },
                audio: false
            });

            currentStream = stream;
            video.srcObject = stream;

            video.onloadedmetadata = () => {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                isRunning = true;
                placeholder.classList.add('hidden');
                startBtn.classList.add('hidden');
                stopBtn.classList.remove('hidden');
                detect();
            };
        } catch (err) {
            alert('Tidak dapat mengakses kamera: ' + err.message);
        }
    }

    function stopCamera() {
        isRunning = false;
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        if (currentStream) {
            currentStream.getTracks().forEach(t => t.stop());
            currentStream = null;
        }
        video.srcObject = null;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        placeholder.classList.remove('hidden');
        startBtn.classList.remove('hidden');
        stopBtn.classList.add('hidden');
        updateDisplay('✋', 'Siap');
        clearHighlight();
    }

    function updateDisplay(emoji, label) {
        gestureEmoji.textContent = emoji;
        gestureLabel.textContent = label;
    }

    function highlightGesture(gesture) {
        document.querySelectorAll('.gesture-item').forEach(el => {
            el.classList.toggle('active', el.dataset.gesture === gesture);
        });
    }

    function switchCamera() {
        facingMode = facingMode === 'user' ? 'environment' : 'user';
        if (isRunning) {
            stopCamera();
            startCamera();
        }
    }

    function speak(text) {
        if (!ttsEnabled || !text) return;
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'id-ID';
        u.rate = 1.2;
        window.speechSynthesis.speak(u);
    }

    function clearHighlight() {
        document.querySelectorAll('.gesture-item').forEach(el => {
            el.classList.remove('active');
        });
    }

    startBtn.addEventListener('click', startCamera);
    stopBtn.addEventListener('click', stopCamera);
    switchBtn.addEventListener('click', switchCamera);
    ttsCheck.addEventListener('change', () => ttsEnabled = ttsCheck.checked);
    retryBtn.addEventListener('click', init);

    try {
        socket = io();
    } catch(e) {
        console.log('No socket');
    }

    init();
});