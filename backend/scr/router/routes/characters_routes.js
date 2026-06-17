const express = require('express');
const upload = require('../middlewares/upload_middleware');
const verifyToken = require('../middlewares/auth');
const charactersController = require('../controllers/characters_controller');
const charactersRouter = express.Router();

charactersRouter.post('/create-look', verifyToken, charactersController.createCharacterLook);

charactersRouter.get('/', verifyToken, charactersController.getCharacterList);

charactersRouter.post('/', verifyToken, upload.single('character_photo'), charactersController.createCharacter);

charactersRouter.get('/:character_id', verifyToken, charactersController.getCharacter);

charactersRouter.delete('/:character_id', verifyToken, charactersController.deleteCharacter);

charactersRouter.patch('/actions/:character_id', verifyToken, upload.single('character_photo'), charactersController.updateCharacter);

module.exports = charactersRouter;

//testing mock ai gen link: https://upload.wikimedia.org/wikipedia/commons/4/47/PNG_transparency_demonstration_1.png