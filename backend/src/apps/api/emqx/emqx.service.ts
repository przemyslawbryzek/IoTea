import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class EmqxService {
  private readonly logger = new Logger(EmqxService.name);
  private readonly emqxApiUrl: string;
  private readonly auth: string;

  constructor(private httpService: HttpService) {
    this.emqxApiUrl = process.env.MQTT_API_URL || 'http://emqx:18083/api/v5';
    const apiKey = process.env.MQTT_API_KEY;
    const apiSecret = process.env.MQTT_API_SECRET;
    this.auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
  }

  async createUser(username: string, password: string): Promise<void> {
    try {
      this.logger.log(`Creating EMQX user: ${username}`);

      await firstValueFrom(
        this.httpService
          .post(
            `${this.emqxApiUrl}/authentication/password_based:built_in_database/users`,
            {
              user_id: username,
              password: password,
            },
            {
              headers: {
                Authorization: `Basic ${this.auth}`,
                'Content-Type': 'application/json',
              },
            },
          )
          .pipe(
            catchError((error) => {
              if (error.response?.status === 409) {
                this.logger.warn(`User ${username} already exists in EMQX`);
                return [];
              }
              throw error;
            }),
          ),
      );

      this.logger.log(`EMQX user created: ${username}`);
    } catch (error) {
      this.logger.error(`Failed to create EMQX user: ${error.message}`);
      throw new HttpException(
        `Failed to create MQTT credentials: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async deleteUser(username: string): Promise<void> {
    try {
      this.logger.log(`Deleting EMQX user: ${username}`);

      await firstValueFrom(
        this.httpService
          .delete(
            `${this.emqxApiUrl}/authentication/password_based:built_in_database/users/${username}`,
            {
              headers: {
                Authorization: `Basic ${this.auth}`,
              },
            },
          )
          .pipe(
            catchError((error) => {
              if (error.response?.status === 404) {
                this.logger.warn(`User ${username} not found in EMQX`);
                return [];
              }
              throw error;
            }),
          ),
      );

      this.logger.log(`EMQX user deleted: ${username}`);
    } catch (error) {
      this.logger.error(`Failed to delete EMQX user: ${error.message}`);
    }
  }

  async userExists(username: string): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.emqxApiUrl}/authentication/password_based:built_in_database/users/${username}`,
          {
            headers: {
              Authorization: `Basic ${this.auth}`,
            },
          },
        ),
      );
      return response.status === 200;
    } catch (error) {
      if (error.response?.status === 404) {
        return false;
      }
      return false;
    }
  }
}
