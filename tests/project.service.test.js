import { jest } from '@jest/globals';

const projectFind = jest.fn();
const projectCreate = jest.fn();
const projectCountDocuments = jest.fn();

const taskFind = jest.fn();
const taskFindOne = jest.fn();
const taskFindOneAndDelete = jest.fn();
const taskCreate = jest.fn();
const taskInsertMany = jest.fn();
const taskCountDocuments = jest.fn();

const templateFindOne = jest.fn();
const userFindById = jest.fn();

const logActivity = jest.fn();
const notify = jest.fn();

jest.unstable_mockModule('../src/models/Project.js', () => ({
  Project: {
    find: projectFind,
    create: projectCreate,
    countDocuments: projectCountDocuments,
  },
}));

jest.unstable_mockModule('../src/models/Task.js', () => ({
  Task: {
    find: taskFind,
    findOne: taskFindOne,
    findOneAndDelete: taskFindOneAndDelete,
    create: taskCreate,
    insertMany: taskInsertMany,
    countDocuments: taskCountDocuments,
  },
}));

jest.unstable_mockModule('../src/models/ProjectTemplate.js', () => ({
  ProjectTemplate: { findOne: templateFindOne },
}));

jest.unstable_mockModule('../src/models/User.js', () => ({
  User: { findById: userFindById },
}));

jest.unstable_mockModule('../src/services/events.js', () => ({
  logActivity,
  notify,
}));

const {
  listProjects,
  createProject,
  updateProject,
  duplicateProject,
  createTask,
  updateTask,
  deleteTask,
} = await import('../src/services/project.service.js');

const { ROLES } = await import('../src/utils/constants.js');

const buildProject = (overrides = {}) => ({
  _id: 'project-id',
  title: 'Projet',
  description: 'Description',
  client: 'client-id',
  advisor: 'advisor-id',
  category: 'entrepreneuriat',
  status: 'actif',
  priority: 'normale',
  location: 'Dakar',
  progress: { value: 0, mode: 'manuel' },
  save: jest.fn().mockResolvedValue(),
  populate: jest.fn().mockResolvedValue(),
  toJSON: jest.fn(() => ({ _id: 'project-id' })),
  ...overrides,
});

const buildTask = (overrides = {}) => ({
  _id: 'task-id',
  project: 'project-id',
  title: 'Tâche',
  description: '',
  status: 'a_faire',
  priority: 'normale',
  isMilestone: false,
  completedAt: null,
  save: jest.fn().mockResolvedValue(),
  populate: jest.fn().mockResolvedValue(),
  toJSON: jest.fn(() => ({ _id: 'task-id' })),
  ...overrides,
});

const mockUsers = () => {
  userFindById.mockImplementation((id) => ({
    select: jest.fn().mockResolvedValue({
      _id: id,
      role: id === 'client-id' ? ROLES.CLIENT : ROLES.ADVISOR,
      isActive: true,
    }),
  }));
};

beforeEach(() => {
  jest.resetAllMocks();
});

describe('listProjects', () => {
  test('limite la liste aux projets du conseiller connecté', async () => {
    const chain = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      populate: jest.fn().mockResolvedValue([]),
    };
    projectFind.mockReturnValue(chain);
    projectCountDocuments.mockResolvedValue(0);

    await listProjects(
      { _id: 'advisor-id', role: ROLES.ADVISOR },
      { page: 1, limit: 20, sort: 'recent' }
    );

    expect(projectFind).toHaveBeenCalledWith({ advisor: 'advisor-id' });
  });

  test('ignore les filtres client et conseiller pour un client', async () => {
    const chain = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      populate: jest.fn().mockResolvedValue([]),
    };
    projectFind.mockReturnValue(chain);
    projectCountDocuments.mockResolvedValue(0);

    await listProjects(
      { _id: 'client-id', role: ROLES.CLIENT },
      {
        page: 1,
        limit: 20,
        sort: 'recent',
        client: 'other-client',
        advisor: 'other-advisor',
      }
    );

    expect(projectFind).toHaveBeenCalledWith({ client: 'client-id' });
  });
});

describe('updateProject', () => {
  test('journalise le changement de statut et clôt le projet', async () => {
    const project = buildProject({ status: 'actif' });

    await updateProject(
      project,
      { status: 'termine' },
      { _id: 'advisor-id', role: ROLES.ADVISOR }
    );

    expect(project.status).toBe('termine');
    expect(project.closedAt).toBeInstanceOf(Date);
    expect(project.save).toHaveBeenCalled();
    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        project: 'project-id',
        actor: 'advisor-id',
        action: 'projet_statut_modifie',
        before: { status: 'actif' },
        after: { status: 'termine' },
      })
    );
  });

  test('recalcule la progression automatique', async () => {
    const project = buildProject({ progress: { value: 0, mode: 'auto' } });
    taskCountDocuments.mockResolvedValueOnce(4).mockResolvedValueOnce(1);

    await updateProject(
      project,
      { progress: { mode: 'auto' } },
      { _id: 'admin-id', role: ROLES.ADMIN }
    );

    expect(project.progress.value).toBe(25);
    expect(project.save).toHaveBeenCalled();
  });

  test('refuse le changement de client par un conseiller', async () => {
    const project = buildProject();

    await expect(
      updateProject(
        project,
        { client: '507f1f77bcf86cd799439011' },
        { _id: 'advisor-id', role: ROLES.ADVISOR }
      )
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});

describe('createProject', () => {
  test('applique un modèle et copie ses tâches', async () => {
    const project = buildProject({
      _id: 'new-project-id',
      status: 'brouillon',
      progress: { value: 0, mode: 'auto' },
    });
    projectCreate.mockResolvedValue(project);
    templateFindOne.mockResolvedValue({
      tasks: [
        {
          title: 'Étape 1',
          description: '',
          priority: 'haute',
          isMilestone: true,
          order: 0,
        },
      ],
    });
    mockUsers();
    taskInsertMany.mockResolvedValue();

    await createProject(
      {
        title: 'Nouveau projet',
        client: 'client-id',
        category: 'entrepreneuriat',
        templateId: '507f1f77bcf86cd799439099',
      },
      { _id: 'advisor-id', role: ROLES.ADVISOR }
    );

    expect(projectCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        client: 'client-id',
        advisor: 'advisor-id',
        status: 'brouillon',
      })
    );
    expect(taskInsertMany).toHaveBeenCalledWith([
      expect.objectContaining({
        project: 'new-project-id',
        title: 'Étape 1',
        status: 'a_faire',
        isMilestone: true,
        createdBy: 'advisor-id',
      }),
    ]);
  });
});

