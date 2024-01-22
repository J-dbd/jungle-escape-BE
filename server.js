const express = require("express");

const app = express();
const port = 3000;

const http = require("http");
const server = http.createServer(app);

const { Server } = require("socket.io");
const io = new Server(server, {
  pingInterval: 2000,
  pingTimeout: 5000,
  cors: true,
});

app.use(express.static("public"));

// app.get("/", (req, res) => {
//   res.sendFile(__dirname + "/index.html");
// });

const makeRandomPos = (pos) => {
  pos.x += Math.random() * 4 - 2; // x will be between -2 and 2
  pos.y += Math.random(); // y will be between 0 and 1
  pos.z += Math.random() * 2; // z will be between 0 and 2
  return pos;
};
/** Holding all Plyaers in BE */
const players = {};
/** whenever a new player connects to game, we need to broadcast a state of every player */
/** connection btw BE and FE  */

class Player {
  constructor({ id, pos, rot, entity }) {
    this.id = id;
    this.pos = pos;
    this.rot = rot;
    this.entity = null;
  }
}

io.on("connection", (socket) => {
  console.log(`a user connected: ${socket.conn.transport.name} / ${socket.id}`);
  console.log("현재 접속중인 총 인원 수: ", io.engine.clientsCount);

  // client에서 아이디 생성 요청을 받음
  socket.on("createUser", function (data) {
    console.log("[createUser] socket id: ", socket.id);
    //console.log("[createUser] id: ", data.id);

    // players[socket.id] = {
    //   id: socket.id, //client에서 처리하는 아이디인듯?
    //   pos: makeRandomPos(data.pos), // client에서 보낸 pos 데이터
    //   rot: data.rot, // client에서 보낸 rot 데이터
    //   entity: null, //나중에 채울 것
    //   sequenceNumber: 0, //for tracing: handling Server Reconciliation
    // };

    const { pos, rot } = data;
    players[socket.id] = new Player({ id: socket.id, pos, rot });

    //console.log("현재 접속중인 유저 목록: ", players);
    //첫 접속한 플레이어에게 기존 플레이어 데이터를 보내줌
    socket.emit("playerData", { players });

    // 모든 클라이언트에게 신규 플레이어 접속 알림
    socket.broadcast.emit("playerJoined", {
      id: socket.id,
      player: players[socket.id],
    });
  });

  // 첫 접속시 기존 플레ㅇ이어 데이터를 보내줌
  //io.emit("playerData", { players });

  // io.emit("playerJoined", {players});

  /** [2] Disconnection */
  socket.on("disconnect", (reason) => {
    console.log(`a user disconnected: reason:${reason}`);
    console.log("현재 접속중인 총 인원 수: ", io.engine.clientsCount);
    delete players[socket.id]; // del in BE

    const deletedId = socket.id;

    // 다른 클라이언트에게 알림
    socket.broadcast.emit("playerDisconnected", { id: socket.id });
  });

  // /** [3] Reat-time Movement Rendering */
  socket.on("playerMoved", function (data) {
    // 플레이어 존재 여부 확인
    if (players[data.id]) {
      // 데이터 유효성 확인 (선택 사항)
      if (validatePlayerData(data)) {
        // 플레이어 데이터 업데이트
        players[data.id].pos = data.pos;
        players[data.id].rot = data.rot;

        // 다른 클라이언트에게 플레이어 움직임 알림
        socket.broadcast.emit("playerMoved", data);
      }
    }
  });

  //충돌 감지
  socket.on("playerMovedCollision", function (data) {
    console.log("[playerMovedCollision] data", data);
    // 플레이어 존재 여부 확인
    if (players[data.id]) {
      // 데이터 유효성 확인 (선택 사항)
      if (validatePlayerData(data)) {
        // 플레이어 데이터 업데이트
        players[data.id].pos = data.pos;
        players[data.id].rot = data.rot;

        // 다른 클라이언트에게 플레이어 움직임 알림
        socket.broadcast.emit("updatePlayerPositionCollision", data);
      }
    }
  });
});

/* for every 66.666 sec... */
setInterval(() => {
  io.emit("updatePlayers", players);
}, 15); // 1000/15 = 66.6666...

/**for soket.io, change app.listener to server.listener */
server.listen(port, () => {
  console.log(`[INFO] Mini Server listening at http://localhost:${port}`);
});

// 플레이어 데이터 유효성 검사 함수 (예시)
function validatePlayerData(data) {
  // 여기에 데이터 검증 로직 구현
  return true; // 데이터가 유효하다고 가정
}
