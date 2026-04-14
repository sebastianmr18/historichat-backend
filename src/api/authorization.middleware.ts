import { RequestHandler } from "express";
import { AppDataSource } from "../config/database.js";
import { Profile } from "../infrastructure/database/entities/Profile.js";
import { isUserRole } from "../domain/auth/user-role.js";
import { extractUserId } from "./auth.middleware.js";

export const requireAdminRole: RequestHandler = async (req, res, next) => {
  const userId = extractUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const profileRepo = AppDataSource.getRepository(Profile);
    const profile = await profileRepo.findOne({
      where: { id: userId as any },
      select: { role: true },
    });

    const role = isUserRole(profile?.role) ? profile.role : "user";
    req.userRole = role;

    if (role !== "admin") {
      res.status(403).json({ error: "Forbidden: admin role required." });
      return;
    }

    next();
  } catch {
    res.status(500).json({ error: "Internal Server Error" });
  }
};