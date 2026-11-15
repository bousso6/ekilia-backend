import { describe, it, expect, jest, afterEach } from '@jest/globals';
import { Notification } from '../src/models/Notification.js';
import { ActivityLog } from '../src/models/ActivityLog.js';
import { User } from '../src/models/User.js';
import { notify } from '../src/services/notification.service.js';
import { logActivity } from '../src/services/activity.service.js';
import { buildNotificationEmail } from '../src/utils/emailTemplates.js';

const FAKE_ID = '507f1f77bcf86cd799439011';

describe('B4 — Notifications, e-mails & journal', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("notify() ne casse pas l'appelant si la base échoue", async () => {
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(Notification, 'create').mockRejectedValueOnce(new Error('MongoDB indisponible'));

    const result = await notify({
      user: FAKE_ID,
      type: 'budget_modifie',
      message: 'Budget révisé à 20 000 000 FCFA',
      link: '/projects/123/budget',
    });

    expect(result).toBeNull();
    expect(errSpy).toHaveBeenCalled();
  });

  it("notify() ne casse pas l'appelant si la lecture utilisateur / e-mail échoue", async () => {
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const fakeDoc = {
      _id: FAKE_ID,
      user: FAKE_ID,
      type: 'document_valide',
      message: 'Passeport validé',
      emailStatus: 'pending',
      save: jest.fn().mockResolvedValue(true),
    };

    jest.spyOn(Notification, 'create').mockResolvedValueOnce(fakeDoc);
    jest.spyOn(User, 'findById').mockReturnValueOnce({
      select: () => ({
        lean: async () => {
          throw new Error('Erreur réseau SMTP / User');
        },
      }),
    });

    const result = await notify({
      user: FAKE_ID,
      type: 'document_valide',
      message: 'Passeport validé',
    });

    expect(result).toBe(fakeDoc);
    expect(fakeDoc.emailStatus).toBe('failed');
    expect(fakeDoc.save).toHaveBeenCalled();
    expect(errSpy).toHaveBeenCalled();
  });

  it("notify() ignore un type absent de NOTIFICATION_TYPES sans lancer d'erreur", async () => {
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const createSpy = jest.spyOn(Notification, 'create');

    const result = await notify({
      user: FAKE_ID,
      type: 'type_invalide',
      message: 'Test',
    });

    expect(result).toBeNull();
    expect(createSpy).not.toHaveBeenCalled();
    expect(errSpy).toHaveBeenCalled();
  });

  it("logActivity() ne casse pas l'appelant si ActivityLog.create échoue", async () => {
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(ActivityLog, 'create').mockRejectedValueOnce(new Error('Write error'));

    const entry = await logActivity({
      project: FAKE_ID,
      actor: FAKE_ID,
      action: 'document_valide',
      after: { status: 'valide' },
    });

    expect(entry).toBeNull();
    expect(errSpy).toHaveBeenCalled();
  });

  it('Notification.toJSON() masque emailStatus et __v', () => {
    const notif = new Notification({
      user: FAKE_ID,
      type: 'budget_modifie',
      message: 'Mise à jour du budget',
      emailStatus: 'failed',
    });

    const json = notif.toJSON();
    expect(json.emailStatus).toBeUndefined();
    expect(json.__v).toBeUndefined();
    expect(json.message).toBe('Mise à jour du budget');
  });

  it('buildNotificationEmail() formate correctement tache_client_en_attente', () => {
    const mail = buildNotificationEmail({
      recipientName: 'Aïssatou',
      type: 'tache_client_en_attente',
      message: 'Merci de signer la procuration APIX.',
      link: 'http://localhost:3000/projects/123',
    });

    expect(mail.subject).toContain('Action attendue');
    expect(mail.text).toContain('Bonjour Aïssatou,');
    expect(mail.text).toContain('Merci de signer la procuration APIX.');
    expect(mail.html).toContain('http://localhost:3000/projects/123');
  });
});
