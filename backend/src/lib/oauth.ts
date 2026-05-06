function requireOAuthEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} env var must be defined for OAuth`);
  return value;
}

export const exchangeCode = async (code: string): Promise<{ email: string; name: string }> => {
  const clientId     = requireOAuthEnv('OAUTH_CLIENT_ID');
  const clientSecret = requireOAuthEnv('OAUTH_CLIENT_SECRET');
  const callbackUrl  = requireOAuthEnv('OAUTH_CALLBACK_URL');
  const tokenUrl     = requireOAuthEnv('OAUTH_TOKEN_URL');
  const userinfoUrl  = requireOAuthEnv('OAUTH_USERINFO_URL');

  const tokenRes = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'authorization_code',
      code,
      client_id:     clientId,
      client_secret: clientSecret,
      redirect_uri:  callbackUrl,
    }),
  });

  if (!tokenRes.ok) {
    throw Object.assign(new Error('OAuth token exchange failed'), { status: 502, code: 'oauth_error' });
  }

  const tokenData = await tokenRes.json() as { access_token: string };

  const userRes = await fetch(userinfoUrl, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  if (!userRes.ok) {
    throw Object.assign(new Error('OAuth userinfo request failed'), { status: 502, code: 'oauth_error' });
  }

  const profile = await userRes.json() as { email?: string; name?: string };

  if (!profile.email || !profile.name) {
    throw Object.assign(
      new Error('OAuth provider did not return email or name'),
      { status: 502, code: 'oauth_error' },
    );
  }

  return { email: profile.email, name: profile.name };
};
