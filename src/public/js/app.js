import { getHeadInfo, drawLine, fillFaceAll, fillFaceOutline } from "./canvas_utils.js";
// import {FirstPersonControls} from "./FirstPersonControls.js"
// import * as THREE from "../three/three.js";
import { setCameraLight } from "../three/renderModule.js";

const socket = io();

const muteBtn = document.getElementById("mute");
const cameraBtn = document.getElementById("camera");
const camerasSelect = document.getElementById("cameras");
const videoElement = document.getElementById("my-video");
const guideCanvas = document.getElementById("my-guides");
const live2d = document.getElementById("my-live2d");
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
let currentModel, facemesh;


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
// const fo = 30;
// const zPosition = 1 / (Math.tan(15 * (Math.PI / 180)));
// const orbitCamera = new THREE.PerspectiveCamera(fo, 4/3, 0.1, 200);


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

// Animate Rotation Helper function
const rigRotation = (
	name,
	rotation = { x: 0, y: 0, z: 0 },
	dampener = 1,
	lerpAmount = 0.3
  ) => {
	if (!currentVrm) {return}
	const Part = currentVrm.humanoid.getBoneNode(
	  THREE.VRMSchema.HumanoidBoneName[name]
	);
	if (!Part) {return}
	
	let euler = new THREE.Euler(
	  rotation.x * dampener,
	  rotation.y * dampener,
	  rotation.z * dampener
	);
	let quaternion = new THREE.Quaternion().setFromEuler(euler);
	Part.quaternion.slerp(quaternion, lerpAmount); // interpolate
  };

  
  let oldLookTarget = new THREE.Euler()
  const rigFace = (riggedFace) => {
	  if(!currentVrm){return}
	  rigRotation("Head", riggedFace.head, 0.7);
  
	  // Blendshapes and Preset Name Schema
	  const Blendshape = currentVrm.blendShapeProxy;
	  const PresetName = THREE.VRMSchema.BlendShapePresetName;
	
	  // Simple example without winking. Interpolate based on old blendshape, then stabilize blink with `Kalidokit` helper function.
	  // for VRM, 1 is closed, 0 is open.
	//   riggedFace.eye.l = lerp(clamp(1 - riggedFace.eye.l, 0, 1),Blendshape.getValue(PresetName.Blink), .5)
	//   riggedFace.eye.r = lerp(clamp(1 - riggedFace.eye.r, 0, 1),Blendshape.getValue(PresetName.Blink), .5)
	//   riggedFace.eye = Kalidokit.Face.stabilizeBlink(riggedFace.eye,riggedFace.head.y)
	  riggedFace.eye = Kalidokit.Face.stabilizeBlink({
		l: lerp(clamp(1 - riggedFace.eye.l, 0, 1), Blendshape.getValue(PresetName.BlinkL), .2), 
		r: lerp(clamp(1 - riggedFace.eye.r, 0, 1), Blendshape.getValue(PresetName.BlinkR), .2)
	},riggedFace.head.y)
	  
	  Blendshape.setValue(PresetName.BlinkL, riggedFace.eye.l);
	  Blendshape.setValue(PresetName.BlinkR, riggedFace.eye.r);
	  
	  // Interpolate and set mouth blendshapes
	  Blendshape.setValue(PresetName.I, lerp(riggedFace.mouth.shape.I,Blendshape.getValue(PresetName.I), .25));
	  Blendshape.setValue(PresetName.A, lerp(riggedFace.mouth.shape.A,Blendshape.getValue(PresetName.A), .25));
	  Blendshape.setValue(PresetName.E, lerp(riggedFace.mouth.shape.E,Blendshape.getValue(PresetName.E), .25));
	  Blendshape.setValue(PresetName.O, lerp(riggedFace.mouth.shape.O,Blendshape.getValue(PresetName.O), .25));
	  Blendshape.setValue(PresetName.U, lerp(riggedFace.mouth.shape.U,Blendshape.getValue(PresetName.U), .25));
  
	  //PUPILS
	  //interpolate pupil and keep a copy of the value
	  let lookTarget =
		new THREE.Euler(
		  lerp(oldLookTarget.x , riggedFace.pupil.y, .4),
		  lerp(oldLookTarget.y, riggedFace.pupil.x, .4),
		  0,
		  "XYZ"
		)
	  oldLookTarget.copy(lookTarget);
	  currentVrm.lookAt.applyer.lookAt(lookTarget);
  }
  
 /* VRM Character Animator */
const animateVRM = (vrm, results) => {
	if (!vrm) {
	  return;
	}   
	// Take the results from `Holistic` and animate character based on its Face, Pose, and Hand Keypoints.
	let riggedFace;

  
	const faceLandmarks = results.multiFaceLandmarks[0];
  
	// Animate Face
	if (faceLandmarks) {
	 riggedFace = Kalidokit.Face.solve(faceLandmarks,{
		runtime:"mediapipe",
		video:videoElement
	 });
	 rigFace(riggedFace);


	}
  };

