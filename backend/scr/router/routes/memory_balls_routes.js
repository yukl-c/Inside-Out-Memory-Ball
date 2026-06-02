const express = require('express');
const memoryBallsController = require('../controllers/memory_balls_controller');
const memoryBallsRouter = express.Router();

memoryBallsRouter.get('/list', memoryBallsController.getMemoryBallList);

memoryBallsRouter.post('/create', memoryBallsController.createMemoryBall);

memoryBallsRouter.get('/:id', memoryBallsController.getMemoryBall);

memoryBallsRouter.delete('/:id', memoryBallsController.deleteMemoryBall);

memoryBallsRouter.patch('/update/:id', memoryBallsController.updateMemoryBall);

module.exports = memoryBallsRouter;