export class Camera {
    constructor() {
        this.videoElement = document.createElement("video");
        this.stream = null;
    }

    async start() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ video: true });
            this.videoElement.srcObject = this.stream;
            this.videoElement.style.width = window.innerWidth;
            this.videoElement.style.height = window.innerHeight; 
            await this.videoElement.play();
        } catch (error) {
            console.error("Error accessing camera:", error);
            throw error;
        }
    }

    async stop() {
        if (this.stream) {
            const tracks = this.stream.getTracks();
            tracks.forEach(track => track.stop());
            this.videoElement.srcObject = null;
            this.stream = null;
        }
    }

    async getFrame() {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = this.videoElement.videoWidth;
        canvas.height = this.videoElement.videoHeight;
        ctx.drawImage(this.videoElement, 10, 10, canvas.width, canvas.height);
        return canvas;
    }
}
