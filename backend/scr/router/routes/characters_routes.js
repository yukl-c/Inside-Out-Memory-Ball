const express = require('express');
const charactersController = require('../controllers/characters_controller');
const charactersRouter = express.Router();

charactersRouter.get('/list', charactersController.getCharacterList);

charactersRouter.post('/create', charactersController.createCharacter);

charactersRouter.get('/:id', charactersController.getCharacter);

charactersRouter.delete('/:id', charactersController.deleteCharacter);

charactersRouter.patch('/update/:id', charactersController.updateCharacter);

module.exports = charactersRouter;