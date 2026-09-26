import { Request } from 'express';
import type { SecurityRiskLevel } from '../models/SecurityAuditLog.js';

// Checks if IP belongs to private subnet or loopback
export function isPrivateOrLoopbackIp(ip: string): boolean {
  if (!ip) return true;
  const cleanIp = ip.replace(/^::ffff:/, '').trim();

  return (
    cleanIp === '127.0.0.1' ||
    cleanIp === '::1' ||
    cleanIp === 'localhost' ||
    cleanIp.startsWith('10.') ||
    cleanIp.startsWith('192.168.') ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(cleanIp) ||
    cleanIp === 'unknown'
  );
}

// Safely extracts client IP considering reverse proxies (Cloudflare, Render, Nginx)
export function extractClientIp(req: Request): string {
  // 1. Cloudflare connecting IP
  const cfIp = req.headers['cf-connecting-ip'];
  if (typeof cfIp === 'string' && cfIp.trim()) {
    return cfIp.trim().replace(/^::ffff:/, '');
  }

  // 2. Nginx / Real-IP header
  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string' && realIp.trim()) {
    return realIp.trim().replace(/^::ffff:/, '');
  }

  // 3. X-Forwarded-For header chain
  const xForwarded = req.headers['x-forwarded-for'];
  if (xForwarded) {
    const rawList = Array.isArray(xForwarded) ? xForwarded.join(',') : xForwarded;
    const hops = rawList.split(',').map((h) => h.trim().replace(/^::ffff:/, ''));

    // Find the first public IP in the chain (preventing private proxy spoofing)
    for (const hop of hops) {
      if (hop && !isPrivateOrLoopbackIp(hop)) {
        return hop;
      }
    }

    if (hops.length > 0 && hops[0]) {
      return hops[0];
    }
  }

  // 4. Express req.ip or socket fallback
  const rawIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
  return rawIp.replace(/^::ffff:/, '');
}

export interface ProxyDetectionResult {
  isProxy: boolean;
  isDatacenter: boolean;
  isVpnOrTor: boolean;
  detectedHeaders: string[];
  detectedSignatures: string[];
}

// Inspects incoming headers and User-Agent for proxy, VPN, or bot signatures
export function detectProxyHeaders(req: Request): ProxyDetectionResult {
  const detectedHeaders: string[] = [];
  const detectedSignatures: string[] = [];

  const headers = req.headers;
  const userAgent = (headers['user-agent'] || '').toLowerCase();

  // Known proxy & anonymizer headers
  const proxyHeaderKeys = [
    'via',
    'forwarded',
    'x-proxy-id',
    'x-bluecoat-via',
    'x-tor-exit-node',
    'x-anonymizer',
  ];

  for (const key of proxyHeaderKeys) {
    if (headers[key]) {
      detectedHeaders.push(key);
    }
  }

  // Multiple hops in x-forwarded-for can indicate nested proxy routing
  const xff = headers['x-forwarded-for'];
  if (xff) {
    const rawList = Array.isArray(xff) ? xff.join(',') : xff;
    const hops = rawList.split(',');
    if (hops.length > 2) {
      detectedHeaders.push('x-forwarded-for (multi-hop)');
    }
  }

  // Datacenter, Scraper, or Headless Bot User-Agents
  const botSignatures = [
    'curl',
    'python-requests',
    'axios',
    'postmanruntime',
    'headlesschrome',
    'phantomjs',
    'wget',
    'scrapy',
    'go-http-client',
  ];

  let isDatacenter = false;
  for (const sig of botSignatures) {
    if (userAgent.includes(sig)) {
      detectedSignatures.push(`Bot/Script: ${sig}`);
      isDatacenter = true;
      break;
    }
  }

  const isVpnOrTor = detectedHeaders.some((h) => h.includes('tor') || h.includes('anonymizer'));
  const isProxy = detectedHeaders.length > 0 || isDatacenter || isVpnOrTor;

  return {
    isProxy,
    isDatacenter,
    isVpnOrTor,
    detectedHeaders,
    detectedSignatures,
  };
}

export interface RiskEvaluationParams {
  isProxy?: boolean;
  isDatacenter?: boolean;
  isVpnOrTor?: boolean;
  ipCollisionCount?: number; // Other distinct stores sharing this IP
  duplicateUtrAttempt?: boolean; // Reused UTR across stores
  failedLoginCount?: number; // Recent failed PIN attempts
  isRapidRegistration?: boolean; // Created within minutes of another store on same IP/Device
}

// Calculates unified 0-100 fraud risk score with contextual risk reasons
export function calculateRiskScore(params: RiskEvaluationParams): {
  riskScore: number;
  riskLevel: SecurityRiskLevel;
  riskReasons: string[];
} {
  let score = 0;
  const reasons: string[] = [];

  // 1. Proxy / VPN Signal
  if (params.isVpnOrTor) {
    score += 45;
    reasons.push('Tor / गुमनाम VPN नेटवर्क का उपयोग (Tor/VPN Anonymizer Detected)');
  } else if (params.isDatacenter) {
    score += 40;
    reasons.push('डेटासेंटर या स्वचालित स्क्रिप्ट/बॉट (Datacenter Script/Bot User-Agent)');
  } else if (params.isProxy) {
    score += 30;
    reasons.push('प्रॉक्सी हेडर पहचाना गया (Proxy Headers Detected in Request)');
  }

  // 2. IP Collision / Multi-Account Trial Abuse
  if (params.ipCollisionCount && params.ipCollisionCount > 0) {
    if (params.ipCollisionCount >= 3) {
      score += 40;
      reasons.push(`समान IP से ${params.ipCollisionCount} अन्य दुकानें सक्रिय हैं (High IP Collision: ${params.ipCollisionCount} Stores)`);
    } else {
      score += 20;
      reasons.push(`समान IP से ${params.ipCollisionCount} अन्य दुकान संबंधित है (Shared IP Collision)`);
    }
  }

  // 3. Rapid Registration Velocity
  if (params.isRapidRegistration) {
    score += 30;
    reasons.push('समान डिवाइस/IP से तुरंत नया खाता बनाया गया (Rapid Multi-Account Velocity)');
  }

  // 4. Duplicate UTR Submission
  if (params.duplicateUtrAttempt) {
    score += 50;
    reasons.push('डुप्लीकेट 12-अंक UTR नंबर का उपयोग (Duplicate UTR Claim Detected Across Stores)');
  }

  // 5. Credential Attack / Failed Logins
  if (params.failedLoginCount && params.failedLoginCount >= 3) {
    score += Math.min(30, params.failedLoginCount * 10);
    reasons.push(`हाल ही में ${params.failedLoginCount} बार गलत PIN प्रयास (Repeated Failed PIN Attempts)`);
  }

  const boundedScore = Math.min(100, Math.max(0, score));

  let riskLevel: SecurityRiskLevel = 'SAFE';
  if (boundedScore >= 80) {
    riskLevel = 'FRAUD';
  } else if (boundedScore >= 60) {
    riskLevel = 'HIGH_RISK';
  } else if (boundedScore >= 25) {
    riskLevel = 'SUSPICIOUS';
  }

  return {
    riskScore: boundedScore,
    riskLevel,
    riskReasons: reasons,
  };
}

