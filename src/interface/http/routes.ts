import { Router } from 'express';
import { CharacterController } from './character.controller.js';
import { ConversationController } from './conversation.controller.js';

const router = Router();
const characterCtrl = new CharacterController();
const conversationCtrl = new ConversationController();

router.get('/characters', characterCtrl.getAll);
router.get('/conversations', conversationCtrl.list);
router.post('/conversations', conversationCtrl.create);
router.delete('/conversations/:id', conversationCtrl.destroy);
router.get('/conversations/:id', characterCtrl.retrieve);

export default router;