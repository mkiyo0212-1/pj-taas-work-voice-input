// 認証ミドルウェア: 未ログインユーザーを /login.html へリダイレクト

const PUBLIC_PATHS = new Set([
  '/login.html',
  '/register.html',
  '/api/login',
  '/api/register',
]);

const STATIC_EXTENSIONS = /\.(css|js|png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf)$/i;

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  // 静的アセットと公開パスはそのまま通す
  if (PUBLIC_PATHS.has(path) || STATIC_EXTENSIONS.test(path)) {
    return next();
  }

  // セッションCookieを確認
  const cookie = request.headers.get('Cookie') || '';
  const sessionToken = getCookie(cookie, 'session');

  if (!sessionToken) {
    return redirectToLogin(request.url);
  }

  const sessionRaw = await env.AUTH_KV.get(`session:${sessionToken}`);
  if (!sessionRaw) {
    return redirectToLogin(request.url);
  }

  const session = JSON.parse(sessionRaw);
  if (Date.now() > session.expiresAt) {
    await env.AUTH_KV.delete(`session:${sessionToken}`);
    return redirectToLogin(request.url);
  }

  // リクエストヘッダーにユーザー情報を付与してからnext()
  const requestWithUser = new Request(request, {
    headers: new Headers({
      ...Object.fromEntries(request.headers),
      'X-User-Email': session.email,
      'X-User-Name': session.name,
    }),
  });

  return next(requestWithUser);
}

function redirectToLogin(currentUrl) {
  const url = new URL(currentUrl);
  return Response.redirect(`${url.origin}/login.html`, 302);
}

function getCookie(cookieHeader, name) {
  for (const part of cookieHeader.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=');
  }
  return null;
}
