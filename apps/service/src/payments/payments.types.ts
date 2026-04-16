export interface RazorpayWebhookPayload {
  event: string;
  created_at: number;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        amount?: number;
        currency?: string;
        error_code?: string;
        error_description?: string;
      };
    };
  };
}
