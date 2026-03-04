import { Router } from 'express';
import { CharacterController } from './character.controller.js';
import { ConversationController } from './conversation.controller.js';
import { ragQueryController } from './rag.controller.js';

const router = Router();
const characterCtrl = new CharacterController();
const conversationCtrl = new ConversationController();

router.get('/characters', (req, res) => characterCtrl.getAll(req, res));
router.post('/characters', (req, res) => characterCtrl.create(req, res));
router.get('/characters/:id', (req, res) => characterCtrl.getById(req, res));
router.put('/characters/:id/voice', (req, res) => characterCtrl.updateVoiceId(req, res));
router.get('/conversations', (req, res) => conversationCtrl.list(req, res));
router.post('/conversations', (req, res) => conversationCtrl.create(req, res));
router.delete('/conversations/:id', (req, res) => conversationCtrl.destroy(req, res));
router.get('/conversations/:id', (req, res) => conversationCtrl.retrieve(req, res));
router.post('/query', ragQueryController);

export default router;