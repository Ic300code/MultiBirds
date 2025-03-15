const express = require('express');
const socketIo = require('socket.io');
const path = require('path');
const http = require('http');

const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server, {
    cors: {
        origin: ["https://multibirds.onrender.com", "https://serve.gamejolt.net"], 
        methods: ["GET", "POST"]
    }
});

//app.use(express.static(path.join(__dirname, "public")));

/*app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});*/

let pipes = [];
let players = {};

for (let i = 1; i < 40; i++) {
    pipes.push(Math.random() * (0.6 - 0.3) + 0.3);
}

io.on('connection', (socket) => {
    console.log('Player Connected !');

    io.emit("playerAdded", socket.id);
    socket.emit("pipes", pipes);

    players[socket.id] = {
        x: 0,
        y: 200,
        angle: 0
    };

    const id = socket.id;

    socket.on("requestPlayers", () => {
        for (let id in players) {
            if (id === socket.id) {continue}
            io.emit("playerAdded", id);
        }
    })

    socket.on("updatePlayer", (data) => {
        io.emit("updatePlayer", {data, id});
    });

    socket.on("dead", () => {
        socket.emit("pipes", pipes);

        console.log("Player died.");
    });

    socket.on('disconnect', () => {
        console.log('Player logged out.');
        delete players[socket.id];
    });
});

server.listen(3000, () => {
    console.log("Port connected to 3000.");
});
