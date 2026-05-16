// POST /api/register
export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError('リクエストが不正です', 400);
  }

  const { name, email, password } = body;

  if (!name || !email || !password) {
    return jsonError('すべての項目を入力してください', 400);
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonError('有効なメールアドレスを入力してください', 400);
  }

  if (password.length < 8) {
    return jsonError('パスワードは8文字以上にしてください', 400);
  }

  // 既存ユーザーの確認
  const existing = await env.AUTH_KV.get(`user:${email.toLowerCase()}`);
  if (existing) {
    return jsonError('このメールアドレスは既に登録されています', 409);
  }

  // パスワードハッシュ化
  const salt = generateSalt();
  const passwordHash = await hashPassword(password, salt);

  const user = {
    name: name.trim(),
    email: email.toLowerCase(),
    passwordHash,
    salt,
    createdAt: Date.now(),
  };

  await env.AUTH_KV.put(`user:${user.email}`, JSON.stringify(user));

  return jsonResponse({ message: 'アカウントを作成しました' }, 201);
}

// ===== Utilities =====

function generateSalt(length = 16) {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
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

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function jsonError(message, status) {
  return jsonResponse({ error: message }, status);
}
