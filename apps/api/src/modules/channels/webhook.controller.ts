import { ChannelType } from '@rems/shared/types';
import { WEBHOOK_ENDPOINTS } from '@rems/shared/constants';
import { SyncEngine } from '../../worker/src/sync-engine/sync-engine';

// ============================================================
// WEBHOOK CONTROLLER — Receives inbound OTA push notifications
//
// Framework-agnostic design. Adapt request/response types
// to your HTTP framework (Fastify, Express, NestJS, etc.)
// ============================================================

interface HttpRequest {
  body: unknown;
  headers: Record<string, string>;
  rawBody: string;
}

interface HttpResponse {
  status(code: number): HttpResponse;
  json(data: unknown): void;
}

export class WebhookController {
  constructor(private readonly syncEngine: SyncEngine) {}

  /**
   * POST /webhooks/booking-com
   * Booking.com uses HMAC-SHA256 in X-Booking-Signature header
   */
  async handleBookingCom(req: HttpRequest, res: HttpResponse): Promise<void> {
    await this.process(ChannelType.BOOKING_COM, req, res, 'x-booking-signature');
  }

  /**
   * POST /webhooks/airbnb
   * Airbnb uses Base64-encoded HMAC-SHA256 in X-Airbnb-Signature header
   */
  async handleAirbnb(req: HttpRequest, res: HttpResponse): Promise<void> {
    await this.process(ChannelType.AIRBNB, req, res, 'x-airbnb-signature');
  }

  /**
   * POST /webhooks/gathern
   * Gathern uses hex HMAC-SHA256 in X-Signature header
   */
  async handleGathern(req: HttpRequest, res: HttpResponse): Promise<void> {
    await this.process(ChannelType.GATHERN, req, res, 'x-signature');
  }

  private async process(
    channel: ChannelType,
    req: HttpRequest,
    res: HttpResponse,
    signatureHeader: string,
  ): Promise<void> {
    const signature = req.headers[signatureHeader] ?? '';

    try {
      // Must respond within 5 seconds or OTA will retry
      // Process asynchronously — respond immediately with 200
      setImmediate(async () => {
        try {
          await this.syncEngine.handleWebhook(channel, req.body, {
            ...req.headers,
            // Normalize signature header for the adapter
            'x-hub-signature-256': signature,
          });
        } catch (err: any) {
          console.error(`[Webhook] Processing error for ${channel}:`, err.message);
        }
      });

      // Always acknowledge receipt immediately (prevents OTA retries)
      res.status(200).json({ received: true });
    } catch (err: any) {
      if (err.message.includes('INVALID_SIGNATURE')) {
        res.status(401).json({ error: 'Invalid signature' });
      } else {
        // Still return 200 to prevent OTA retry flood
        res.status(200).json({ received: true, warning: 'Processing queued' });
      }
    }
  }
}

// ============================================================
// ROUTE DEFINITIONS (Express-style)
// ============================================================

export function registerWebhookRoutes(
  app: {
    post: (path: string, handler: (req: HttpRequest, res: HttpResponse) => Promise<void>) => void;
  },
  controller: WebhookController,
): void {
  app.post(WEBHOOK_ENDPOINTS.BOOKING_COM, controller.handleBookingCom.bind(controller));
  app.post(WEBHOOK_ENDPOINTS.AIRBNB, controller.handleAirbnb.bind(controller));
  app.post(WEBHOOK_ENDPOINTS.GATHERN, controller.handleGathern.bind(controller));
}
