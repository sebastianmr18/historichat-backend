/**
 * @file admin.controller.ts
 * @description Controlador HTTP para operaciones administrativas de gestion de usuarios.
 */
import { Request, Response } from "express";
import { AppDataSource } from "../../config/database.js";
import { Profile } from "../../infrastructure/database/entities/Profile.js";
import { extractUserId } from "../../api/auth.utils.js";
import { formatProfileResponse } from "./presenters/profile.presenter.js";
import { logger } from "../../infrastructure/logging/logger.js";
import { updateUserRoleSchema } from "./schemas/admin.schema.js";

export class AdminController {
  async listUsers(req: Request, res: Response): Promise<void> {
    try {
      const profileRepo = AppDataSource.getRepository(Profile);
      const users = await profileRepo.find({ order: { createdAt: "DESC" } });
      res.status(200).json({ users: users.map(formatProfileResponse) });
    } catch (error) {
      logger.error({ event: "admin_listUsers_error", error });
      res.status(500).json({ error: "Internal Server Error" });
    }
  }

  async updateUserRole(req: Request, res: Response): Promise<void> {
    const requestingUserId = extractUserId(req);
    const { id } = req.params;

    const parsed = updateUserRoleSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message });
      return;
    }

    try {
      const profileRepo = AppDataSource.getRepository(Profile);
      const profile = await profileRepo.findOne({ where: { id: id as any } });

      if (!profile) {
        res.status(404).json({ error: "Usuario no encontrado" });
        return;
      }

      profile.role = parsed.data.role;
      await profileRepo.save(profile);

      logger.info({ event: "admin_updateUserRole", targetUserId: id, role: parsed.data.role, requestingUserId });
      res.status(200).json(formatProfileResponse(profile));
    } catch (error) {
      logger.error({ event: "admin_updateUserRole_error", targetUserId: id, error });
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
}
