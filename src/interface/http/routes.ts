import { Router } from 'express';
import { CharacterController } from './character.controller.js';
import { ConversationController } from './conversation.controller.js';
import { ragQueryController } from './rag.controller.js';

const router = Router();
const characterCtrl = new CharacterController();
const conversationCtrl = new ConversationController();

router.get('/characters', characterCtrl.getAll);
router.get('/characters/:id', characterCtrl.getById);
router.put('/characters/:id/voice', characterCtrl.updateVoiceId);
router.get('/conversations', conversationCtrl.list);
router.post('/conversations', conversationCtrl.create);
router.delete('/conversations/:id', conversationCtrl.destroy);
router.get('/conversations/:id', characterCtrl.retrieve);
router.post('/query', ragQueryController);

export default router;