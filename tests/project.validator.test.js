import {
  createProjectSchema,
  updateProjectSchema,
  listProjectsQuerySchema,
  duplicateProjectSchema,
} from '../src/validators/project.validator.js';
import {
  createTaskSchema,
  updateTaskSchema,
  listTasksQuerySchema,
} from '../src/validators/task.validator.js';

const CLIENT_ID = '507f1f77bcf86cd799439011';

const validProject = {
  title: 'Création d’entreprise',
  client: CLIENT_ID,
  category: 'entrepreneuriat',
};

describe('project.validator', () => {
  test('accepte un projet minimal valide', () => {
    const result = createProjectSchema.safeParse(validProject);

    expect(result.success).toBe(true);
  });

  test('refuse un projet sans client', () => {
    const result = createProjectSchema.safeParse({
      title: 'Projet',
      category: 'immobilier',
    });

    expect(result.success).toBe(false);
  });

  test('refuse un identifiant client invalide', () => {
    const result = createProjectSchema.safeParse({
      ...validProject,
      client: 'invalide',
    });

    expect(result.success).toBe(false);
  });

  test('refuse une catégorie inconnue', () => {
    const result = createProjectSchema.safeParse({
      ...validProject,
      category: 'inconnue',
    });

    expect(result.success).toBe(false);
  });

  test('refuse une mise à jour vide', () => {
    const result = updateProjectSchema.safeParse({});

    expect(result.success).toBe(false);
  });

  test('accepte le retrait du conseiller et un changement de statut', () => {
    const result = updateProjectSchema.safeParse({
      advisor: null,
      status: 'actif',
    });

    expect(result.success).toBe(true);
  });

  test('applique les valeurs par défaut de la liste', () => {
    const result = listProjectsQuerySchema.parse({});

    expect(result).toMatchObject({ page: 1, limit: 20, sort: 'recent' });
  });

  test('accepte une duplication sans corps', () => {
    const result = duplicateProjectSchema.safeParse({});

    expect(result.success).toBe(true);
  });
});

describe('task.validator', () => {
  test('accepte une tâche minimale valide', () => {
    const result = createTaskSchema.safeParse({ title: 'Envoyer le passeport' });

    expect(result.success).toBe(true);
  });

  test('refuse une tâche sans titre', () => {
    const result = createTaskSchema.safeParse({ status: 'a_faire' });

    expect(result.success).toBe(false);
  });

  test('refuse une mise à jour vide', () => {
    const result = updateTaskSchema.safeParse({});

    expect(result.success).toBe(false);
  });

  test('accepte un changement de statut', () => {
    const result = updateTaskSchema.safeParse({ status: 'termine' });

    expect(result.success).toBe(true);
  });

  test('transforme le filtre jalon en booléen', () => {
    const result = listTasksQuerySchema.parse({ isMilestone: 'true' });

    expect(result.isMilestone).toBe(true);
  });
});
