const socket = io();

const myFace = document.getElementById("myFace");
const muteBtn = document.getElementById("mute");
const cameraBtn = document.getElementById("camera");
const camerasSelect = document.getElementById("cameras");
const videoElement = document.getElementById("my-video");
const guideCanvas = document.getElementById("my-guides");
const live2d = document.getElementById("my-live2d")
let currentModel, facemesh;
// const meshCanvas = document.getElementById("myMesh");
// const myCtx = meshCanvas.getContext("2d");

const modelUrl = "https://raw.githubusercontent.com/yeemachine/kalidokit/main/docs/models/hiyori/hiyori_pro_t10.model3.json";
// let myStream;
// let muted=false;
// let cameraOff=false;
// let roomName;
// let myPeerConnection;
// let myDataChannel;
// let canvasStream;

canvasStream = live2d.captureStream(30);


const call = document.getElementById("call")

const myMesh = new FaceMesh({locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
  }});

// myMesh.setOptions({
//     maxNumFaces: 1,
//     refineLandmarks: true,
//     minDetectionConfidence: 0.5,
//     minTrackingConfidence: 0.5
//   });
// myMesh['onResults'](myResults);

call.hidden = true;
myFace.hidden = true;



// function myResults(results) {
//     myCtx.save();
//     myCtx.clearRect(0, 0, meshCanvas.width, meshCanvas.height);
//     // myCtx.drawImage(
//     //     results.image, 0, 0, meshCanvas.width, meshCanvas.height);
//     if (results.multiFaceLandmarks) {
//       for (const landmarks of results.multiFaceLandmarks) {
//         drawConnectors(myCtx, landmarks, FACEMESH_TESSELATION,
//                        {color: '#C0C0C070', lineWidth: 1});
//         drawConnectors(myCtx, landmarks, FACEMESH_RIGHT_EYE, {color: '#FF3030'});
//         drawConnectors(myCtx, landmarks, FACEMESH_RIGHT_EYEBROW, {color: '#FF3030'});
//         drawConnectors(myCtx, landmarks, FACEMESH_RIGHT_IRIS, {color: '#FF3030'});
//         drawConnectors(myCtx, landmarks, FACEMESH_LEFT_EYE, {color: '#30FF30'});
//         drawConnectors(myCtx, landmarks, FACEMESH_LEFT_EYEBROW, {color: '#30FF30'});
//         drawConnectors(myCtx, landmarks, FACEMESH_LEFT_IRIS, {color: '#30FF30'});
//         drawConnectors(myCtx, landmarks, FACEMESH_FACE_OVAL, {color: '#E0E0E0'});
//         drawConnectors(myCtx, landmarks, FACEMESH_LIPS, {color: '#E0E0E0'});
//       }
//     }
//     myCtx.restore();
//   }


// const camera = new Camera(myFace, {
//     onFrame: async () => {
//       await myMesh.send({image: myFace});
//     },
//     width: 1280,
//     height: 1280
//   });
  
// camera.start();



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

            myFace.srcObject = myStream;

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

async function initCall(){
    welcome.hidden = true;
    call.hidden = false;
    await getMedia();
    makeConnection();
}


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
const {
	Application,
	live2d: { Live2DModel }
} = PIXI;

const {
	Face,
	Vector: { lerp },
	Utils: { clamp }
} = Kalidokit;



(async function main() {

	const app = new PIXI.Application({
		view: document.getElementById("my-live2d"),
		autoStart: true,
		backgroundAlpha: 0,
		backgroundColor: 0xffffff,
		resizeTo: window
	});

	currentModel = await Live2DModel.from(modelUrl, { autoInteract: false });
	currentModel.scale.set(0.4);
	currentModel.interactive = true;
	currentModel.anchor.set(0.5, 0.5);
	currentModel.position.set(window.innerWidth * 0.5, window.innerHeight * 0.8);

	currentModel.on("pointerdown", e => {
		currentModel.offsetX = e.data.global.x - currentModel.position.x;
		currentModel.offsetY = e.data.global.y - currentModel.position.y;
		currentModel.dragging = true;
	});
	currentModel.on("pointerup", e => {
		currentModel.dragging = false;
	});
	currentModel.on("pointermove", e => {
		if (currentModel.dragging) {
			currentModel.position.set(
				e.data.global.x - currentModel.offsetX,
				e.data.global.y - currentModel.offsetY
			);
		}
	});

	document.querySelector("#my-live2d").addEventListener("wheel", e => {
		e.preventDefault();
		currentModel.scale.set(
			clamp(currentModel.scale.x + event.deltaY * -0.001, -0.5, 10)
		);
	});

	app.stage.addChild(currentModel);

	facemesh = new FaceMesh({
		locateFile: file => {
			return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
		}
	});
	facemesh.setOptions({
		maxNumFaces: 1,
		refineLandmarks: true,
		minDetectionConfidence: 0.5,
		minTrackingConfidence: 0.5
	});
	facemesh.onResults(onResults);

	startCamera();
})();

