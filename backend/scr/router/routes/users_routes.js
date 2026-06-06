const express = require('express');
const verifyToken = require('../middlewares/auth');
const usersController = require('../controllers/users_controller');
const usersRouter = express.Router();

usersRouter.post('/register', usersController.register);

usersRouter.post('/login', usersController.login);

// usersRouter.put('/update_pwd/:id', verifyToken, usersController.updatePassword);
usersRouter.put('/update_pwd', verifyToken, usersController.updatePassword);

// usersRouter.get('/:id', verifyToken, usersController.getUser);
usersRouter.get('/', verifyToken, usersController.getUser);

// usersRouter.delete('/:id', verifyToken, usersController.deleteUser);
usersRouter.delete('/', verifyToken, usersController.deleteUser);

module.exports = usersRouter;