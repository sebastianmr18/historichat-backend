/**
 * @file routes.ts
 * @description Enrutador principal de Express que agrupa y protege todos los endpoints HTTP.
 */
import { Router } from 'express';
import { CharacterController } from './character.controller.js';
import { ConversationController } from './conversation.controller.js';
import { ProfileController } from './profile.controller.js';
import { AdminController } from './admin.controller.js';
import { EditorialController } from './editorial.controller.js';
import { ragQueryController } from './rag.controller.js';
import { parseKnowledgeBaseUpload, uploadCharacterKnowledgeBase } from './knowledge-base.controller.js';
import { requireAdminRole } from '../../api/authorization.middleware.js';
import { storageService } from '../storage/storage.service.js';

const router = Router();
const characterCtrl = new CharacterController(storageService);
const conversationCtrl = new ConversationController(storageService);
const profileCtrl = new ProfileController();
const adminCtrl = new AdminController();
const editorialCtrl = new EditorialController();

// Profile
router.get('/me', (req, res) => profileCtrl.getMe(req, res));
router.patch('/me', (req, res) => profileCtrl.updateMe(req, res));

// Characters
router.get('/characters', (req, res) => characterCtrl.getAll(req, res));
router.post('/characters', (req, res) => characterCtrl.create(req, res));
router.put('/characters/:id', requireAdminRole, (req, res) => characterCtrl.update(req, res));
router.delete('/characters/:id', requireAdminRole, (req, res) => characterCtrl.destroy(req, res));
router.get('/characters/by-slug/:slug', (req, res) => characterCtrl.getBySlug(req, res));
router.get('/characters/:id', (req, res) => characterCtrl.getById(req, res));
router.get('/characters/:id/system-prompt', (req, res) => characterCtrl.getSystemPromptById(req, res));
router.get('/characters/:id/editorial/hero', (req, res) => characterCtrl.getEditorialHeroById(req, res));
router.get('/characters/:id/editorial/overview', (req, res) => characterCtrl.getEditorialOverviewById(req, res));
router.get('/characters/:id/editorial/timeline', (req, res) => characterCtrl.getEditorialTimelineById(req, res));
router.get('/characters/:id/editorial/relations', (req, res) => characterCtrl.getEditorialRelationsById(req, res));
router.get('/characters/:id/editorial/gallery', (req, res) => characterCtrl.getEditorialGalleryById(req, res));
router.get('/characters/:id/editorial', (req, res) => characterCtrl.getEditorialById(req, res));
router.put('/characters/:id/voice', (req, res) => characterCtrl.updateVoiceId(req, res));
router.post('/characters/:id/knowledge-base/upload', requireAdminRole, parseKnowledgeBaseUpload, uploadCharacterKnowledgeBase);

// Editorial sub-resources (admin only)
router.post('/characters/:id/quotes', requireAdminRole, (req, res) => editorialCtrl.createQuote(req, res));
router.put('/characters/:id/quotes/:quoteId', requireAdminRole, (req, res) => editorialCtrl.updateQuote(req, res));
router.delete('/characters/:id/quotes/:quoteId', requireAdminRole, (req, res) => editorialCtrl.deleteQuote(req, res));

router.post('/characters/:id/facts', requireAdminRole, (req, res) => editorialCtrl.createFact(req, res));
router.put('/characters/:id/facts/:factId', requireAdminRole, (req, res) => editorialCtrl.updateFact(req, res));
router.delete('/characters/:id/facts/:factId', requireAdminRole, (req, res) => editorialCtrl.deleteFact(req, res));

router.post('/characters/:id/prompts', requireAdminRole, (req, res) => editorialCtrl.createPrompt(req, res));
router.put('/characters/:id/prompts/:promptId', requireAdminRole, (req, res) => editorialCtrl.updatePrompt(req, res));
router.delete('/characters/:id/prompts/:promptId', requireAdminRole, (req, res) => editorialCtrl.deletePrompt(req, res));

router.post('/characters/:id/context-cards', requireAdminRole, (req, res) => editorialCtrl.createContextCard(req, res));
router.put('/characters/:id/context-cards/:cardId', requireAdminRole, (req, res) => editorialCtrl.updateContextCard(req, res));
router.delete('/characters/:id/context-cards/:cardId', requireAdminRole, (req, res) => editorialCtrl.deleteContextCard(req, res));

router.post('/characters/:id/timeline', requireAdminRole, (req, res) => editorialCtrl.createTimelineEntry(req, res));
router.put('/characters/:id/timeline/:entryId', requireAdminRole, (req, res) => editorialCtrl.updateTimelineEntry(req, res));
router.delete('/characters/:id/timeline/:entryId', requireAdminRole, (req, res) => editorialCtrl.deleteTimelineEntry(req, res));

router.post('/characters/:id/relationships', requireAdminRole, (req, res) => editorialCtrl.createRelationship(req, res));
router.put('/characters/:id/relationships/:relId', requireAdminRole, (req, res) => editorialCtrl.updateRelationship(req, res));
router.delete('/characters/:id/relationships/:relId', requireAdminRole, (req, res) => editorialCtrl.deleteRelationship(req, res));

router.post('/characters/:id/gallery', requireAdminRole, (req, res) => editorialCtrl.createGalleryImage(req, res));
router.put('/characters/:id/gallery/:imageId', requireAdminRole, (req, res) => editorialCtrl.updateGalleryImage(req, res));
router.delete('/characters/:id/gallery/:imageId', requireAdminRole, (req, res) => editorialCtrl.deleteGalleryImage(req, res));

router.post('/characters/:id/editorial-blocks', requireAdminRole, (req, res) => editorialCtrl.createEditorialBlock(req, res));
router.put('/characters/:id/editorial-blocks/:blockId', requireAdminRole, (req, res) => editorialCtrl.updateEditorialBlock(req, res));
router.delete('/characters/:id/editorial-blocks/:blockId', requireAdminRole, (req, res) => editorialCtrl.deleteEditorialBlock(req, res));

// Admin — user management
router.get('/admin/users', requireAdminRole, (req, res) => adminCtrl.listUsers(req, res));
router.patch('/admin/users/:id/role', requireAdminRole, (req, res) => adminCtrl.updateUserRole(req, res));
router.get('/admin/characters', requireAdminRole, (req, res) => characterCtrl.getAllAdmin(req, res));

// Conversations
router.get('/conversations', (req, res) => conversationCtrl.list(req, res));
router.post('/conversations', (req, res) => conversationCtrl.create(req, res));
router.post('/conversations/debate', (req, res) => conversationCtrl.createDebate(req, res));
router.delete('/conversations/:id', (req, res) => conversationCtrl.destroy(req, res));
router.get('/conversations/:id', (req, res) => conversationCtrl.retrieve(req, res));

router.post('/query', ragQueryController);

export default router;
