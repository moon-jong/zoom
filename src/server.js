import express from "express";
import http from "http";
import {
  Server
} from "socket.io";
import { instrument } from "@socket.io/admin-ui";


const app = express();

app.set("view engine", "pug");
app.set("views", __dirname + "/views");
app.use("/public", express.static(__dirname + "/public"));
app.get("/", (_, res) => res.render("home"));
app.get("/*", (_, res) => res.redirect("/"));


const httpServer = http.createServer(app);
const wsServer = new Server(httpServer,{
  cors: {
    origin: ["https://admin.socket.io"],
    credentials: true
  }
});

instrument(wsServer, {
  auth: false
});

function publicRooms(){
  const {
    sockets: {
      adapter: {sids, rooms},
    },
  } = wsServer;

  const publicRooms = [];
  rooms.forEach((_, key) => {
    if (sids.get(key) === undefined){
      publicRooms.push(key);
    }
  })
  return publicRooms;
}

function countRoom(roomName){
  return wsServer.sockets.adapter.rooms.get(roomName)?.size;
}

wsServer.on("connection", (socket) => {
  socket["nickName"] = "Anonymous";
  console.log(wsServer.sockets.adapter);
  socket.onAny((event) => {
    console.log(publicRooms())
    console.log(`Socket event: ${event}`);
  });

  socket.on("enter_room", (roomName, showRoom) => {
    socket.join(roomName);
    showRoom();
    socket.to(roomName).emit("welcome", socket.nickName, countRoom(roomName));
    wsServer.sockets.emit("room_change", publicRooms());
  });

  socket.on("disconnecting", () => {
    socket.rooms.forEach(room => 
      socket.to(room).emit("bye", socket["nickName"], countRoom(room) - 1));
  });

  socket.on("disconnect", () => {
    wsServer.sockets.emit("room_change", publicRooms());
  });

  socket.on("new_message", (msg, roomName, done) => {
    socket.to(roomName).emit("new_message", `${socket["nickName"]} : ${msg}`);
    done();
  });

  socket.on("nickName", (nickName) => {
    socket["nickName"] = nickName;
    console.log(nickName);
    console.log(socket["nickName"]);
  });

});

const handleListen = () => console.log('Listening on ws://localhost:3000 & http');

httpServer.listen(3000, handleListen);

