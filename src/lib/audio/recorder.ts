export class UniversalRecorder {
    private mediaRecorder: MediaRecorder | null = null;
    private stream: MediaStream | null = null;
    private audioCtx: AudioContext | null = null;
    private analyser: AnalyserNode | null = null;
    private source: MediaStreamAudioSourceNode | null = null;
    private chunks: Blob[] = [];
    private rmsInterval: NodeJS.Timeout | null = null;
    private currentRMS: number = 0;

    async start(): Promise<void> {
        this.chunks = [];
        this.currentRMS = 0;

        try {
            // 1. Get Stream with ideal constraints
            this.stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    channelCount: 1, // Mono is robust
                }
            });

            // 2. Setup AudioContext for RMS
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            this.audioCtx = new AudioContextClass();
            await this.audioCtx.resume(); // Vital for iOS

            this.analyser = this.audioCtx.createAnalyser();
            this.analyser.fftSize = 256;

            this.source = this.audioCtx.createMediaStreamSource(this.stream);
            this.source.connect(this.analyser);

            this.startRMSMonitoring();

            // 3. Setup MediaRecorder with cross-browser mimeTypes
            const mimeType = this.getBestMimeType();
            console.log(`[UniversalRecorder] Using mimeType: ${mimeType}`);

            this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });

            this.mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) this.chunks.push(e.data);
            };

            this.mediaRecorder.start(100); // Collect chunks every 100ms for safety

        } catch (error) {
            console.error('[UniversalRecorder] Start failed', error);
            this.cleanup();
            throw error;
        }
    }

    async stop(): Promise<Blob> {
        return new Promise((resolve) => {
            if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
                resolve(this.getBlob());
                return;
            }

            this.mediaRecorder.onstop = () => {
                const blob = this.getBlob();
                this.cleanup();
                resolve(blob);
            };

            this.mediaRecorder.stop();
        });
    }

    getBlob(): Blob {
        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
        return new Blob(this.chunks, { type: mimeType });
    }

    getRMS(): number {
        return this.currentRMS;
    }

    isRecording(): boolean {
        return this.mediaRecorder?.state === 'recording';
    }

    private getBestMimeType(): string {
        const types = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/mp4', // iOS 14.8+
            'audio/aac',
            'audio/ogg;codecs=opus'
        ];

        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) {
                return type;
            }
        }
        return ''; // Default Browser Choice
    }

    private startRMSMonitoring() {
        if (!this.analyser) return;
        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Float32Array(bufferLength);

        this.rmsInterval = setInterval(() => {
            if (!this.analyser) return;
            this.analyser.getFloatTimeDomainData(dataArray);

            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
                sum += dataArray[i] * dataArray[i];
            }
            this.currentRMS = Math.sqrt(sum / bufferLength);
        }, 50);
    }

    private cleanup() {
        if (this.rmsInterval) {
            clearInterval(this.rmsInterval);
            this.rmsInterval = null;
        }

        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        if (this.audioCtx && this.audioCtx.state !== 'closed') {
            this.audioCtx.close().catch(console.warn);
            this.audioCtx = null;
        }

        this.mediaRecorder = null;
        this.analyser = null;
        this.source = null;
    }
}