describe('duplicateProject', () => {
  test('duplique le projet et ses tâches', async () => {
    const source = buildProject({
      title: 'Modèle',
      progress: { value: 50, mode: 'auto' },
    });
    const project = buildProject({
      _id: 'new-project-id',
      title: 'Modèle (copie)',
      status: 'brouillon',
      progress: { value: 0, mode: 'auto' },
    });
    projectCreate.mockResolvedValue(project);
    taskFind.mockReturnValue({
      sort: jest.fn().mockResolvedValue([
        {
          title: 'Tâche 1',
          description: '',
          priority: 'normale',
          isMilestone: false,
          order: 0,
        },
      ]),
    });
    mockUsers();
    taskInsertMany.mockResolvedValue();

    await duplicateProject(
      source,
      {},
      { _id: 'advisor-id', role: ROLES.ADVISOR }
    );

    expect(projectCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Modèle (copie)',
        client: 'client-id',
        advisor: 'advisor-id',
        status: 'brouillon',
        progress: { value: 0, mode: 'auto' },
      })
    );
    expect(taskInsertMany).toHaveBeenCalledWith([
      expect.objectContaining({
        project: 'new-project-id',
        title: 'Tâche 1',
        status: 'a_faire',
        createdBy: 'advisor-id',
      }),
    ]);
    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'projet_duplique' })
    );
  });
});

describe('tasks', () => {
  test('notifie le client quand une tâche passe en attente client', async () => {
    const project = buildProject({
      progress: { value: 0, mode: 'auto' },
    });
    const task = buildTask({
      title: 'Envoyer le passeport',
      status: 'en_attente_client',
    });
    taskCreate.mockResolvedValue(task);
    taskCountDocuments.mockResolvedValueOnce(4).mockResolvedValueOnce(1);

    await createTask(
      project,
      { title: 'Envoyer le passeport', status: 'en_attente_client' },
      { _id: 'advisor-id', role: ROLES.ADVISOR }
    );

    expect(taskCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        project: 'project-id',
        title: 'Envoyer le passeport',
        status: 'en_attente_client',
        createdBy: 'advisor-id',
      })
    );
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({
        user: 'client-id',
        type: 'tache_client_en_attente',
      })
    );
    expect(project.progress.value).toBe(25);
  });

  test('notifie le client quand un jalon est terminé', async () => {
    const project = buildProject({
      progress: { value: 0, mode: 'auto' },
    });
    const task = buildTask({ status: 'en_cours', isMilestone: true });
    taskFindOne.mockResolvedValue(task);
    taskCountDocuments.mockResolvedValueOnce(2).mockResolvedValueOnce(2);

    await updateTask(
      project,
      'task-id',
      { status: 'termine' },
      { _id: 'advisor-id', role: ROLES.ADVISOR }
    );

    expect(task.status).toBe('termine');
    expect(task.completedAt).toBeInstanceOf(Date);
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({
        user: 'client-id',
        type: 'jalon_termine',
      })
    );
    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'tache_statut_modifie' })
    );
    expect(project.progress.value).toBe(100);
  });

  test("ne notifie pas une tâche déjà en attente client", async () => {
    const project = buildProject({ progress: { value: 0, mode: 'manuel' } });
    const task = buildTask({ status: 'en_attente_client' });
    taskFindOne.mockResolvedValue(task);

    await updateTask(
      project,
      'task-id',
      { title: 'Titre modifié' },
      { _id: 'advisor-id', role: ROLES.ADVISOR }
    );

    expect(notify).not.toHaveBeenCalled();
  });

  test('supprime une tâche et recalcule la progression', async () => {
    const project = buildProject({ progress: { value: 0, mode: 'auto' } });
    taskFindOneAndDelete.mockResolvedValue({
      _id: 'task-id',
      title: 'Tâche',
      status: 'a_faire',
    });
    taskCountDocuments.mockResolvedValueOnce(2).mockResolvedValueOnce(1);

    const result = await deleteTask(
      project,
      'task-id',
      { _id: 'advisor-id', role: ROLES.ADVISOR }
    );

    expect(result).toEqual({ id: 'task-id' });
    expect(project.progress.value).toBe(50);
    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'tache_supprimee' })
    );
  });
});
