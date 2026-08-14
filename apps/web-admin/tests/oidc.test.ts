/**
 * Tests du client OIDC (openid-client mocké — pas de réseau ni de Keycloak).
 */
import {
  buildAuthorizationUrl,
  exchangeCodeForSession,
  generateStateAndNonce,
  getEndSessionUrl,
} from '../lib/auth/oidc';

jest.mock('openid-client', () => {
  const mockClient = {
    authorizationUrl: jest.fn(),
    callback: jest.fn(),
    endSessionUrl: jest.fn(),
  };
  return {
    Issuer: {
      discover: jest.fn().mockResolvedValue({ Client: jest.fn(() => mockClient) }),
    },
    generators: {
      state: jest.fn(() => 'mock-state'),
      nonce: jest.fn(() => 'mock-nonce'),
    },
    __mockClient: mockClient,
  };
});

function mockClient() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (jest.requireMock('openid-client') as any).__mockClient as {
    authorizationUrl: jest.Mock;
    callback: jest.Mock;
    endSessionUrl: jest.Mock;
  };
}

/** process.env.NODE_ENV est readonly dans @types/node — helper pour les tests. */
function setNodeEnv(value: string | undefined): void {
  (process.env as Record<string, string | undefined>).NODE_ENV = value;
}

beforeEach(() => {
  process.env.JWT_ISSUER = 'http://keycloak:8080/realms/goursi';
  process.env.KEYCLOAK_CLIENT_SECRET = 'dev-client-secret';
  setNodeEnv(undefined);
  mockClient().authorizationUrl.mockReset().mockReturnValue('https://keycloak/authorize');
  mockClient().callback.mockReset();
  mockClient().endSessionUrl.mockReset();
});

afterEach(() => {
  delete process.env.JWT_ISSUER;
  delete process.env.KEYCLOAK_CLIENT_SECRET;
});

describe('flux OIDC (openid-client mocké)', () => {
  it('génère state et nonce', () => {
    const { state, nonce } = generateStateAndNonce();
    expect(state).toBe('mock-state');
    expect(nonce).toBe('mock-nonce');
  });

  it('construit l\u2019URL d\u2019autorisation avec les paramètres OIDC attendus', async () => {
    const url = await buildAuthorizationUrl({
      state: 's1',
      nonce: 'n1',
      redirectUri: 'http://localhost:3001/api/auth/callback',
    });
    expect(url).toBe('https://keycloak/authorize');
    expect(mockClient().authorizationUrl).toHaveBeenCalledWith({
      scope: 'openid profile email roles',
      state: 's1',
      nonce: 'n1',
      redirect_uri: 'http://localhost:3001/api/auth/callback',
    });
  });

  it('découvre l\u2019issuer depuis JWT_ISSUER/.well-known', async () => {
    await buildAuthorizationUrl({ state: 's', nonce: 'n', redirectUri: 'http://localhost:3001/cb' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { Issuer } = jest.requireMock('openid-client') as any;
    expect(Issuer.discover).toHaveBeenCalledWith(
      'http://keycloak:8080/realms/goursi/.well-known/openid-configuration',
    );
  });

  it('échange le code et extrait sub/email/roles de realm_access.roles', async () => {
    mockClient().callback.mockResolvedValue({
      claims: () => ({
        sub: 'u1',
        email: 'a@goursi.app',
        name: 'Alice',
        realm_access: { roles: ['SUPER_ADMIN', 'FINANCE_MANAGER'] },
      }),
      id_token: 'id-token-abc',
    });

    const profile = await exchangeCodeForSession({
      code: 'code-123',
      redirectUri: 'http://localhost:3001/api/auth/callback',
      expectedState: 's1',
      expectedNonce: 'n1',
    });

    expect(profile.sub).toBe('u1');
    expect(profile.email).toBe('a@goursi.app');
    expect(profile.name).toBe('Alice');
    expect(profile.roles).toEqual(['SUPER_ADMIN', 'FINANCE_MANAGER']);
    expect(profile.idToken).toBe('id-token-abc');
    expect(mockClient().callback).toHaveBeenCalledWith(
      'http://localhost:3001/api/auth/callback',
      { code: 'code-123' },
      { state: 's1', nonce: 'n1' },
    );
  });

  it('retourne une liste de rôles vide quand realm_access est absent', async () => {
    mockClient().callback.mockResolvedValue({
      claims: () => ({ sub: 'u2' }),
      id_token: 'id-token-2',
    });

    const profile = await exchangeCodeForSession({
      code: 'code-2',
      redirectUri: 'http://localhost:3001/api/auth/callback',
      expectedState: 's',
      expectedNonce: 'n',
    });
    expect(profile.sub).toBe('u2');
    expect(profile.roles).toEqual([]);
  });

  it('expose end_session_endpoint via le client', async () => {
    mockClient().endSessionUrl.mockReturnValue('https://keycloak/realms/goursi/protocol/openid-connect/logout');
    expect(await getEndSessionUrl('http://localhost:3001/login')).toBe(
      'https://keycloak/realms/goursi/protocol/openid-connect/logout',
    );
  });

  it('renvoie null si end_session_endpoint absent des métadonnées', async () => {
    mockClient().endSessionUrl.mockImplementation(() => {
      throw new Error('no end_session_endpoint');
    });
    expect(await getEndSessionUrl()).toBeNull();
  });
});
