import { z } from "zod";

export const ADMIN_PASSWORD_MIN_LENGTH = 8;
export const ADMIN_PASSWORD_MAX_LENGTH = 15;
// Existing credentials remain usable for login, TOTP enrollment and recovery codes.
export const ADMIN_EXISTING_PASSWORD_MAX_LENGTH = 128;
export const adminNewPasswordSchema = z.string().min(ADMIN_PASSWORD_MIN_LENGTH).max(ADMIN_PASSWORD_MAX_LENGTH);
