// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});

// In-memory store for our board state
// In a production app, you'd use a database
let boardState = [
    // BACKLOG
    { title: "Look into render bug in dashboard", id: "1", column: "backlog" },
    { title: "SOX compliance checklist", id: "2", column: "backlog" },
    { title: "[SPIKE] Migrate to Azure", id: "3", column: "backlog" },
    { title: "Document Notifications service", id: "4", column: "backlog" },
    // TODO
    {
        title: "Research DB options for new microservice",
        id: "5",
        column: "todo",
    },
    { title: "Postmortem for outage", id: "6", column: "todo" },
    { title: "Sync with product on Q3 roadmap", id: "7", column: "todo" },

    // DOING
    {
        title: "Refactor context providers to use Zustand",
        id: "8",
        column: "doing",
    },
    { title: "Add logging to daily CRON", id: "9", column: "doing" },
    // DONE
    {
        title: "Set up DD dashboards for Lambda listener",
        id: "10",
        column: "done",
    },
];

const user = [];

// WebSocket event handlers
io.on("connection", (socket) => {
    // Send initial board state when requested
    socket.on("login", (userCredential) => {
        let index = user.findIndex(
            (details) => details.email == userCredential.email
        );
        if (index == -1) {
            user.push({ ...userCredential, online: true });
        }
        socket.broadcast.emit("userlist", user);
    });

    socket.off("offline", (offlineuser) => {
        let findIndex = user.findIndex(
            (data) => data.user.email == offlineuser.email
        );
        user[findIndex] = {
            ...user[findIndex],
            online: false,
        };
    });

    socket.on("requestInitialState", () => {
        socket.emit("initialState", boardState);
    });

    // socket.on("requestUser", () => {
    //     socket.emit("userlist", user);
    // });

    // Handle board updates from clients
    socket.on("updateBoard", (updatedCards) => {
        // Update our in-memory state
        boardState = updatedCards;

        // Broadcast the update to all other connected clients
        socket.broadcast.emit("boardUpdate", boardState);
    });

    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
    });
});

// Listen for HTTP requests too (optional)
app.get("/", (req, res) => {
    res.send("Kanban WebSocket server is running");
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
