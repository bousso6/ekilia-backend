import { jest } from '@jest/globals';

const findById = jest.fn();

jest.unstable_mockModule('../src/models/Project.js', () => ({
  Project: { findById },
}));

const { projectAccess } = await import('../src/middlewares/projectAccess.js');
const { ApiError } = await import('../src/utils/ApiError.js');
const { ROLES } = await import('../src/utils/constants.js');

const CLIENT_ID = '507f1f77bcf86cd799439011';
const OTHER_CLIENT_ID = '507f1f77bcf86cd799439012';
const ADVISOR_ID = '507f1f77bcf86cd799439013';
const OTHER_ADVISOR_ID = '507f1f77bcf86cd799439014';
const PROJECT_ID = '507f1f77bcf86cd799439015';
const FINANCE_ID = '507f1f77bcf86cd799439016';

const buildRequest = ({ role, userId = CLIENT_ID, projectId = PROJECT_ID }) => ({
  user: { _id: userId, role },
  params: { projectId },
});

const buildProject = (overrides = {}) => ({
  _id: PROJECT_ID,
  client: CLIENT_ID,
  advisor: ADVISOR_ID,
  ...overrides,
});

const runMiddleware = async (request) => {
  const next = jest.fn();
  await projectAccess(request, {}, next);
  return next;
};

const expectNotFound = (next) => {
  expect(next).toHaveBeenCalledTimes(1);
  const error = next.mock.calls[0][0];
  expect(error).toBeInstanceOf(ApiError);
  expect(error.statusCode).toBe(404);
};

describe('projectAccess', () => {
  beforeEach(() => {
    findById.mockReset();
  });

  test('refuse une requête sans utilisateur authentifié', async () => {
    const next = await runMiddleware({ params: { projectId: PROJECT_ID } });

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(ApiError);
    expect(next.mock.calls[0][0].statusCode).toBe(401);
    expect(findById).not.toHaveBeenCalled();
  });

  test("renvoie 404 si le projet n'existe pas", async () => {
    findById.mockResolvedValue(null);

    const next = await runMiddleware(buildRequest({ role: ROLES.ADMIN }));

    expectNotFound(next);
  });

  test('renvoie 404 pour un identifiant de projet invalide', async () => {
    const next = await runMiddleware(
      buildRequest({ role: ROLES.ADMIN, projectId: 'invalide' })
    );

    expectNotFound(next);
    expect(findById).not.toHaveBeenCalled();
  });

  test("autorise un administrateur sur n'importe quel projet", async () => {
    const project = buildProject({
      client: OTHER_CLIENT_ID,
      advisor: OTHER_ADVISOR_ID,
    });
    findById.mockResolvedValue(project);
    const request = buildRequest({ role: ROLES.ADMIN });

    const next = await runMiddleware(request);

    expect(next).toHaveBeenCalledWith();
    expect(request.project).toBe(project);
  });

  test('autorise le conseiller affecté au projet', async () => {
    const project = buildProject();
    findById.mockResolvedValue(project);
    const request = buildRequest({ role: ROLES.ADVISOR, userId: ADVISOR_ID });

    const next = await runMiddleware(request);

    expect(next).toHaveBeenCalledWith();
    expect(request.project).toBe(project);
  });

  test('refuse un conseiller non affecté au projet', async () => {
    findById.mockResolvedValue(buildProject());

    const next = await runMiddleware(
      buildRequest({ role: ROLES.ADVISOR, userId: OTHER_ADVISOR_ID })
    );

    expectNotFound(next);
  });

  test('autorise le profil finance à accéder à tous les projets', async () => {
    const project = buildProject();
    findById.mockResolvedValue(project);
    const request = buildRequest({ role: ROLES.FINANCE, userId: FINANCE_ID });

    const next = await runMiddleware(request);

    expect(next).toHaveBeenCalledWith();
    expect(request.project).toBe(project);
  });

  test('autorise le client propriétaire du projet', async () => {
    const project = buildProject();
    findById.mockResolvedValue(project);
    const request = buildRequest({ role: ROLES.CLIENT });

    const next = await runMiddleware(request);

    expect(next).toHaveBeenCalledWith();
    expect(request.project).toBe(project);
  });

  test("renvoie 404 pour le client d'un autre projet", async () => {
    findById.mockResolvedValue(buildProject());

    const next = await runMiddleware(
      buildRequest({ role: ROLES.CLIENT, userId: OTHER_CLIENT_ID })
    );

    expectNotFound(next);
  });

  test('renvoie 404 pour tout autre rôle', async () => {
    findById.mockResolvedValue(buildProject());

    const next = await runMiddleware(buildRequest({ role: ROLES.PARTNER }));

    expectNotFound(next);
  });
});
