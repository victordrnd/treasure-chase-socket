//https://socket-server.victordurand.fr:4433/
const app = require('express')();
var cors = require('cors');
const axios = require('axios');
const http = require('http').Server(app);
const dotenv = require('dotenv');
dotenv.config();

var corsOptions = {
    origin: [process.env.CORS_ALLOWED],
    optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}
app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ALLOWED);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,Authorization');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
});
const io = require("socket.io")(http, {
    cors: {
        origin: [process.env.CORS_ALLOWED],
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['websocket']
});


let connectedUsers = [];

let winners = [];

isOpen = false;

io.on("connection", socket => {
    socket.on('user.login', user => {
        if (userExists(user)) {
            console.warn(`User ${user.lastname} ${user.firstname} already connected`);
        } else {
            connectedUsers.push(user);
            console.log(`${user.lastname} ${user.firstname} is connected successfully`);
            socket.to("admin").emit("admin.new.logs", `${user.lastname} ${user.firstname} vient de se connecter`);
        }
        socket.emit('users.list.updated', connectedUsers);
        socket.broadcast.emit('users.list.updated', connectedUsers);
        socket.once('disconnect', reason => {
            console.log(`${user.lastname} ${user.firstname} has disconnected`);
            const index = getUserIndex(user);
            if (index !== -1)
                connectedUsers.splice(index, 1);
            socket.broadcast.emit('users.list.updated', connectedUsers);
        });
    });


    socket.on('game.step.success', obj => {
        console.log(`${obj.lastname} ${obj.firstname} a réussi l'épreuve du ${obj.step} !`);
        socket.to("admin").emit("admin.new.logs", `${obj.lastname} ${obj.firstname} a réussi l'épreuve du ${obj.step} !`);
        //addPoint(obj);
        socket.emit("users.list.updated", connectedUsers);
        socket.broadcast.emit("users.list.updated", connectedUsers);

        // const user_index = getUserIndex(obj);
        // if(connectedUsers[user_index]){
        //    if (connectedUsers[user_index].score == 400) {
        //         winners.push(connectedUsers[user_index]);
        //         console.log(`${obj.lastname} ${obj.firstname} a terminé la chasse au trésor`);
        //         socket.to("admin").emit("admin.new.logs", `${obj.lastname} ${obj.firstname} a terminé la chasse au trésor à la position : ${winners.length}`);
        //         socket.to("admin").emit("admin.new.winner", obj)
        //     }
        // }
    })

    // socket.on('game.reset', obj => {
    //     console.log(`${obj.lastname} ${obj.firstname} a choisis la mauvaise liste, il repart à zéro !`);
    //     socket.to("admin").emit("admin.new.logs", `${obj.lastname} ${obj.firstname} a choisis la mauvaise liste, il repart à zéro !`);
    //     resetPoint(obj);
    //     socket.emit("users.list.updated", connectedUsers);
    //     socket.broadcast.emit("users.list.updated", connectedUsers);
    // })


    socket.on('user.disconnect', user => {
        console.log(`${obj.lastname} ${obj.firstname} has disconnected`);
        socket.to("admin").emit("admin.new.logs", `${obj.lastname} ${obj.firstname} has disconnected`);
        const index = getUserIndex(user);
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
    });

    socket.on("admin.users.updated", () => {
        socket.to("admin").emit("admin.new.logs", "La liste des scores a été mise à jour par un admin !");
        socket.emit("users.list.updated", connectedUsers);
        socket.broadcast.emit("users.list.updated", connectedUsers);
    })
});





app.get("/connected_users", cors(corsOptions), (req, res) => {
    res.send(getActiveUsers());
})

app.get("/user_exists", cors(corsOptions), (req, res) => {
    const email = req.query.email;
    res.send(userExists(email));
});

app.get("/winners", cors(corsOptions), (req, res) => {
    res.send(winners);
});

app.get('/status', cors(corsOptions), (req, res) => {
    res.send({status : isOpen});
});

app.post('/status/change', cors(corsOptions), (req, res) => {
    const status = req.query.status;
    console.log(status);
    isOpen = status; 
    res.send({status : isOpen});
});

function getActiveUsers() {
    return connectedUsers;
}

function userExists(user) {
    for (i = 0; i < connectedUsers.length; i++) {
        if (connectedUsers[i].email == user.email) {
            return true;
        }
    }
    return false;
}

function getUserIndex(user) {
    for (i = 0; i < connectedUsers.length; i++) {
        if (connectedUsers[i].email == user.email) {
            return i;
        }
    }
    return -1;
}

function addPoint(user) {
    const user_index = getUserIndex(user);
    if (connectedUsers[user_index]) {
        connectedUsers[user_index].score += 100
        axios.post(`${process.env.API_URL}/admin/score/add`, {id : user.id, score : 100})
    }
}

function resetPoint(user) {
    const user_index = getUserIndex(user);
    if (connectedUsers[user_index]) {
        connectedUsers[user_index].score = 0
    }
}


http.listen(process.env.PORT || 3000);
