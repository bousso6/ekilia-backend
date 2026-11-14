import { asyncHandler } from '../utils/asyncHandler.js';
import * as projectService from '../services/project.service.js';

export const listTasks = asyncHandler(async (req, res) => {
  const tasks = await projectService.listTasks(req.project, req.query);
  res.status(200).json({ success: true, data: { tasks } });
});

export const createTask = asyncHandler(async (req, res) => {
  const task = await projectService.createTask(
    req.project,
    req.body,
    req.user
  );
  res.status(201).json({
    success: true,
    message: 'Tâche créée avec succès',
    data: { task },
  });
});

export const updateTask = asyncHandler(async (req, res) => {
  const task = await projectService.updateTask(
    req.project,
    req.params.taskId,
    req.body,
    req.user
  );
  res.status(200).json({
    success: true,
    message: 'Tâche mise à jour avec succès',
    data: { task },
  });
});

export const deleteTask = asyncHandler(async (req, res) => {
  await projectService.deleteTask(
    req.project,
    req.params.taskId,
    req.user
  );
  res.status(200).json({
    success: true,
    message: 'Tâche supprimée avec succès',
  });
});
