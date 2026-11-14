import { asyncHandler } from '../utils/asyncHandler.js';
import * as projectService from '../services/project.service.js';

export const listProjects = asyncHandler(async (req, res) => {
  const data = await projectService.listProjects(req.user, req.query);
  res.status(200).json({ success: true, data });
});

export const createProject = asyncHandler(async (req, res) => {
  const project = await projectService.createProject(req.body, req.user);
  res.status(201).json({
    success: true,
    message: 'Projet créé avec succès',
    data: { project },
  });
});

export const getProject = asyncHandler(async (req, res) => {
  const project = await projectService.getProject(req.project);
  res.status(200).json({ success: true, data: { project } });
});

export const updateProject = asyncHandler(async (req, res) => {
  const project = await projectService.updateProject(
    req.project,
    req.body,
    req.user
  );
  res.status(200).json({
    success: true,
    message: 'Projet mis à jour avec succès',
    data: { project },
  });
});

export const duplicateProject = asyncHandler(async (req, res) => {
  const project = await projectService.duplicateProject(
    req.project,
    req.body,
    req.user
  );
  res.status(201).json({
    success: true,
    message: 'Projet dupliqué avec succès',
    data: { project },
  });
});
