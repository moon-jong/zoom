const socket = io();

const myFace = document.getElementById("myFace");
const muteBtn = document.getElementById("mute");
const cameraBtn = document.getElementById("camera");
const camerasSelect = document.getElementById("cameras");
const videoElement = document.getElementById("my-video");
const meshCanvas = document.getElementById("myMesh");
const myCtx = meshCanvas.getContext("2d");

canvasStream = meshCanvas.captureStream(30);


const call = document.getElementById("call")

const myMesh = new FaceMesh({locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
  }});

myMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
  });

myMesh['onResults'](myResults);

call.hidden = true;
myFace.hidden = true;
videoElement.hidden = true;


function myResults(results) {
    myCtx.save();
    myCtx.clearRect(0, 0, meshCanvas.width, meshCanvas.height);
    // myCtx.drawImage(
    //     results.image, 0, 0, meshCanvas.width, meshCanvas.height);
    if (results.multiFaceLandmarks) {
      for (const landmarks of results.multiFaceLandmarks) {
        drawConnectors(myCtx, landmarks, FACEMESH_TESSELATION,
                       {color: '#C0C0C070', lineWidth: 1});
        drawConnectors(myCtx, landmarks, FACEMESH_RIGHT_EYE, {color: '#FF3030'});
        drawConnectors(myCtx, landmarks, FACEMESH_RIGHT_EYEBROW, {color: '#FF3030'});
        drawConnectors(myCtx, landmarks, FACEMESH_RIGHT_IRIS, {color: '#FF3030'});
        drawConnectors(myCtx, landmarks, FACEMESH_LEFT_EYE, {color: '#30FF30'});
        drawConnectors(myCtx, landmarks, FACEMESH_LEFT_EYEBROW, {color: '#30FF30'});
        drawConnectors(myCtx, landmarks, FACEMESH_LEFT_IRIS, {color: '#30FF30'});
        drawConnectors(myCtx, landmarks, FACEMESH_FACE_OVAL, {color: '#E0E0E0'});
        drawConnectors(myCtx, landmarks, FACEMESH_LIPS, {color: '#E0E0E0'});
      }
    }
    myCtx.restore();
  }


const camera = new Camera(myFace, {
    onFrame: async () => {
      await myMesh.send({image: myFace});
    },
    width: 1280,
    height: 1280
  });
  
camera.start();



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
