const express = require('express');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const usersRouter = require('./router/routes/users_routes');
const charactersRouter = require('./router/routes/characters_routes');
const memoryBallsRouter = require('./router/routes/memory_balls_routes');
// const session = require('express-session');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = 3000;

app.get('/test', (req, res) => {
    try {
        res.status(200).json({ message: "後端伺服器成功啟動了！" });
    }
    catch (error) {
        res.status(500).json({ message: "後端伺服器啟動失敗了！" });
    }
});

// router-level middleware
app.use('/character', charactersRouter);
app.use('/user', usersRouter);
app.use('/memory_ball', memoryBallsRouter);

app.listen(PORT, () => console.log(`Server is running in port ${PORT}`));