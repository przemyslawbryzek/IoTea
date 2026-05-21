import { Logger } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import admin from 'firebase-admin';

type MobileTokenInput = {
  token: string;
  platform: string;
};

type BrewNotificationPayload = {
  brewId: number;
  teaName?: string | null;
};

export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private fcmReady = false;

  constructor(private readonly prisma: PrismaClient) {}

  async upsertMobileToken(userId: number, input: MobileTokenInput) {
    await this.prisma.push_token.upsert({
      where: { token: input.token },
      update: { user_id: userId, platform: input.platform },
      create: { user_id: userId, token: input.token, platform: input.platform },
    });
  }

  async removeMobileToken(userId: number, token: string) {
    await this.prisma.push_token.deleteMany({
      where: { user_id: userId, token },
    });
  }

  async notifyBrewCompleted(userId: number, payload: BrewNotificationPayload) {
    const title = 'Tea is ready';
    const body = payload.teaName ? `${payload.teaName} is ready.` : 'Your tea is ready.';
    await this.sendMobilePush(userId, { title, body, brewId: payload.brewId });
  }

  private initFcm(): boolean {
    if (this.fcmReady) return true;
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      this.logger.warn('FCM disabled. Missing Firebase credentials.');
      return false;
    }

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    }

    this.fcmReady = true;
    return true;
  }

  private async sendMobilePush(userId: number, payload: { title: string; body: string; brewId: number }) {
    if (!this.initFcm()) return;

    const tokens = await this.prisma.push_token.findMany({
      where: { user_id: userId },
      select: { token: true },
    });

    if (tokens.length === 0) return;

    const response = await admin.messaging().sendEachForMulticast({
      tokens: tokens.map((item) => item.token),
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: {
        brewId: String(payload.brewId),
      },
    });

    await Promise.all(
      response.responses.map(async (result, index) => {
        if (result.success) return;
        const error = result.error as { code?: string } | undefined;
        const code = error?.code ?? '';
        if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token') {
          await this.prisma.push_token.delete({
            where: { token: tokens[index].token },
          });
        }
      }),
    );
  }
}
