import * as THREE from './node_modules/three/build/three.module.js';
// import {OrbitControls} from 'node_modules/three/build/three.module.js';
import {GLTFLoader} from './node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import { FaceDetector, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9";
import { Camera } from "./camera.js";


// Create video element for displaying webcam feed
let glassesPosition;
const video = document.createElement('video');
video.setAttribute('autoplay', '');
video.setAttribute('playsinline', '');
video.style.position = 'absolute';
video.style.top = '0';
video.style.left = '0';
video.style.zIndex = -2;
video.style.width = "100vw";

document.body.appendChild(video);

// Create Three.js scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera();
camera.position.set(0,0,5);
// camera.lookAt( { x: 600 / 2, y: -600 / 2, z: 0, isVector3: true } );

const renderer = new THREE.WebGLRenderer({alpha : true});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
// const axesHelper = new THREE.AxesHelper(5);
// scene.add(axesHelper);

const path = './glasses1/scene.gltf';

const loader = new GLTFLoader();

let glassesModel;
let avgX, avgY, avgZ;

// Load glasses model
loader.load(
    path,
   async function (gltf) {
        glassesModel = gltf.scene;

        glassesModel.position.set(0, 0, -1); 
        glassesModel.scale.set(0.01, 0.01, 0.01); 
        glassesModel.rotation.set(0, 0, 0); 
        const light = new THREE.HemisphereLight( 0xffffff, 0xbbbbff, 1 );
        scene.add(light);
        scene.add(glassesModel);
        console.log(glassesModel);
    },
    undefined,
    function (error) {
        console.error('An error occurred while loading the glasses model:', error);
    }
);

// // Function to update the position of the glasses based on detected facial landmarks
function updateGlassesPosition(detectionData) {
    if (!glassesModel || detectionData.length === 0) return;

    const detection = detectionData[0];
    const keypoints = detection.keypoints;

    let totalX = 0;
    let totalY = 0;
    for (const keypoint of keypoints) {
        totalX += keypoint.x;
        totalY += keypoint.y;
        
    }
    avgX = totalX / keypoints.length;
    avgY = totalY / keypoints.length;
    avgZ = 1;
    

    glassesPosition = new THREE.Vector3((keypoints[0].y + keypoints[1].y)/2, (keypoints[0].y + keypoints[1].y)/2, avgZ);

    const rotationAngle = Math.atan2(keypoints[1].y - keypoints[0].y, keypoints[1].x - keypoints[0].x);
    glassesModel.rotation.z = -rotationAngle;
}


function updateLandmarks(detectionData) {
    const existingLandmarks = document.querySelectorAll('.landmark');
    existingLandmarks.forEach(landmark => landmark.remove());

    detectionData.forEach(detection => {
        const keypoints = detection.keypoints;
        if (keypoints.length > 0) {
            keypoints.forEach((landmark) => {
           
                const landmarkEl = document.createElement('div');
                landmarkEl.classList.add('landmark');
                landmarkEl.style.position = 'absolute';
                landmarkEl.style.width = '5px'; 
                landmarkEl.style.height = '5px';
                landmarkEl.style.backgroundColor = 'red'; 
                const adjustedX = (landmark.x * video.videoWidth);
                const adjustedY = (landmark.y * video.videoHeight);
                landmarkEl.style.left = `${adjustedX}px`;
                landmarkEl.style.top = `${adjustedY}px`;
                document.body.appendChild(landmarkEl); 
            });
        } else {
            console.warn("Invalid or incomplete face detection data:", detection);
        }
    });
}




// Function to render the scene
function animate() {
    requestAnimationFrame(animate);
    if (glassesModel && glassesPosition){
        console.log(glassesModel.position,glassesPosition)
        glassesModel.position.y = glassesPosition.y;
        glassesModel.position.x = glassesPosition.x;
        // glassesModel.position.z = glassesPosition.z;
    }
    
    renderer.render(scene, camera);
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

// Function to detect faces in webcam video frames
async function detectFacesOnWebcam() {
    const faceDetector = await initializeFaceDetector();
    const camera = new Camera();
    await camera.start(); 
    
    video.srcObject = camera.stream;

    while (true) {
        try {
            const frame = await camera.getFrame();
            const result = await faceDetector.detect(frame);

            if (result.detections.length > 0) {
                // updateLandmarks(result.detections);
                updateGlassesPosition(result.detections);
            } else {
                console.log("No faces detected");
            }
        } catch (error) {
            console.error("Error processing frame:", error);
        }

        await new Promise((resolve) => setTimeout(resolve, 100));
    }
}

detectFacesOnWebcam().catch(console.error);

animate();
