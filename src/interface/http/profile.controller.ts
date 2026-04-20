import { Request, Response } from "express";
import { AppDataSource } from "../../config/database.js";
import { Profile } from "../../infrastructure/database/entities/Profile.js";
import { extractUserId } from "../../api/auth.utils.js";
import { formatProfileResponse } from "./presenters/profile.presenter.js";
import { logger } from "../../infrastructure/logging/logger.js";

export class ProfileController {
  async getMe(req: Request, res: Response): Promise<void> {
    const userId = extractUserId(req);
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    try {
      const profileRepo = AppDataSource.getRepository(Profile);
      const profile = await profileRepo.findOne({
        where: { id: userId as any },
      });

      if (!profile) {
        res.status(404).json({ error: "Profile not found" });
        return;
      }

      const formatted = formatProfileResponse(profile);
      res.status(200).json(formatted);
    } catch (error) {
      logger.error({ userId, event: "profile_getMe_error", error });
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
}
