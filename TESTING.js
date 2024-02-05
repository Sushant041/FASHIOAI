import * as THREE from './node_modules/three/build/three.module.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { FaceDetector, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9";
import { Camera } from "./camera.js";

let glassesModel;

const video = document.createElement('video');
video.setAttribute('autoplay', '');
video.setAttribute('playsinline', '');
video.style.position = 'absolute';
video.style.top = '0';
video.style.left = '0';
video.style.zIndex = -2;
document.body.appendChild(video);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera();
camera.position.set(0, 0, 5);
camera.lookAt(new THREE.Vector3(600 / 2, -600 / 2, 0));

const renderer = new THREE.WebGLRenderer({ alpha: true });
renderer.setSize(600, 600);
document.body.appendChild(renderer.domElement);

const loader = new GLTFLoader();
loader.load('./models/glasses.glb', (gltf) => {
    glassesModel = gltf.scene;
    scene.add(glassesModel);
}, undefined, (error) => {
    console.error('An error occurred while loading the glasses model:', error);
});

function updateGlassesPosition(detections) {
    const leftEye = detections[0].keypoints.find(keypoint => keypoint.label === 'left_eye');
    const rightEye = detections[0].keypoints.find(keypoint => keypoint.label === 'right_eye');

    if (leftEye && rightEye) {
        const glassesPosition = new THREE.Vector3(
            (leftEye.x + rightEye.x) / 2,
            -(leftEye.y + rightEye.y) / 2,
            0
        );

        glassesModel.position.copy(glassesPosition);
    }
}

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

function updateLandmarks(detections) {
    // Implement this function to visualize facial landmarks
}

async function initializeFaceDetector() {
    const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm");
    const faceDetector = await FaceDetector.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: "./models/blaze_face_short_range.tflite"
        },
        delegate: "GPU",
        runningMode: "IMAGE",
    });
    return faceDetector;
}

async function detectFacesOnWebcam() {
    const faceDetector = await initializeFaceDetector();
    const camera = new Camera(); // Make sure to import Camera or define it
    await camera.start(); // Start the camera
    
    video.srcObject = camera.stream;
    
    while (true) {
        try {
            const frame = await camera.getFrame();
            const result = await faceDetector.detect(frame);

            if (result.detections.length > 0) {
                updateLandmarks(result.detections); // Call updateLandmarks function
                updateGlassesPosition(result.detections);
            } else {
                console.log("No faces detected");
            }
        } catch (error) {
            console.error("Error processing frame:", error);
        }

        await new Promise(resolve => setTimeout(resolve, 100));
    }
}

detectFacesOnWebcam().catch(console.error);

animate();
