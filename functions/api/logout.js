// POST /api/logout
export async function onRequestPost(context) {
  const { request, env } = context;

  const cookie = request.headers.get('Cookie') || '';
  const sessionToken = getCookie(cookie, 'session');

  if (sessionToken) {
    await env.AUTH_KV.delete(`session:${sessionToken}`);
  }

  return new Response(JSON.stringify({ message: 'ログアウトしました' }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': 'session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0',
    },
  });
}

function getCookie(cookieHeader, name) {
  for (const part of cookieHeader.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=');
  }
  return null;
}
