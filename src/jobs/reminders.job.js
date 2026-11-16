import cron from 'node-cron';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { Document } from '../models/Document.js';
import { Project } from '../models/Project.js';
import { notify } from '../services/notification.service.js';

export async function runRemindersSweep() {
  const now = new Date();
  const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  // 1. Documents demandés dont l'échéance approche (<= 48h)
  const pendingDocs = await Document.find({
    status: 'demande',
    dueDate: { $ne: null, $lte: in48Hours },
  })
    .select('project title dueDate')
    .lean();

  for (const doc of pendingDocs) {
    const project = await Project.findById(doc.project).select('client title').lean();
    if (!project?.client) continue;

    await notify({
      user: project.client,
      type: 'document_demande',
      message: `Rappel : la pièce « ${doc.title} » est attendue pour le projet « ${project.title} ».`,
      link: `/projects/${project._id}/documents`,
    });
  }

  // 2. Tâches client en attente (si le modèle Task de la partie A est déjà chargé)
  const TaskModel = mongoose.models.Task;
  if (TaskModel) {
    const waitingTasks = await TaskModel.find({
      status: 'en_attente_client',
    })
      .select('project title dueDate')
      .lean();

    for (const task of waitingTasks) {
      const project = await Project.findById(task.project).select('client title').lean();
      if (!project?.client) continue;

      await notify({
        user: project.client,
        type: 'tache_client_en_attente',
        message: `Rappel : l'action « ${task.title} » attend votre retour sur « ${project.title} ».`,
        link: `/projects/${project._id}`,
      });
    }
  }
}

export function startRemindersJob() {
  if (env.NODE_ENV === 'test') {
    return null;
  }

  return cron.schedule('0 8 * * *', async () => {
    try {
      await runRemindersSweep();
    } catch (err) {
      console.error('[reminders.job] Erreur cron rappels:', err?.message || err);
    }
  });
}
