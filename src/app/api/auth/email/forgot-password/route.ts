import { emailPostHandler } from '@/modules/customer-auth/email-handler';
export const runtime = 'nodejs';
export const POST = emailPostHandler('forgot-password');