const onResults = results => {
	drawResults(results.multiFaceLandmarks[0]);
	animateLive2DModel(results.multiFaceLandmarks[0]);
};

const drawResults = points => {
	if (!guideCanvas || !videoElement || !points) return;
	guideCanvas.width = videoElement.videoWidth;
	guideCanvas.height = videoElement.videoHeight;
	let canvasCtx = guideCanvas.getContext("2d");
	canvasCtx.save();
	canvasCtx.clearRect(0, 0, guideCanvas.width, guideCanvas.height);
	drawConnectors(canvasCtx, points, FACEMESH_TESSELATION, {
		color: "#C0C0C070",
		lineWidth: 1
	});
	if (points && points.length === 478) {
		drawLandmarks(canvasCtx, [points[468], points[468 + 5]], {
			color: "#ffe603",
			lineWidth: 2
		});
	}
};

const animateLive2DModel = points => {
	if(!currentModel || !points) return;
	let riggedFace = Face.solve(points, {
		runtime: "mediapipe",
		video: videoElement
	});
	rigFace(riggedFace, 0.5);
};

const rigFace = (result, lerpAmount = 0.7) => {
	if (!currentModel || !result) return;
	const updateFn = currentModel.internalModel.motionManager.update;
	const coreModel = currentModel.internalModel.coreModel;

	currentModel.internalModel.motionManager.update = (...args) => {
		currentModel.internalModel.eyeBlink = undefined;

		coreModel.setParameterValueById(
			"ParamEyeBallX",
			lerp(
				result.pupil.x,
				coreModel.getParameterValueById("ParamEyeBallX"),
				lerpAmount
			)
		);
		coreModel.setParameterValueById(
			"ParamEyeBallY",
			lerp(
				result.pupil.y,
				coreModel.getParameterValueById("ParamEyeBallY"),
				lerpAmount
			)
		);

		coreModel.setParameterValueById(
			"ParamAngleX",
			lerp(
				result.head.degrees.y,
				coreModel.getParameterValueById("ParamAngleX"),
				lerpAmount
			)
		);
		coreModel.setParameterValueById(
			"ParamAngleY",
			lerp(
				result.head.degrees.x,
				coreModel.getParameterValueById("ParamAngleY"),
				lerpAmount
			)
		);
		coreModel.setParameterValueById(
			"ParamAngleZ",
			lerp(
				result.head.degrees.z,
				coreModel.getParameterValueById("ParamAngleZ"),
				lerpAmount
			)
		);

		const dampener = 0.3;
		coreModel.setParameterValueById(
			"ParamBodyAngleX",
			lerp(
				result.head.degrees.y * dampener,
				coreModel.getParameterValueById("ParamBodyAngleX"),
				lerpAmount
			)
		);
		coreModel.setParameterValueById(
			"ParamBodyAngleY",
			lerp(
				result.head.degrees.x * dampener,
				coreModel.getParameterValueById("ParamBodyAngleY"),
				lerpAmount
			)
		);
		coreModel.setParameterValueById(
			"ParamBodyAngleZ",
			lerp(
				result.head.degrees.z * dampener,
				coreModel.getParameterValueById("ParamBodyAngleZ"),
				lerpAmount
			)
		);

		let stabilizedEyes = Kalidokit.Face.stabilizeBlink(
			{
				l: lerp(
					result.eye.l,
					coreModel.getParameterValueById("ParamEyeLOpen"),
					0.7
				),
				r: lerp(
					result.eye.r,
					coreModel.getParameterValueById("ParamEyeROpen"),
					0.7
				)
			},
			result.head.y
		);

		coreModel.setParameterValueById("ParamEyeLOpen", stabilizedEyes.l);
		coreModel.setParameterValueById("ParamEyeROpen", stabilizedEyes.r);
		coreModel.setParameterValueById(
			"ParamMouthOpenY", 
			lerp(result.mouth.y, coreModel.getParameterValueById("ParamMouthOpenY"), 0.3)
		);
		coreModel.setParameterValueById(
			"ParamMouthForm",
			0.3 + lerp(result.mouth.x, coreModel.getParameterValueById("ParamMouthForm"), 0.3)
		);
	};
};

const startCamera = ()=>{
	const camera = new Camera(videoElement, {
		onFrame: async ()=>{
			await facemesh.send({ image: videoElement });
		},
		width: 640, height: 480
	});
	camera.start();
};