/* SETUP MEDIAPIPE HOLISTIC INSTANCE */
/* already setted */

const onResults = (results) => {
	// Draw landmark guides
	drawResults(results)
	alphaValue.innerHTML = alpha.value * 0.1;
	betaValue.innerHTML = beta.value * 0.1;
	gammaValue.innerHTML = gamma.value * 0.1;

	let headInfo = getHeadInfo(results);
	if (headInfo !== null){

		console.log(headInfo.position.x, headInfo.position.y, headInfo.faceSize);
		setBonePony(currentVrm, [(headInfo.position.x - 0.5) * 4/3, -(headInfo.position.y - 0.5), 0, headInfo.faceSize]);
		// setBackbonePosition(currentVrm, [headInfo.position.x - 0.5, -(headInfo.position.y - 0.5), 0, headInfo.faceSize]);
	}
	// Animate model
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
/* set all bones from root to neck position zero */

const removeBodyPony = ( vrm ) => {
    if ( vrm.scene.children[6].name = "wedel" ){
        vrm.scene.children[6].visible = false;  
        vrm.scene.children[5].children[2].visible = false;
    }
    else {
		vrm.scene.children[5].visible = false;  
		vrm.scene.children[6].children[2].visible = false;
	}
    vrm.scene.children[4].visible = false;  // "Kape+Tail"
    vrm.scene.children[3].visible = false;  // "Kape"
}

const setBonePony = ( vrm, [x, y, z, size]) =>{
    vrm.scene.children[0].children[0].position.set(x,y-0.05,0);  // "RootBone"
    vrm.scene.children[0].children[0].children[0].position.set(0,0,0);  // "HipsBone"
    vrm.scene.children[0].children[0].children[0].children[4].position.set(0,0,0);  // "SpineBone"
    vrm.scene.children[0].children[0].children[0].children[4].children[0].position.set(0,0,0);  // "ChestBone"
    vrm.scene.children[0].children[0].children[0].children[4].children[0].children[1].position.set(x,y,0);// "NeckBone"
    vrm.scene.children[0].children[0].children[0].children[4].children[0].children[1].children[0].position.set(0,-0.3,0);  // "HeadBone"
	vrm.scene.children[0].children[0].children[0].children[4].children[0].children[1].children[0].scale.set(size * 10, size * 10, size * 10);
}

const setBackbonePosition = ( vrm, [x, y, z, size]) =>{
    vrm.scene.children[0].position.set(x, y, 0);  // "Root"
    vrm.scene.children[0].children[0].position.set(0,0,0);  // "J_Bip_C_Hips"
    vrm.scene.children[0].children[0].children[0].position.set(0,0,0);  // "J_Bip_C_Spine"
    vrm.scene.children[0].children[0].children[0].children[0].position.set(0,0,0);  // "J_Bip_C_Chest"
    vrm.scene.children[0].children[0].children[0].children[0].children[0].position.set(0,0,0);// "J_Bip_C_UpperChest"
    vrm.scene.children[0].children[0].children[0].children[0].children[0].children[5].position.set(x,y,0);  // "J_Bip_C_Neck"
    vrm.scene.children[0].children[0].children[0].children[0].children[0].children[5].children[0].position.set(0,-0.3,0); // "J_Bip_C_Head"
	vrm.scene.children[0].children[0].children[0].children[0].children[0].children[5].children[0].scale.set(size * 30, size * 30, size * 30);
}


const drawResults = (results) => {
	guideCanvas.width = videoElement.videoWidth;
	guideCanvas.height = videoElement.videoHeight;
	let canvasCtx = guideCanvas.getContext('2d');
	canvasCtx.save();
	canvasCtx.clearRect(0, 0, guideCanvas.width, guideCanvas.height);
	canvasCtx.drawImage(results.image, 0, 0, guideCanvas.width, guideCanvas.height);

	// Use `Mediapipe` drawing functions
	drawConnectors(canvasCtx, results.multiFaceLandmarks[0], FACEMESH_TESSELATION, {
	color: "#C0C0C070",
	lineWidth: 1
		});
	if(results.multiFaceLandmarks[0] && results.multiFaceLandmarks[0].length === 478){
	//draw pupils
	drawLandmarks(canvasCtx, [results.multiFaceLandmarks[0][468],results.multiFaceLandmarks[0][468+5]], {
		color: "#ffe603",
		lineWidth: 2
		});
	}
	}


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

// camW = myFace.srcObject.getVideoTracks()[0].getSettings().width;
// camH = myFace.srcObject.getVideoTracks()[0].getSettings().height;

