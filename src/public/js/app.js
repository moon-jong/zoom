import { getHeadInfo, drawLine, fillFaceAll, fillFaceOutline } from "./canvas_utils.js";
// import {FirstPersonControls} from "./FirstPersonControls.js"
// import * as THREE from "../three/three.js";
import { setCameraLight, setBonePony, rigFace, removeBodyPony, drawResults } from "../three/renderModule.js";

const socket = io();

const muteBtn = document.getElementById("mute");
const cameraBtn = document.getElementById("camera");
const camerasSelect = document.getElementById("cameras");
const videoElement = document.getElementById("my-video");
const guideCanvas = document.getElementById("my-guides");
// const live2d = document.getElementById("my-live2d");
const ul = document.getElementById("videos");
const alpha = document.getElementById("alpha");
const beta = document.getElementById("beta");
const gamma = document.getElementById("gamma");
const alphaValue = document.getElementById("alphaValue");
const betaValue = document.getElementById("betaValue");
const gammaValue = document.getElementById("gammaValue");
const remap = Kalidokit.Utils.remap;
const clamp = Kalidokit.Utils.clamp;
const lerp = Kalidokit.Vector.lerp;




let currentVrm;
let mute = false;

const renderer = new THREE.WebGLRenderer({alpha:true});
renderer.setSize(640, 480);
renderer.setPixelRatio(window.devicePixelRatio);
ul.append(renderer.domElement);
renderer.domElement.id = 'threeDID';
const gl = renderer.getContext('webgl');
const guideCtx = guideCanvas.getContext('2d');


// scene
const scene = new THREE.Scene();
scene.visible = false;

const renderCanvas = document.getElementById('threeDID');


let canvasStream = renderCanvas.captureStream(30);


const call = document.getElementById("call")

  
async function initCall(){
    welcome.hidden = true;
    call.hidden = false;
	scene.visible = true;
    guideCanvas.hidden = false;
    await getMedia();
    makeConnection();
}


async function getCameras(){
    try{
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(device => device.kind === "videoinput")
        cameras.forEach(camera => {
            const option = document.createElement("option");
            option.value = camera.deviceId;
            option.innerText = camera.label;
            if (currentCamera.label === camera.label){
                option.selected = true;
            }
            camerasSelect.appendChild(option);
        });
        const currentCamera = canvasStream.getTracks()[0]
        } catch (e){
        console.log(e);
    }
}

async function getMedia(deviceId){
    const initialContrains = {
        audio: true,
        video: { facingMode: "user"},
    };
    const cameraConstraints = {
        audio:true,
        video: { deviceId: { exect: deviceId}}
    }
    try{
        myStream = await navigator.mediaDevices.getUserMedia(
            deviceId? cameraConstraints : initialContrains
            );

            videoElement.srcObject = myStream;

            if(!deviceId){
                await getCameras();
            }
    }catch(e){
        console.log(e);
    }
}

function handleMuteClick(){
    myStream
        .getAudioTracks()
        .forEach(track => (track.enabled = !track.enabled));
    if (!muted){
        muteBtn.innerText = "Unmute";
        muted = true;
    } else{
        muteBtn.innerText = "Mute";
        muted = false;
    }
}


function handleCameraClick(){ 
    myStream
        .getVideoTracks()
        .forEach(track => (track.enabled = !track.enabled));

    if (cameraOff){
        cameraBtn.innerText = "Turn Camera On";
        cameraOff = false;
    } else{
        cameraBtn.innerText = "Turn Camera Off";
        cameraOff = true;
    }
}

async function handleCameraChange(){
    await getMedia(camerasSelect.value);
    if(myPeerConnection){
        const audioTrack = myStream.getAudioTracks()[0];
        console.log("audio_enabled = ", audioTrack.enabled);
        const videoTrack = canvasStream.getVideoTracks()[0];
        const videoSender = myPeerConnection
        .getSenders()
        .find(sender => sender.track.kind === "video");

        if(muted){
            audioTrack.enabled = false;
        }

        
        videoSender.replaceTrack(videoTrack);
        console.log(videoSender);


    }

}


muteBtn.addEventListener("click", handleMuteClick);
cameraBtn.addEventListener("click", handleCameraClick);
camerasSelect.addEventListener("input", handleCameraChange);


// Welcome Form (join room)
const welcome = document.getElementById("welcome") 
let welcomeForm = welcome.querySelector("form")




async function handleWelcomeSubmit(event){
    event.preventDefault();
    const input = welcomeForm.querySelector("input");
    await initCall();
    socket.emit("join_room", input.value);
    let roomName = input.value;
    input.value = "";
}

