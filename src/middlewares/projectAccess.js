import { Project } from '../models/Project.js';
import { ROLES } from '../utils/constants.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const projectAccess = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    throw ApiError.unauthorized();
  }

  const projectId = req.params.projectId || req.params.id;
  if (!projectId) {
    throw ApiError.badRequest('Identifiant de projet manquant');
  }

  const project = await Project.findById(projectId);
  if (!project) {
    throw ApiError.notFound('Projet introuvable');
  }

  const isAdmin = req.user.role === ROLES.ADMIN;
  const isFinance = req.user.role === ROLES.FINANCE;
  const isOwner = project.client && project.client.equals(req.user._id);
  const isAdvisor = project.advisor && project.advisor.equals(req.user._id);

  if (!isAdmin && !isFinance && !isOwner && !isAdvisor) {
    throw ApiError.forbidden('Accès à ce projet refusé');
  }

  req.project = project;
  next();
});

export default projectAccess;
