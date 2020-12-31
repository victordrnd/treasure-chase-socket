const app = require('express')();
var cors = require('cors');
const http = require('http').Server(app);
//const io = require('socket.io')(http, { origins: ['http://localhost:4200', "*:*"], transports: ['polling', 'flashsocket'] });
var corsOptions = {
    origin: ["http://localhost:4200", "https://tresor.victordurand.fr"],
    optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
  }

const io = require("socket.io")(http, {
    cors: {
      origin: ["http://localhost:4200", "https://tresor.victordurand.fr"],
      methods: ["GET", "POST"],
      credentials: true
    },
    transports : ['polling']
  });
  
  
let connectedUsers = [];

io.on("connection", socket => {
    socket.on('user.login', username => {
        if (userExists(username)) {
            console.warn(`User ${username} already connected`);
        } else {
            const user = {
                username: username,
                score: 0
            }
            connectedUsers.push(user);
            console.log(`${username} is connected successfully`);
            socket.to("admin").emit("admin.new.logs", `${username} vient de se connecter`);
        }
        socket.emit('users.list.updated', connectedUsers);
        socket.broadcast.emit('users.list.updated', connectedUsers);
        socket.once('disconnect', reason => {
            console.log(`${username} has disconnected`);
            const index = getUserIndex(username);
            if (index !== -1)
                connectedUsers.splice(index, 1);
            socket.broadcast.emit('users.list.updated', connectedUsers);
        });
    });


    socket.on('game.piano.success', username => {
        console.log(`${username} a réussi l'épreuve du Piano !`);
        socket.to("admin").emit("admin.new.logs", `${username} a réussi l'épreuve du Piano !`);
        addPoint(username);
        socket.emit("users.list.updated", connectedUsers);
        socket.broadcast.emit("users.list.updated", connectedUsers);
    })

    socket.on('user.disconnect', user => {
        console.log(`${username} has disconnected`);
        socket.to("admin").emit("admin.new.logs", `${username} has disconnected`);
        const index = getUserIndex(username);
        if (index !== -1)
            connectedUsers.splice(index, 1);
        socket.broadcast.emit('users.connected', connectedUsers);
    });



    socket.on('game.start', () => {
        socket.broadcast.emit('game.started', true);
    });


    socket.on("admin.new.connection", () => {
        socket.join("admin");
        socket.to("admin").emit("admin.new.logs", "Un nouvel administrateur s'est connecté !");
    });


    socket.on("admin.waiting.message", (message) => {
        socket.broadcast.emit("waiting.message", message);
    })
});
app.get("/connected_users",cors(corsOptions), (req, res) => {
    res.send(getActiveUsers());
})



function getActiveUsers() {
    return connectedUsers;
}

function userExists(username) {
    for (i = 0; i < connectedUsers.length; i++) {
        if (connectedUsers[i].username == username) {
            return true;
        }
    }
    return false;
}

function getUserIndex(username) {
    for (i = 0; i < connectedUsers.length; i++) {
        if (connectedUsers[i].username == username) {
            return i;
        }
    }
    return -1;
}

function addPoint(username){
    const user_index = getUserIndex(username);
    if(connectedUsers[user_index]){
        connectedUsers[user_index].score += 100
    }
    connectedUsers.sort((a ,b ) => {
        return a.score - b .score;
    });
}

http.listen(process.env.PORT || 3000);