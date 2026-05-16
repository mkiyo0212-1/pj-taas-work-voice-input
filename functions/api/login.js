// POST /api/login
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7日間
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError('リクエストが不正です', 400);
  }

  const { email, password } = body;

  if (!email || !password) {
    return jsonError('メールアドレスとパスワードを入力してください', 400);
  }

  // ユーザー検索
  const userRaw = await env.AUTH_KV.get(`user:${email.toLowerCase()}`);
  if (!userRaw) {
    return jsonError('メールアドレスまたはパスワードが正しくありません', 401);
  }

  const user = JSON.parse(userRaw);

  // パスワード検証
  const inputHash = await hashPassword(password, user.salt);
  if (inputHash !== user.passwordHash) {
    return jsonError('メールアドレスまたはパスワードが正しくありません', 401);
  }

  // セッション作成
  const token = generateToken();
  const session = {
    email: user.email,
    name: user.name,
    expiresAt: Date.now() + SESSION_TTL_MS,
  };

  await env.AUTH_KV.put(`session:${token}`, JSON.stringify(session), {
    expirationTtl: SESSION_TTL_SECONDS,
  });

  return new Response(JSON.stringify({ message: 'ログインしました', name: user.name }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': `session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}`,
    },
  });
}

// ===== Utilities =====

function generateToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password, salt) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: encoder.encode(salt), iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return btoa(String.fromCharCode(...new Uint8Array(bits)));
}

function jsonError(message, status) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
