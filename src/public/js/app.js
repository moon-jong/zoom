const socket = io();
const welcome = document.getElementById("welcome");
const room = document.getElementById("room");
const form = welcome.querySelector("form");


let roomName;


room.hidden = true;

function handleMessageSubmit(event){
    event.preventDefault();
    const input = room.querySelector("#msg input");
    const value = input.value;
    socket.emit("new_message", input.value, roomName,() => {
        addMessage(`YOU : ${value}`);
    });
    input.value = "";

}

function handleNicknameSubmit(event){
    event.preventDefault();
    const input = room.querySelector("#nickName input");
    const value = input.value;
    socket.emit("nickName", value);
}

function showRoom() {
    welcome.hidden = true;
    console.log("Welcome!")
    room.hidden = false;

    const h3 = room.querySelector("h3");
    h3.innerText = `Room : ${roomName}`;

    const msgForm = room.querySelector("#msg");
    const nameForm = room.querySelector("#nickName");
    msgForm.addEventListener("submit", handleMessageSubmit);
    nameForm.addEventListener("submit", handleNicknameSubmit);

}

function handleRoomSubmit(event) {
    event.preventDefault();
    const input = form.querySelector("input");
    socket.emit("enter_room", input.value, showRoom);
    roomName = input.value;
    input.value = "";
}



function addMessage(message) {
    const ul = room.querySelector("ul");
    const li = document.createElement("li");
    li.innerText = message;
    ul.appendChild(li);

}

form.addEventListener("submit", handleRoomSubmit);


socket.on("welcome", (user, newCount) => {
    const h3 = room.querySelector("h3");
    h3.innerText = `Room : ${roomName} {(${newCount})}`;

    addMessage(`${user} Joined~`);
});

socket.on("bye", (nickName, newCount) => {
    const h3 = room.querySelector("h3");
    h3.innerText = `Room : ${roomName} (${newCount})`;
    addMessage(`${nickName} just got left ㅠㅠ`);
});

socket.on("new_message", addMessage);
socket.on("room_change", (rooms) => {
    const roomList = welcome.querySelector("ul");
    roomList.innerHTML = "";
    if(rooms.length === 0){
        return;
    }
    rooms.forEach(room => {
        const li = document.createElement("li");
        li.innerText = room;
        roomList.append(li);
    });
});