const socket = io();

const muteBtn = document.getElementById("mute");
const cameraBtn = document.getElementById("camera");
const camerasSelect = document.getElementById("cameras");
const videoElement = document.getElementById("my-video");
const guideCanvas = document.getElementById("my-guides");
const live2d = document.getElementById("my-live2d");
const ul = document.getElementById("videos");
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

// scene
const scene = new THREE.Scene();
scene.visible = false;

const renderCanvas = document.getElementById('threeDID')

let currentModel, facemesh;


canvasStream = renderCanvas.captureStream(30);


const call = document.getElementById("call")

// const myMesh = new FaceMesh({locateFile: (file) => {
//     return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
//   }});
  
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
welcomeForm = welcome.querySelector("form")




async function handleWelcomeSubmit(event){
    event.preventDefault();
    const input = welcomeForm.querySelector("input");
    await initCall();
    socket.emit("join_room", input.value);
    roomName = input.value;
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
    myPeerConnection = new RTCPeerConnection();
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


/* Kalido app */



// camera
const orbitCamera = new THREE.PerspectiveCamera(35,window.innerWidth / window.innerHeight,0.1,1000);
orbitCamera.position.set(0.0, 1.4, 0.7);

// controls
// const orbitControls = new THREE.OrbitControls(orbitCamera, renderer.domElement);
// orbitControls.screenSpacePanning = false;
// orbitControls.target.set(0.0, 1.4, 0.0);
// orbitControls.update();


// light
const light = new THREE.DirectionalLight(0xffffff);
light.position.set(1.0, 1.0, 1.0).normalize();
scene.add(light);

// Main Render Loop
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  if (currentVrm) {
    // Update model to render physics
    currentVrm.update(clock.getDelta());
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
  "https://cdn.glitch.com/29e07830-2317-4b15-a044-135e73c7f840%2FAshtra.vrm?v=1630342336981",

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

  error => console.error(error)
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

  // Animate Position Helper Function
const rigPosition = (
	name,
	position = { x: 0, y: 0, z: 0 },
	dampener = 10,
	lerpAmount = 10
  ) => {
	if (!currentVrm) {return}
	const Part = currentVrm.humanoid.getBoneNode(
	  THREE.VRMSchema.HumanoidBoneName[name]
	);
	if (!Part) {return}
	let vector = new THREE.Vector3(
	  position.x * dampener,
	  position.y * dampener,
	  position.z * dampener
	);
	Part.position.lerp(vector, lerpAmount); // interpolate
  };
  
  let oldLookTarget = new THREE.Euler()
  const rigFace = (riggedFace) => {
	  if(!currentVrm){return}
	  rigRotation("Neck", riggedFace.head, 0.7);
  
	  // Blendshapes and Preset Name Schema
	  const Blendshape = currentVrm.blendShapeProxy;
	  const PresetName = THREE.VRMSchema.BlendShapePresetName;
	
	  // Simple example without winking. Interpolate based on old blendshape, then stabilize blink with `Kalidokit` helper function.
	  // for VRM, 1 is closed, 0 is open.
	  riggedFace.eye.l = lerp(clamp(1 - riggedFace.eye.l, 0, 1),Blendshape.getValue(PresetName.Blink), .5)
	  riggedFace.eye.r = lerp(clamp(1 - riggedFace.eye.r, 0, 1),Blendshape.getValue(PresetName.Blink), .5)
	  riggedFace.eye = Kalidokit.Face.stabilizeBlink(riggedFace.eye,riggedFace.head.y)
	  Blendshape.setValue(PresetName.Blink, riggedFace.eye.l);
	  
	  // Interpolate and set mouth blendshapes
	  Blendshape.setValue(PresetName.I, lerp(riggedFace.mouth.shape.I,Blendshape.getValue(PresetName.I), .5));
	  Blendshape.setValue(PresetName.A, lerp(riggedFace.mouth.shape.A,Blendshape.getValue(PresetName.A), .5));
	  Blendshape.setValue(PresetName.E, lerp(riggedFace.mouth.shape.E,Blendshape.getValue(PresetName.E), .5));
	  Blendshape.setValue(PresetName.O, lerp(riggedFace.mouth.shape.O,Blendshape.getValue(PresetName.O), .5));
	  Blendshape.setValue(PresetName.U, lerp(riggedFace.mouth.shape.U,Blendshape.getValue(PresetName.U), .5));
  
	  //PUPILS
	  //interpolate pupil and keep a copy of the value
	  let lookTarget =
		new THREE.Euler(
		  lerp(oldLookTarget.x , riggedFace.pupil.y, .4),
		  lerp(oldLookTarget.y, riggedFace.pupil.x, .4),
		  0,
		  "XYZ"
		)
	  oldLookTarget.copy(lookTarget)
	  currentVrm.lookAt.applyer.lookAt(lookTarget);
  }
  
 /* VRM Character Animator */
const animateVRM = (vrm, results) => {
	if (!vrm) {
	  return;
	}   
	// Take the results from `Holistic` and animate character based on its Face, Pose, and Hand Keypoints.
	let riggedPose, riggedLeftHand, riggedRightHand, riggedFace;
    let renderCtx = renderCanvas.getContext('2d');

  
	const faceLandmarks = results.faceLandmarks;
	// Pose 3D Landmarks are with respect to Hip distance in meters
	const pose3DLandmarks = results.ea;
	// Pose 2D landmarks are with respect to videoWidth and videoHeight
	const pose2DLandmarks = results.poseLandmarks;
	// Be careful, hand landmarks may be reversed
	const leftHandLandmarks = results.rightHandLandmarks;
	const rightHandLandmarks = results.leftHandLandmarks;
  
	// Animate Face
	if (faceLandmarks) {
	 riggedFace = Kalidokit.Face.solve(faceLandmarks,{
		runtime:"mediapipe",
		video:videoElement
	 });
	 rigFace(riggedFace)
	}
  
	// Animate Pose
	if (pose2DLandmarks && pose3DLandmarks) {
	  riggedPose = Kalidokit.Pose.solve(pose3DLandmarks, pose2DLandmarks, {
		runtime: "mediapipe",
		video:videoElement,
	  });
	  rigRotation("Hips", riggedPose.Hips.rotation, 0.7);
	  rigPosition(
		"Hips",
		{
		  x: riggedPose.Hips.position.x, // Reverse direction
		  y: riggedPose.Hips.position.y + 1, // Add a bit of height
		  z: -riggedPose.Hips.position.z // Reverse direction
		},
		1,
		0.07
	  );
  
	  rigRotation("Chest", riggedPose.Spine, 0.25, .3);
	  rigRotation("Spine", riggedPose.Spine, 0.45, .3);
  
	  rigRotation("RightUpperArm", riggedPose.RightUpperArm, 1, .3);
	  rigRotation("RightLowerArm", riggedPose.RightLowerArm, 1, .3);
	  rigRotation("LeftUpperArm", riggedPose.LeftUpperArm, 1, .3);
	  rigRotation("LeftLowerArm", riggedPose.LeftLowerArm, 1, .3);
  
	  rigRotation("LeftUpperLeg", riggedPose.LeftUpperLeg, 1, .3);
	  rigRotation("LeftLowerLeg", riggedPose.LeftLowerLeg, 1, .3);
	  rigRotation("RightUpperLeg", riggedPose.RightUpperLeg, 1, .3);
	  rigRotation("RightLowerLeg", riggedPose.RightLowerLeg, 1, .3);
	}
  
	// Animate Hands
	if (leftHandLandmarks) {
	  riggedLeftHand = Kalidokit.Hand.solve(leftHandLandmarks, "Left");
	  rigRotation("LeftHand", {
		// Combine pose rotation Z and hand rotation X Y
		z: riggedPose.LeftHand.z,
		y: riggedLeftHand.LeftWrist.y,
		x: riggedLeftHand.LeftWrist.x
	  });
	  rigRotation("LeftRingProximal", riggedLeftHand.LeftRingProximal);
	  rigRotation("LeftRingIntermediate", riggedLeftHand.LeftRingIntermediate);
	  rigRotation("LeftRingDistal", riggedLeftHand.LeftRingDistal);
	  rigRotation("LeftIndexProximal", riggedLeftHand.LeftIndexProximal);
	  rigRotation("LeftIndexIntermediate", riggedLeftHand.LeftIndexIntermediate);
	  rigRotation("LeftIndexDistal", riggedLeftHand.LeftIndexDistal);
	  rigRotation("LeftMiddleProximal", riggedLeftHand.LeftMiddleProximal);
	  rigRotation("LeftMiddleIntermediate", riggedLeftHand.LeftMiddleIntermediate);
	  rigRotation("LeftMiddleDistal", riggedLeftHand.LeftMiddleDistal);
	  rigRotation("LeftThumbProximal", riggedLeftHand.LeftThumbProximal);
	  rigRotation("LeftThumbIntermediate", riggedLeftHand.LeftThumbIntermediate);
	  rigRotation("LeftThumbDistal", riggedLeftHand.LeftThumbDistal);
	  rigRotation("LeftLittleProximal", riggedLeftHand.LeftLittleProximal);
	  rigRotation("LeftLittleIntermediate", riggedLeftHand.LeftLittleIntermediate);
	  rigRotation("LeftLittleDistal", riggedLeftHand.LeftLittleDistal);
	}
	if (rightHandLandmarks) {
	  riggedRightHand = Kalidokit.Hand.solve(rightHandLandmarks, "Right");
	  rigRotation("RightHand", {
		// Combine Z axis from pose hand and X/Y axis from hand wrist rotation
		z: riggedPose.RightHand.z,
		y: riggedRightHand.RightWrist.y,
		x: riggedRightHand.RightWrist.x
	  });
	  rigRotation("RightRingProximal", riggedRightHand.RightRingProximal);
	  rigRotation("RightRingIntermediate", riggedRightHand.RightRingIntermediate);
	  rigRotation("RightRingDistal", riggedRightHand.RightRingDistal);
	  rigRotation("RightIndexProximal", riggedRightHand.RightIndexProximal);
	  rigRotation("RightIndexIntermediate",riggedRightHand.RightIndexIntermediate);
	  rigRotation("RightIndexDistal", riggedRightHand.RightIndexDistal);
	  rigRotation("RightMiddleProximal", riggedRightHand.RightMiddleProximal);
	  rigRotation("RightMiddleIntermediate", riggedRightHand.RightMiddleIntermediate);
	  rigRotation("RightMiddleDistal", riggedRightHand.RightMiddleDistal);
	  rigRotation("RightThumbProximal", riggedRightHand.RightThumbProximal);
	  rigRotation("RightThumbIntermediate", riggedRightHand.RightThumbIntermediate);
	  rigRotation("RightThumbDistal", riggedRightHand.RightThumbDistal);
	  rigRotation("RightLittleProximal", riggedRightHand.RightLittleProximal);
	  rigRotation("RightLittleIntermediate", riggedRightHand.RightLittleIntermediate);
	  rigRotation("RightLittleDistal", riggedRightHand.RightLittleDistal);
	}
    // if (realResult) {
    //     renderCtx.drawImage(realResult, 0, 0, renderCtx.width, renderCtx.height);
        
    //   }
  };

/* SETUP MEDIAPIPE HOLISTIC INSTANCE */
/* already setted */


const onResults = (results) => {
	// Draw landmark guides
	drawResults(results)
	// Animate model
	animateVRM(currentVrm, results);
  }
  
const holistic = new Holistic({
	locateFile: file => {
	return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic@0.5.1635989137/${file}`;
	}
});

holistic.setOptions({
	modelComplexity: 1,
	smoothLandmarks: true,
	minDetectionConfidence: 0.7,
	minTrackingConfidence: 0.7,
	refineFaceLandmarks: true,
});
// Pass holistic a callback function
holistic.onResults(onResults);

const drawResults = (results) => {
	guideCanvas.width = videoElement.videoWidth;
	guideCanvas.height = videoElement.videoHeight;
	let canvasCtx = guideCanvas.getContext('2d');
	canvasCtx.save();
	canvasCtx.clearRect(0, 0, guideCanvas.width, guideCanvas.height);
    canvasCtx.drawImage(results.image, 0, 0, guideCanvas.width, guideCanvas.height);

	// Use `Mediapipe` drawing functions
	drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {
		color: "#00cff7",
		lineWidth: 4
		});
		drawLandmarks(canvasCtx, results.poseLandmarks, {
		color: "#ff0364",
		lineWidth: 2
		});
		drawConnectors(canvasCtx, results.faceLandmarks, FACEMESH_TESSELATION, {
		color: "#C0C0C070",
		lineWidth: 1
		});
		if(results.faceLandmarks && results.faceLandmarks.length === 478){
		//draw pupils
		drawLandmarks(canvasCtx, [results.faceLandmarks[468],results.faceLandmarks[468+5]], {
			color: "#ffe603",
			lineWidth: 2
		});
		}
		drawConnectors(canvasCtx, results.leftHandLandmarks, HAND_CONNECTIONS, {
		color: "#eb1064",
		lineWidth: 5
		});
		drawLandmarks(canvasCtx, results.leftHandLandmarks, {
		color: "#00cff7",
		lineWidth: 2
		});
		drawConnectors(canvasCtx, results.rightHandLandmarks, HAND_CONNECTIONS, {
		color: "#22c3e3",
		lineWidth: 5
		});
		drawLandmarks(canvasCtx, results.rightHandLandmarks, {
		color: "#ff0364",
		lineWidth: 2
		});
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


