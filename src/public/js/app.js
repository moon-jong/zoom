const socket = io();

const myFace = document.getElementById("myFace");
const muteBtn = document.getElementById("mute");
const cameraBtn = document.getElementById("camera");
const camerasSelect = document.getElementById("cameras");

let myStream;
let muted=false;
let cameraOff=false;
let roomName;
let myPeerConnection;
let myDataChannel;

const call = document.getElementById("call")

call.hidden = true;

async function getCameras(){
    try{
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(device => device.kind === "videoinput")
        const currentCamera = myStream.getVideoTracks()[0];
        cameras.forEach(camera => {
            const option = document.createElement("option");
            option.value = camera.deviceId;
            option.innerText = camera.label;
            if (currentCamera.label === camera.label){
                option.selected = true;
            }
            camerasSelect.appendChild(option);
        });
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
        const videoTrack = myStream.getVideoTracks()[0];
        const videoSender = myPeerConnection
        .getSenders()
        .find(sender => sender.track.kind === "video");

        const audioTrack = myStream.getAudioTracks()[0];
        const audioSender = myPeerConnection
        .getSenders()
        .find(sender => sender.track.kind == "audio");

        videoSender.replaceTrack(videoTrack);
        if(muted){
            audioSender.track.enabled = false;
            audioSender.track.muted = true;
        } else{
            audioSender.track.enabled = true;
            audioSender.track.muted = false;
        }
    
        console.log(audioTrack);
        
        console.log(videoSender);
        console.log(audioSender);

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

//RTC Code 
function makeConnection(){
    myPeerConnection = new RTCPeerConnection();
    myPeerConnection.addEventListener("icecandidate", handleIce);
    myPeerConnection.addEventListener("addstream", handleAddStream);
    myStream
        .getTracks()
        .forEach(track => myPeerConnection.addTrack(track, myStream));
}

function handleIce(data){
    console.log("sent candidtae");
    socket.emit("ice", data.candidate, roomName);
}

function handleAddStream(data) {
    const peerFace = document.getElementById("peerFace");
    peerFace.srcObject = data.stream;
}