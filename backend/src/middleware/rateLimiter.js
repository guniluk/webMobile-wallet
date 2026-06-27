import { env } from '../config/env.js';

const rateLimitMap = new Map();

// 5분마다 만료된 IP 기록을 정리하여 메모리 누수를 방지합니다.
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}, 5 * 60 * 1000);

export const rateLimiter = (req, res, next) => {
  // 프록시 서버(예: Cloudflare, Nginx 등) 뒤에 있을 경우 실제 클라이언트 IP를 가져옵니다.
  const ip = req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress;
  const now = Date.now();
  
  const WINDOW_MS = env.rateLimit.windowMs;
  const MAX_LIMIT = env.rateLimit.max;

  let record = rateLimitMap.get(ip);

  if (!record) {
    rateLimitMap.set(ip, {
      count: 1,
      resetTime: now + WINDOW_MS,
    });
    return next();
  }

  // 기한이 만료된 경우 카운터를 리셋합니다.
  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + WINDOW_MS;
    return next();
  }

  // 제한 횟수를 초과한 경우
  if (record.count >= MAX_LIMIT) {
    return res.status(429).send('429 Too Many Requsets');
  }

  record.count += 1;
  next();
};
