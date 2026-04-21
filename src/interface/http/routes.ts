import { Router } from 'express';
import { CharacterController } from './character.controller.js';
import { ConversationController } from './conversation.controller.js';
import { ProfileController } from './profile.controller.js';
import { ragQueryController } from './rag.controller.js';
import { parseKnowledgeBaseUpload, uploadCharacterKnowledgeBase } from './knowledge-base.controller.js';
import { requireAdminRole } from '../../api/authorization.middleware.js';
import { storageService } from '../storage/storage.service.js';

const router = Router();
const characterCtrl = new CharacterController(storageService);
const conversationCtrl = new ConversationController(storageService);
const profileCtrl = new ProfileController();

router.get('/me', (req, res) => profileCtrl.getMe(req, res));
router.get('/characters', (req, res) => characterCtrl.getAll(req, res));
router.post('/characters', (req, res) => characterCtrl.create(req, res));
router.delete('/characters/:id', requireAdminRole, (req, res) => characterCtrl.destroy(req, res));
router.get('/characters/:id', (req, res) => characterCtrl.getById(req, res));
router.get('/characters/:id/editorial/hero', (req, res) => characterCtrl.getEditorialHeroById(req, res));
router.get('/characters/:id/editorial/overview', (req, res) => characterCtrl.getEditorialOverviewById(req, res));
router.get('/characters/:id/editorial/timeline', (req, res) => characterCtrl.getEditorialTimelineById(req, res));
router.get('/characters/:id/editorial/relations', (req, res) => characterCtrl.getEditorialRelationsById(req, res));
router.get('/characters/:id/editorial/gallery', (req, res) => characterCtrl.getEditorialGalleryById(req, res));
router.get('/characters/:id/editorial', (req, res) => characterCtrl.getEditorialById(req, res));
router.put('/characters/:id/voice', (req, res) => characterCtrl.updateVoiceId(req, res));
router.post('/characters/:id/knowledge-base/upload', requireAdminRole, parseKnowledgeBaseUpload, uploadCharacterKnowledgeBase);
router.get('/conversations', (req, res) => conversationCtrl.list(req, res));
router.post('/conversations', (req, res) => conversationCtrl.create(req, res));
router.post('/conversations/debate', (req, res) => conversationCtrl.createDebate(req, res));
router.delete('/conversations/:id', (req, res) => conversationCtrl.destroy(req, res));
router.get('/conversations/:id', (req, res) => conversationCtrl.retrieve(req, res));
router.post('/query', ragQueryController);

export default router;