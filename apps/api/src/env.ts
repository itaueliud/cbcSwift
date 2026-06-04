import "dotenv/config";

export const env = {
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: process.env.JWT_SECRET ?? "CBCNexus-JWT-Secret-Key-2025!",
  webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
  databaseUrl: process.env.DATABASE_URL ?? "",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  sendgridApiKey: process.env.SENDGRID_API_KEY ?? "",
  sendgridFromEmail: process.env.SENDGRID_FROM_EMAIL ?? "noreply@cbcswift.local",
  sendgridFromName: process.env.SENDGRID_FROM_NAME ?? "CBC Swift",
  mpesaConsumerKey: process.env.MPESA_CONSUMER_KEY ?? "",
  mpesaConsumerSecret: process.env.MPESA_CONSUMER_SECRET ?? "",
  mpesaShortcode: process.env.MPESA_SHORTCODE ?? "",
  mpesaPasskey: process.env.MPESA_PASSKEY ?? "",
  mpesaEnv: (process.env.MPESA_ENV ?? "sandbox") as "sandbox" | "production",
  mpesaCallbackUrl: process.env.MPESA_CALLBACK_URL ?? "http://localhost/api/finance/mpesa/webhook",
  nodeEnv: process.env.NODE_ENV ?? "development",
};
