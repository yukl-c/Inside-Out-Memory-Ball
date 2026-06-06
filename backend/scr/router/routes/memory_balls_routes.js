const express = require('express');
const upload = require('../middlewares/upload_middleware');
const verifyToken = require('../middlewares/auth');
const memoryBallsController = require('../controllers/memory_balls_controller');
const memoryBallsRouter = express.Router();

memoryBallsRouter.get('/', verifyToken, memoryBallsController.getMemoryBallList);

memoryBallsRouter.post('/:character_id', verifyToken, upload.single('memory_ball_photo'), memoryBallsController.createMemoryBall);

memoryBallsRouter.get('/:memory_ball_id', verifyToken, memoryBallsController.getMemoryBall);

memoryBallsRouter.delete('/:memory_ball_id', verifyToken, memoryBallsController.deleteMemoryBall);

memoryBallsRouter.patch('/actions/:memory_ball_id', verifyToken, upload.single('memory_ball_photo'), memoryBallsController.updateMemoryBall);

module.exports = memoryBallsRouter;