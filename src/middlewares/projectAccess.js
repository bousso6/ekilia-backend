import mongoose from 'mongoose';
import { Project } from '../models/Project.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ROLES } from '../utils/constants.js';

const projectNotFound = () => ApiError.notFound('Projet introuvable');

const isSameUser = (reference, userId) =>
  Boolean(reference) && reference.toString() === userId.toString();

export const projectAccess = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    throw ApiError.unauthorized();
  }

  const { projectId } = req.params;

  if (!projectId || !mongoose.isValidObjectId(projectId)) {
    throw projectNotFound();
  }

  const project = await Project.findById(projectId);
  if (!project) {
    throw projectNotFound();
  }

  const userId = req.user._id;
  let allowed = false;

  switch (req.user.role) {
    case ROLES.ADMIN:
    case ROLES.FINANCE:
      allowed = true;
      break;
    case ROLES.ADVISOR:
      allowed = isSameUser(project.advisor, userId);
      break;
    case ROLES.CLIENT:
      allowed = isSameUser(project.client, userId);
      break;
    default:
      allowed = false;
  }

  if (!allowed) {
    throw projectNotFound();
  }

  req.project = project;
  next();
});

export default projectAccess;
