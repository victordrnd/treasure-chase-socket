const app = require('express')();
const http = require('http').Server(app);
//const io = require('socket.io')(http, { origins: ['http://localhost:4200', "*:*"], transports: ['polling', 'flashsocket'] });
const io = require("socket.io")(http, {
    cors: {
      origin: "http://localhost:4200",
      methods: ["GET", "POST"],
      credentials: true
    },
    transports : ['polling']
  });
  
  
let connectedUsers = [];

io.on("connection", socket => {
    console.log("new connection");
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
        const user_index = getUserIndex(username);
        connectedUsers[user_index].score += 100;
        socket.emit("users.list.updated", connectedUsers);
        socket.broadcast.emit("users.list.updated", connectedUsers);
    })

    socket.on('user.disconnect', user => {
        console.log(`${username} has disconnected`);
        const index = getUserIndex(username);
        if (index !== -1)
            connectedUsers.splice(index, 1);
        socket.broadcast.emit('users.connected', connectedUsers);
    });
});


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

http.listen(process.env.PORT || 3000);