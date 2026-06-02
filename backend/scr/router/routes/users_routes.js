const express = require('express');
const usersController = require('../controllers/users_controller');
const usersRouter = express.Router();

usersRouter.post('/register', usersController.register);

usersRouter.post('/login', usersController.login);

usersRouter.put('/update_pwd/:id', usersController.updatePassword);

usersRouter.get('/:id', usersController.getUser);

usersRouter.delete('/:id', usersController.deleteUser);

module.exports = usersRouter;