welcomeForm.addEventListener("submit", handleWelcomeSubmit);

// Socket Code
//peer one
socket.on("welcome", async () => {
    myDataChannel = myPeerConnection.createDataChannel("chat");
    myDataChannel.addEventListener("message", (event) => {
        console.log(event.data);
    });
    console.log("made datachannel");
    const offer = await myPeerConnection.createOffer();
    myPeerConnection.setLocalDescription(offer);
    console.log(offer);
    socket.emit("offer", offer, roomName);
    console.log("sent the offer");
});

//peer two
socket.on("offer", async offer =>{
    myPeerConnection.addEventListener("datachannel", (event) =>{
        myDataChannel = event.channel;
        myDataChannel.addEventListener("message", console.log(event.data));
    });
    console.log("received the offer");
    myPeerConnection.setRemoteDescription(offer);
    const answer = await myPeerConnection.createAnswer();
    myPeerConnection.setLocalDescription(answer);
    socket.emit("answer", answer, roomName);
    console.log("sent the answer");
});

socket.on("answer", async answer => {
    console.log("received the answer");
    myPeerConnection.setRemoteDescription(answer);
});

socket.on("ice", (ice) => {
    console.log("received candidate");
    myPeerConnection.addIceCandidate(ice);
});

function makeConnection(){
    let myPeerConnection = new RTCPeerConnection();
    myPeerConnection.addEventListener("icecandidate", handleIce);
    myPeerConnection.addEventListener("addstream", handleAddStream);
    myPeerConnection.addStream(canvasStream);
    
    // myStream
    //     .getTracks()
    //     .forEach(track => if(track.){

    //     })
    // myStream
    //     .getTracks()
    //     .forEach(track => myPeerConnection.addTrack(track, canvasStream));
}


function handleIce(data){
    console.log("sent candidtae");
    socket.emit("ice", data.candidate, roomName);
}

function handleAddStream(data) {
    const peerFace = document.getElementById("peerFace");

    peerFace.srcObject = data.stream;
    
}

/*------------------------------------------------------------*/
/* Kalido app */
// camera
const orbitCamera = setCameraLight(30, scene);


// Main Render Loop
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  if (currentVrm) {
    // Update model to render physics
    currentVrm.update(clock.getDelta());
	/* asis
	currentVrm.scene.children[4].visible =false;
	currentVrm.scene.children[1].visible =true;
	for (let i = 60 ; i < 99 ; i++){
        currentVrm.scene.children[1].children[0].children[i].visible = false;
    }
	*/
	  removeBodyPony(currentVrm)

	
  }
  renderer.render(scene, orbitCamera);
}
animate();
// animate(currentVrm, clock, renderer, scene, orbitCamera);

// console.log(currentVrm);
/* VRM CHARACTER SETUP */

// Import Character VRM
const loader = new THREE.GLTFLoader();
loader.crossOrigin = "anonymous";
// Import model from URL, add your own model here
loader.load(
//   "https://cdn.glitch.com/29e07830-2317-4b15-a044-135e73c7f840%2FAshtra.vrm?v=1630342336981",
'/public/vrm/Saitama.vrm',

  gltf => {
    THREE.VRMUtils.removeUnnecessaryJoints(gltf.scene);

    THREE.VRM.from(gltf).then(vrm => {
      scene.add(vrm.scene);
      currentVrm = vrm;
      currentVrm.scene.rotation.y = Math.PI; // Rotate model 180deg to face camera
    });
  },

  progress =>
    console.log(
      "Loading model...",
      100.0 * (progress.loaded / progress.total),
      "%"
    ),

  error => console.error(error),
);

const onResults = (results) => {

  processResults(results, currentVrm, guideCanvas, videoElement, oldLookTarget);

}
	// Animate model
  // console.log(currentVrm);
	animateVRM(currentVrm, results);
  }
const material = new THREE.LineBasicMaterial({
	color: 0x0000ff
});


const holistic = new FaceMesh({locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
  }});


holistic.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
  });

// Pass holistic a callback function
holistic.onResults(onResults);


const camera = new Camera(videoElement, {
	onFrame: async () => {
	  await holistic.send({image: videoElement});
	},
	width: 640,
	height: 480
  });

camera.start();

call.hidden = true;
videoElement.hidden = true;
guideCanvas.hidden = true;
guideCanvas.style.webkitTransform = "scaleX(-1)";
guideCanvas.style.position = 'absolute';
renderCanvas.style.position = 'absolute';
